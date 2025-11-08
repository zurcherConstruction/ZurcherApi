/**
 * Migración: Agregar columna linkedByStaffId a SupplierInvoiceExpenses
 * Fecha: 2025-11-08
 * Propósito: Tracking de quién vinculó el invoice con el expense
 * 
 * INSTRUCCIONES:
 * 1. En .env, configura DB_DEPLOY con la URL de Railway
 * 2. Ejecuta: node migrations/add-linkedByStaffId-to-supplier-invoice-expenses.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Usar DB_DEPLOY si está configurado, sino usar configuración local
const databaseUrl = process.env.DB_DEPLOY || 
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

console.log('🔌 Conectando a:', process.env.DB_DEPLOY ? 'RAILWAY (DB_DEPLOY)' : 'LOCAL');

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: process.env.DB_DEPLOY ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida');

    // Verificar si la columna ya existe
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SupplierInvoiceExpenses' 
      AND column_name = 'linkedByStaffId';
    `);

    if (results.length > 0) {
      console.log('⚠️  La columna linkedByStaffId ya existe en SupplierInvoiceExpenses');
      process.exit(0);
    }

    console.log('📝 Agregando columna linkedByStaffId a SupplierInvoiceExpenses...');

    await sequelize.query(`
      ALTER TABLE "SupplierInvoiceExpenses"
      ADD COLUMN "linkedByStaffId" UUID REFERENCES "Staffs"(id) ON DELETE SET NULL;
    `);

    console.log('✅ Columna linkedByStaffId agregada exitosamente');

    // Agregar comentario a la columna
    await sequelize.query(`
      COMMENT ON COLUMN "SupplierInvoiceExpenses"."linkedByStaffId" 
      IS 'Staff que vinculó el invoice con el expense';
    `);

    console.log('✅ Comentario agregado a la columna');
    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
