/**
 * Script para actualizar ENUMs de PostgreSQL antes de cambiar los datos
 * 
 * PASOS:
 * 1. Agregar 'Proyecto Septic BOFA' a los ENUMs
 * 2. Actualizar los datos de 'Capital Proyectos Septic' → 'Proyecto Septic BOFA'
 * 3. Eliminar 'Cap Trabajos Septic' y 'Capital Proyectos Septic' de los ENUMs
 * 
 * EJECUTAR: node update-bank-enums.js
 */

const { conn } = require('./src/data');

const updateEnums = async () => {
  try {
    console.log('🔄 Actualizando ENUMs de métodos de pago...\n');
    
    await conn.authenticate();
    console.log('✅ Conexión establecida\n');

    // PASO 1: Agregar 'Proyecto Septic BOFA' a todos los ENUMs
    console.log('📝 PASO 1: Agregando "Proyecto Septic BOFA" a los ENUMs\n');

    const enums = [
      'enum_Incomes_paymentMethod',
      'enum_Expenses_paymentMethod',
      'enum_FixedExpenses_paymentMethod',
      'enum_FixedExpensePayments_paymentMethod',
      'enum_SupplierInvoices_paymentMethod'
    ];

    for (const enumName of enums) {
      try {
        // Verificar si el valor ya existe
        const [existing] = await conn.query(`
          SELECT EXISTS (
            SELECT 1 
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = '${enumName}'
            AND e.enumlabel = 'Proyecto Septic BOFA'
          ) as exists;
        `);

        if (!existing[0].exists) {
          await conn.query(`
            ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS 'Proyecto Septic BOFA';
          `);
          console.log(`   ✅ Agregado a ${enumName}`);
        } else {
          console.log(`   ⚠️  Ya existe en ${enumName}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Error en ${enumName}: ${error.message}`);
      }
    }

    console.log('\n📝 PASO 2: Actualizando datos\n');

    // PASO 2: Actualizar registros de 'Capital Proyectos Septic' → 'Proyecto Septic BOFA'
    
    // 2.1 BankAccounts (nombre de cuenta)
    const [updateAccount] = await conn.query(`
      UPDATE "BankAccounts"
      SET 
        "accountName" = 'Proyecto Septic BOFA',
        "bankName" = 'Bank of America',
        "notes" = 'Cuenta para proyectos de sistemas sépticos - BOFA',
        "updatedAt" = NOW()
      WHERE "accountName" = 'Capital Proyectos Septic'
      RETURNING "accountName";
    `);
    console.log(`   ✅ BankAccounts: ${updateAccount.length} renombradas`);

    // 2.2 Incomes
    const [updateIncomes] = await conn.query(`
      UPDATE "Incomes"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`   ✅ Incomes: ${updateIncomes.rowCount} actualizados`);

    // 2.3 Expenses
    const [updateExpenses] = await conn.query(`
      UPDATE "Expenses"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`   ✅ Expenses: ${updateExpenses.rowCount} actualizados`);

    // 2.4 FixedExpenses
    const [updateFixed] = await conn.query(`
      UPDATE "FixedExpenses"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`   ✅ FixedExpenses: ${updateFixed.rowCount} actualizados`);

    // 2.5 FixedExpensePayments
    const [updatePayments] = await conn.query(`
      UPDATE "FixedExpensePayments"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`   ✅ FixedExpensePayments: ${updatePayments.rowCount} actualizados`);

    // 2.6 SupplierInvoices
    const [updateSupplier] = await conn.query(`
      UPDATE "SupplierInvoices"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`   ✅ SupplierInvoices: ${updateSupplier.rowCount} actualizados`);

    // 2.7 BankTransactions (descripciones y notas)
    const [updateDesc] = await conn.query(`
      UPDATE "BankTransactions"
      SET 
        "description" = REPLACE("description", 'Capital Proyectos Septic', 'Proyecto Septic BOFA'),
        "updatedAt" = NOW()
      WHERE "description" LIKE '%Capital Proyectos Septic%';
    `);
    console.log(`   ✅ BankTransactions (descripciones): ${updateDesc.rowCount} actualizados`);

    const [updateNotes] = await conn.query(`
      UPDATE "BankTransactions"
      SET 
        "notes" = REPLACE("notes", 'Capital Proyectos Septic', 'Proyecto Septic BOFA'),
        "updatedAt" = NOW()
      WHERE "notes" LIKE '%Capital Proyectos Septic%';
    `);
    console.log(`   ✅ BankTransactions (notas): ${updateNotes.rowCount} actualizados\n`);

    // PASO 3: Eliminar/Desactivar cuenta "Cap Trabajos Septic"
    console.log('📝 PASO 3: Procesando cuenta "Cap Trabajos Septic"\n');

    const [capAccount] = await conn.query(`
      SELECT "idBankAccount", "accountName", "currentBalance"
      FROM "BankAccounts"
      WHERE "accountName" = 'Cap Trabajos Septic';
    `);

    if (capAccount.length > 0) {
      const accountId = capAccount[0].idBankAccount;
      
      // Verificar registros relacionados
      const [hasRecords] = await conn.query(`
        SELECT 
          (SELECT COUNT(*) FROM "Incomes" WHERE "paymentMethod" = 'Cap Trabajos Septic') +
          (SELECT COUNT(*) FROM "Expenses" WHERE "paymentMethod" = 'Cap Trabajos Septic') +
          (SELECT COUNT(*) FROM "BankTransactions" WHERE "bankAccountId" = '${accountId}') as total;
      `);

      if (parseInt(hasRecords[0].total) > 0) {
        console.log(`   ⚠️  Cuenta tiene ${hasRecords[0].total} registros relacionados`);
        console.log('   ⚠️  Marcando como INACTIVA en lugar de eliminar\n');
        
        await conn.query(`
          UPDATE "BankAccounts"
          SET 
            "isActive" = false,
            "notes" = 'DESHABILITADA 2025-11-20 - Ya no se utiliza',
            "updatedAt" = NOW()
          WHERE "idBankAccount" = '${accountId}';
        `);
        console.log('   ✅ Cuenta marcada como inactiva');
      } else {
        await conn.query(`
          DELETE FROM "BankAccounts" WHERE "idBankAccount" = '${accountId}';
        `);
        console.log('   ✅ Cuenta eliminada (sin registros relacionados)');
      }
    } else {
      console.log('   ⚠️  Cuenta "Cap Trabajos Septic" no encontrada\n');
    }

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL\n');

    const [summary] = await conn.query(`
      SELECT 
        "accountName",
        "currentBalance",
        "isActive",
        "bankName"
      FROM "BankAccounts"
      ORDER BY "isActive" DESC, "accountName" ASC;
    `);

    console.log('🏦 Cuentas bancarias:\n');
    summary.forEach((acc) => {
      const status = acc.isActive ? '✅ ACTIVA' : '❌ INACTIVA';
      const balance = parseFloat(acc.currentBalance);
      console.log(`   ${status.padEnd(12)} | ${acc.accountName.padEnd(25)} | $${balance.toFixed(2).padStart(10)}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Actualización completada\n');
    console.log('⚠️  IMPORTANTE: Debes ejecutar migraciones de Sequelize');
    console.log('   para sincronizar los ENUMs del código con la DB:\n');
    console.log('   1. Reinicia el backend (nodemon debería hacerlo automáticamente)');
    console.log('   2. Sequelize detectará los cambios en los ENUMs');
    console.log('   3. Verifica que no haya errores de sincronización\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await conn.close();
    console.log('🔌 Conexión cerrada\n');
    process.exit(0);
  }
};

updateEnums();
