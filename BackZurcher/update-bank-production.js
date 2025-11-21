require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function updateProduction() {
  try {
    console.log('📊 ACTUALIZACIÓN PRODUCCIÓN - Cuentas Bancarias');
    console.log('================================================\n');
    
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // PASO 1: Agregar nuevo valor a los ENUMs
    console.log('📝 PASO 1: Agregando "Proyecto Septic BOFA" a los ENUMs\n');
    
    const enumTypes = [
      'enum_Incomes_paymentMethod',
      'enum_Expenses_paymentMethod',
      'enum_FixedExpenses_paymentMethod',
      'enum_FixedExpensePayments_paymentMethod',
      'enum_SupplierInvoices_paymentMethod'
    ];

    for (const enumType of enumTypes) {
      try {
        await sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'Proyecto Septic BOFA' 
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumType}')
            ) THEN
              ALTER TYPE "${enumType}" ADD VALUE 'Proyecto Septic BOFA';
            END IF;
          END
          $$;
        `);
        console.log(`   ✅ Agregado a ${enumType}`);
      } catch (error) {
        console.log(`   ⚠️  ${enumType}: ${error.message}`);
      }
    }

    // PASO 2: Renombrar cuenta "Capital Proyectos Septic" → "Proyecto Septic BOFA"
    console.log('\n📝 PASO 2: Renombrando cuenta bancaria\n');
    
    const [renamed] = await sequelize.query(`
      UPDATE "BankAccounts" 
      SET "accountName" = 'Proyecto Septic BOFA'
      WHERE "accountName" = 'Capital Proyectos Septic'
    `);
    console.log(`   ✅ Cuenta "Capital Proyectos Septic" renombrada a "Proyecto Septic BOFA"`);

    // PASO 3: Actualizar datos que usan "Capital Proyectos Septic"
    console.log('\n📝 PASO 3: Actualizando referencias en tablas\n');

    // Actualizar Incomes
    await sequelize.query(`
      UPDATE "Incomes" 
      SET "paymentMethod" = 'Proyecto Septic BOFA'
      WHERE "paymentMethod" = 'Capital Proyectos Septic'
    `);
    console.log('   ✅ Incomes actualizados');

    // Actualizar Expenses
    await sequelize.query(`
      UPDATE "Expenses" 
      SET "paymentMethod" = 'Proyecto Septic BOFA'
      WHERE "paymentMethod" = 'Capital Proyectos Septic'
    `);
    console.log('   ✅ Expenses actualizados');

    // Actualizar FixedExpenses
    await sequelize.query(`
      UPDATE "FixedExpenses" 
      SET "paymentMethod" = 'Proyecto Septic BOFA'
      WHERE "paymentMethod" = 'Capital Proyectos Septic'
    `);
    console.log('   ✅ FixedExpenses actualizados');

    // Actualizar FixedExpensePayments
    await sequelize.query(`
      UPDATE "FixedExpensePayments" 
      SET "paymentMethod" = 'Proyecto Septic BOFA'
      WHERE "paymentMethod" = 'Capital Proyectos Septic'
    `);
    console.log('   ✅ FixedExpensePayments actualizados');

    // Actualizar SupplierInvoices
    await sequelize.query(`
      UPDATE "SupplierInvoices" 
      SET "paymentMethod" = 'Proyecto Septic BOFA'
      WHERE "paymentMethod" = 'Capital Proyectos Septic'
    `);
    console.log('   ✅ SupplierInvoices actualizados');

    // Actualizar BankTransactions descriptions
    await sequelize.query(`
      UPDATE "BankTransactions" 
      SET description = REPLACE(description, 'Capital Proyectos Septic', 'Proyecto Septic BOFA')
      WHERE description LIKE '%Capital Proyectos Septic%'
    `);
    console.log('   ✅ BankTransactions (descripciones) actualizados');

    // Actualizar BankTransactions notes
    await sequelize.query(`
      UPDATE "BankTransactions" 
      SET notes = REPLACE(notes, 'Capital Proyectos Septic', 'Proyecto Septic BOFA')
      WHERE notes LIKE '%Capital Proyectos Septic%'
    `);
    console.log('   ✅ BankTransactions (notas) actualizados');

    // PASO 4: ELIMINAR cuenta "Cap Trabajos Septic"
    console.log('\n📝 PASO 4: Eliminando cuenta "Cap Trabajos Septic"\n');

    // Primero verificar si tiene registros relacionados
    const [hasRecords] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Incomes" WHERE "paymentMethod" = 'Cap Trabajos Septic') +
        (SELECT COUNT(*) FROM "Expenses" WHERE "paymentMethod" = 'Cap Trabajos Septic') +
        (SELECT COUNT(*) FROM "FixedExpenses" WHERE "paymentMethod" = 'Cap Trabajos Septic') +
        (SELECT COUNT(*) FROM "FixedExpensePayments" WHERE "paymentMethod" = 'Cap Trabajos Septic') +
        (SELECT COUNT(*) FROM "SupplierInvoices" WHERE "paymentMethod" = 'Cap Trabajos Septic') as total
    `);

    const totalRecords = parseInt(hasRecords[0].total);

    if (totalRecords > 0) {
      console.log(`   ⚠️  Cuenta tiene ${totalRecords} registros relacionados`);
      console.log('   ⚠️  NO SE PUEDE ELIMINAR - Marcando como INACTIVA\n');
      
      await sequelize.query(`
        UPDATE "BankAccounts" 
        SET "isActive" = false
        WHERE "accountName" = 'Cap Trabajos Septic'
      `);
      console.log('   ✅ Cuenta marcada como inactiva');
    } else {
      console.log('   ✅ Cuenta sin registros relacionados - Procediendo a eliminar');
      
      await sequelize.query(`
        DELETE FROM "BankAccounts" 
        WHERE "accountName" = 'Cap Trabajos Septic'
      `);
      console.log('   ✅ Cuenta eliminada correctamente');
    }

    // RESUMEN FINAL
    console.log('\n============================================================');
    console.log('📊 RESUMEN FINAL - Cuentas Bancarias\n');

    const [accounts] = await sequelize.query(`
      SELECT "accountName", "currentBalance", "isActive"
      FROM "BankAccounts"
      ORDER BY "isActive" DESC, "accountName"
    `);

    console.log('🏦 Estado de las cuentas:\n');
    accounts.forEach(acc => {
      const status = acc.isActive ? '✅ ACTIVA  ' : '❌ INACTIVA';
      const balance = parseFloat(acc.currentBalance).toFixed(2).padStart(10);
      console.log(`   ${status} | ${acc.accountName.padEnd(25)} | $ ${balance}`);
    });

    console.log('\n============================================================\n');
    console.log('✅ Actualización completada exitosamente\n');
    console.log('⚠️  IMPORTANTE: Después de ejecutar este script:');
    console.log('   1. Haz deploy del código actualizado');
    console.log('   2. Reinicia el backend (pm2 restart zurcher-api)');
    console.log('   3. Verifica que los dropdowns solo muestren 3 cuentas activas\n');

    await sequelize.close();
    console.log('🔌 Conexión cerrada');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

updateProduction();
