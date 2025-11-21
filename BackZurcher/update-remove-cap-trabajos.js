/**
 * Script para eliminar cuenta "Cap Trabajos Septic" y renombrar "Capital Proyectos Septic"
 * 
 * ACCIONES:
 * 1. Renombrar "Capital Proyectos Septic" → "Proyecto Septic BOFA"
 * 2. Eliminar cuenta bancaria "Cap Trabajos Septic"
 * 3. Actualizar todos los registros que usen estas cuentas
 * 
 * EJECUTAR: node update-remove-cap-trabajos.js
 * 
 * Fecha: 20 de noviembre de 2025
 */

const { conn } = require('./src/data');

const updateDatabase = async () => {
  try {
    console.log('🔄 Iniciando actualización de cuentas bancarias...\n');
    console.log('=' .repeat(60));
    
    await conn.authenticate();
    console.log('✅ Conexión a base de datos establecida\n');

    // ========================================
    // PASO 1: Renombrar "Capital Proyectos Septic" → "Proyecto Septic BOFA"
    // ========================================
    
    console.log('📝 PASO 1: Renombrando "Capital Proyectos Septic" → "Proyecto Septic BOFA"\n');
    
    // 1.1 Actualizar nombre en BankAccounts
    const [updateAccount] = await conn.query(`
      UPDATE "BankAccounts"
      SET 
        "accountName" = 'Proyecto Septic BOFA',
        "bankName" = 'Bank of America',
        "notes" = 'Cuenta para proyectos de sistemas sépticos - BOFA',
        "updatedAt" = NOW()
      WHERE "accountName" = 'Capital Proyectos Septic'
      RETURNING "idBankAccount", "accountName", "currentBalance";
    `);
    
    if (updateAccount.length > 0) {
      console.log(`✅ Cuenta bancaria renombrada:`);
      console.log(`   ID: ${updateAccount[0].idBankAccount}`);
      console.log(`   Nuevo nombre: ${updateAccount[0].accountName}`);
      console.log(`   Balance actual: $${parseFloat(updateAccount[0].currentBalance).toFixed(2)}`);
    } else {
      console.log('⚠️  No se encontró la cuenta "Capital Proyectos Septic" (posiblemente ya renombrada)');
    }
    console.log('');

    // 1.2 Actualizar paymentMethod en Incomes
    const [updateIncomes] = await conn.query(`
      UPDATE "Incomes"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`✅ Incomes actualizados: ${updateIncomes.rowCount} registros`);

    // 1.3 Actualizar paymentMethod en Expenses
    const [updateExpenses] = await conn.query(`
      UPDATE "Expenses"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`✅ Expenses actualizados: ${updateExpenses.rowCount} registros`);

    // 1.4 Actualizar paymentMethod en FixedExpenses
    const [updateFixed] = await conn.query(`
      UPDATE "FixedExpenses"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`✅ FixedExpenses actualizados: ${updateFixed.rowCount} registros`);

    // 1.5 Actualizar paymentMethod en FixedExpensePayments
    const [updatePayments] = await conn.query(`
      UPDATE "FixedExpensePayments"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`✅ FixedExpensePayments actualizados: ${updatePayments.rowCount} registros`);

    // 1.6 Actualizar paymentMethod en SupplierInvoices
    const [updateSupplier] = await conn.query(`
      UPDATE "SupplierInvoices"
      SET 
        "paymentMethod" = 'Proyecto Septic BOFA',
        "updatedAt" = NOW()
      WHERE "paymentMethod" = 'Capital Proyectos Septic';
    `);
    console.log(`✅ SupplierInvoices actualizados: ${updateSupplier.rowCount} registros`);

    // 1.7 Actualizar descripciones en BankTransactions
    const [updateDescriptions] = await conn.query(`
      UPDATE "BankTransactions"
      SET 
        "description" = REPLACE("description", 'Capital Proyectos Septic', 'Proyecto Septic BOFA'),
        "updatedAt" = NOW()
      WHERE "description" LIKE '%Capital Proyectos Septic%';
    `);
    console.log(`✅ BankTransactions (descripciones) actualizados: ${updateDescriptions.rowCount} registros`);

    const [updateNotes] = await conn.query(`
      UPDATE "BankTransactions"
      SET 
        "notes" = REPLACE("notes", 'Capital Proyectos Septic', 'Proyecto Septic BOFA'),
        "updatedAt" = NOW()
      WHERE "notes" LIKE '%Capital Proyectos Septic%';
    `);
    console.log(`✅ BankTransactions (notas) actualizados: ${updateNotes.rowCount} registros\n`);

    // ========================================
    // PASO 2: Verificar y eliminar "Cap Trabajos Septic"
    // ========================================
    
    console.log('=' .repeat(60));
    console.log('🗑️  PASO 2: Eliminando cuenta "Cap Trabajos Septic"\n');

    // 2.1 Verificar si la cuenta existe
    const [capTrabajosAccount] = await conn.query(`
      SELECT "idBankAccount", "accountName", "currentBalance"
      FROM "BankAccounts"
      WHERE "accountName" = 'Cap Trabajos Septic'
      LIMIT 1;
    `);

    if (capTrabajosAccount.length === 0) {
      console.log('⚠️  La cuenta "Cap Trabajos Septic" no existe (posiblemente ya eliminada)\n');
    } else {
      const accountId = capTrabajosAccount[0].idBankAccount;
      const balance = parseFloat(capTrabajosAccount[0].currentBalance);
      
      console.log(`📊 Cuenta encontrada:`);
      console.log(`   ID: ${accountId}`);
      console.log(`   Balance: $${balance.toFixed(2)}\n`);

      // 2.2 Verificar si hay registros usando esta cuenta
      const [incomesCount] = await conn.query(`
        SELECT COUNT(*) as count FROM "Incomes" 
        WHERE "paymentMethod" = 'Cap Trabajos Septic';
      `);
      
      const [expensesCount] = await conn.query(`
        SELECT COUNT(*) as count FROM "Expenses" 
        WHERE "paymentMethod" = 'Cap Trabajos Septic';
      `);

      const [transactionsCount] = await conn.query(`
        SELECT COUNT(*) as count FROM "BankTransactions" 
        WHERE "bankAccountId" = '${accountId}';
      `);

      console.log('📋 Registros relacionados:');
      console.log(`   Incomes: ${incomesCount[0].count}`);
      console.log(`   Expenses: ${expensesCount[0].count}`);
      console.log(`   BankTransactions: ${transactionsCount[0].count}\n`);

      const totalRecords = parseInt(incomesCount[0].count) + 
                          parseInt(expensesCount[0].count) + 
                          parseInt(transactionsCount[0].count);

      if (totalRecords > 0) {
        console.log('⚠️  ADVERTENCIA: Existen registros usando esta cuenta.');
        console.log('⚠️  No se puede eliminar. Debe migrarse manualmente o marcarla como inactiva.\n');
        
        // Marcar como inactiva en lugar de eliminar
        await conn.query(`
          UPDATE "BankAccounts"
          SET 
            "isActive" = false,
            "notes" = CONCAT(COALESCE("notes", ''), ' | DESHABILITADA: ${new Date().toISOString().split('T')[0]} - Ya no se utiliza'),
            "updatedAt" = NOW()
          WHERE "idBankAccount" = '${accountId}';
        `);
        
        console.log('✅ Cuenta marcada como INACTIVA (no eliminada por seguridad)\n');
      } else {
        // Si no hay registros, eliminar la cuenta
        console.log('✅ No hay registros relacionados. Eliminando cuenta...\n');
        
        await conn.query(`
          DELETE FROM "BankAccounts"
          WHERE "idBankAccount" = '${accountId}';
        `);
        
        console.log('✅ Cuenta "Cap Trabajos Septic" eliminada exitosamente\n');
      }
    }

    // ========================================
    // RESUMEN FINAL
    // ========================================
    
    console.log('=' .repeat(60));
    console.log('📊 RESUMEN FINAL\n');

    const [summary] = await conn.query(`
      SELECT 
        "accountName",
        "accountType",
        "currentBalance",
        "isActive",
        "bankName"
      FROM "BankAccounts"
      ORDER BY "accountName" ASC;
    `);

    console.log('🏦 Cuentas bancarias activas:\n');
    let totalBalance = 0;
    summary.forEach((account) => {
      const balance = parseFloat(account.currentBalance);
      totalBalance += balance;
      const status = account.isActive ? '✅' : '❌';
      console.log(`   ${status} ${account.accountName.padEnd(30)} | $${balance.toFixed(2).padStart(12)} | ${account.bankName || 'N/A'}`);
    });
    console.log('   ' + '-'.repeat(60));
    console.log(`   ${'TOTAL'.padEnd(30)} | $${totalBalance.toFixed(2).padStart(12)}`);
    console.log('');

    // Verificar paymentMethods actualizados
    const [paymentMethodsSummary] = await conn.query(`
      SELECT 
        'Incomes' as "Tabla",
        "paymentMethod",
        COUNT(*) as "Cantidad"
      FROM "Incomes"
      WHERE "paymentMethod" IN ('Chase Bank', 'Proyecto Septic BOFA', 'Cap Trabajos Septic', 'Capital Proyectos Septic')
      GROUP BY "paymentMethod"
      
      UNION ALL
      
      SELECT 
        'Expenses' as "Tabla",
        "paymentMethod",
        COUNT(*) as "Cantidad"
      FROM "Expenses"
      WHERE "paymentMethod" IN ('Chase Bank', 'Proyecto Septic BOFA', 'Cap Trabajos Septic', 'Capital Proyectos Septic')
      GROUP BY "paymentMethod"
      
      ORDER BY "Tabla", "paymentMethod";
    `);

    if (paymentMethodsSummary.length > 0) {
      console.log('💳 Uso de métodos de pago (cuentas bancarias):\n');
      paymentMethodsSummary.forEach((row) => {
        console.log(`   ${row.Tabla.padEnd(15)} | ${row.paymentMethod.padEnd(30)} | ${row.Cantidad} registros`);
      });
      console.log('');
    }

    console.log('=' .repeat(60));
    console.log('✅ Actualización completada exitosamente\n');
    console.log('📌 Próximos pasos:');
    console.log('   1. Verificar que los balances sean correctos');
    console.log('   2. Reiniciar el backend para aplicar cambios en modelos');
    console.log('   3. Probar creación de nuevos Incomes/Expenses\n');

  } catch (error) {
    console.error('\n❌ Error durante la actualización:', error);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await conn.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

updateDatabase();
