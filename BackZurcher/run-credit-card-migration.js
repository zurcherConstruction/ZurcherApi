/**
 * Script para ejecutar la migración de campos de tarjeta de crédito
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const migration = require('./migrations/add-credit-card-transaction-fields');

const isDeploy = !!process.env.DB_DEPLOY;
const databaseUrl = isDeploy ? process.env.DB_DEPLOY : null;

console.log(`📊 Ejecutando en: ${isDeploy ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);
console.log('🔧 Migración: add-credit-card-transaction-fields\n');

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );
}

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    // Ejecutar migración UP
    await migration.up(sequelize.getQueryInterface(), Sequelize);

    console.log('\n✅ Migración ejecutada exitosamente');
    console.log('\n📋 Campos agregados a SupplierInvoices:');
    console.log('   - transactionType: ENUM (charge, payment, interest)');
    console.log('   - isCreditCard: BOOLEAN (default: false)');
    console.log('   - balanceAfter: DECIMAL(10,2)\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
