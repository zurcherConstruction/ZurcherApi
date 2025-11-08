const { Sequelize } = require('sequelize');
require('dotenv').config();

// Detectar si usar Railway o Local
const useRailway = process.env.DB_DEPLOY && process.env.DB_DEPLOY.includes('railway');
const dbConfig = useRailway 
  ? process.env.DB_DEPLOY 
  : {
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    };

const sequelize = useRailway 
  ? new Sequelize(dbConfig, {
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: 'postgres',
      logging: false,
      dialectOptions: dbConfig.dialectOptions
    });

async function quickCheck() {
  try {
    console.log('🔍 Quick Check - Estado Actual\n');
    
    await sequelize.authenticate();
    console.log(`✅ Conectado a: ${useRailway ? '🚂 RAILWAY (Producción)' : '💻 LOCAL'}\n`);

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
      console.log(`✅ Todas las migraciones aplicadas en ${useRailway ? 'RAILWAY' : 'LOCAL'}`);
      console.log('   Sistema listo para usar!\n');
    } else {
      console.log('⚠️  Faltan migraciones');
      console.log(`   ${3 - siCols.length} campos de tarjeta faltantes`);
      console.log(`   paidAmount: ${cols.length > 0 ? 'OK' : 'FALTA'}`);
      console.log(`   ENUM partial: ${enums.length > 0 ? 'OK' : 'FALTA'}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

quickCheck();
