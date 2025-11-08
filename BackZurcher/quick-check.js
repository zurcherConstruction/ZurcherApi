const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function quickCheck() {
  try {
    console.log('🔍 Quick Check - Estado Actual\n');
    
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    // 1. Expenses con Chase Credit Card
    const [expenses] = await sequelize.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card';
    `);
    console.log('📊 Expenses con Chase Credit Card:');
    console.log(`   Total: ${expenses[0].count}`);
    console.log(`   Monto: $${parseFloat(expenses[0].total || 0).toFixed(2)}\n`);

    // 2. Campo paidAmount existe?
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Expenses' AND column_name = 'paidAmount';
    `);
    console.log(`${cols.length > 0 ? '✅' : '❌'} Campo paidAmount: ${cols.length > 0 ? 'EXISTE' : 'NO EXISTE'}\n`);

    // 3. ENUM tiene partial?
    const [enums] = await sequelize.query(`
      SELECT e.enumlabel FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Expenses_paymentStatus'
      AND e.enumlabel = 'partial';
    `);
    console.log(`${enums.length > 0 ? '✅' : '❌'} ENUM tiene 'partial': ${enums.length > 0 ? 'SÍ' : 'NO'}\n`);

    // 4. Campos de tarjeta en SupplierInvoices
    const [siCols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'SupplierInvoices'
      AND column_name IN ('transactionType', 'isCreditCard', 'balanceAfter');
    `);
    console.log(`${siCols.length === 3 ? '✅' : '❌'} Campos de tarjeta en SupplierInvoices: ${siCols.length}/3\n`);

    console.log('🎯 Resumen:');
    const allReady = cols.length > 0 && enums.length > 0 && siCols.length === 3;
    if (allReady) {
      console.log('✅ Todas las migraciones YA están aplicadas en LOCAL');
      console.log('   Sistema listo para usar!\n');
    } else {
      console.log('⚠️  Faltan migraciones (esto es ESPERADO en producción)');
      console.log('   En producción deberás ejecutar deploy-chase-credit-card.js\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

quickCheck();
