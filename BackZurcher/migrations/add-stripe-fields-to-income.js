/**
 * 🆕 MIGRACIÓN: Agregar campos de Stripe a Income
 * Fecha: 2025-01-13
 * 
 * Agrega los siguientes campos al modelo Income:
 * - stripePaymentIntentId: Para tracking de pagos de Stripe
 * - stripeSessionId: Para tracking de checkout sessions
 */

const { Sequelize } = require('sequelize');

async function up(sequelize) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 Iniciando migración: Agregar campos de Stripe a Income...');

    // Verificar si las columnas ya existen
    const [columns] = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'Incomes' 
       AND column_name IN ('stripePaymentIntentId', 'stripeSessionId')`,
      { transaction }
    );

    const existingColumns = columns.map(col => col.column_name);

    // Agregar stripePaymentIntentId si no existe
    if (!existingColumns.includes('stripePaymentIntentId')) {
      await sequelize.query(
        `ALTER TABLE "Incomes" 
         ADD COLUMN "stripePaymentIntentId" VARCHAR(255) NULL`,
        { transaction }
      );
      console.log('✅ Columna stripePaymentIntentId agregada');
    } else {
      console.log('⚠️ Columna stripePaymentIntentId ya existe, omitiendo...');
    }

    // Agregar stripeSessionId si no existe
    if (!existingColumns.includes('stripeSessionId')) {
      await sequelize.query(
        `ALTER TABLE "Incomes" 
         ADD COLUMN "stripeSessionId" VARCHAR(255) NULL`,
        { transaction }
      );
      console.log('✅ Columna stripeSessionId agregada');
    } else {
      console.log('⚠️ Columna stripeSessionId ya existe, omitiendo...');
    }

    // Agregar comentarios a las columnas
    if (!existingColumns.includes('stripePaymentIntentId')) {
      await sequelize.query(
        `COMMENT ON COLUMN "Incomes"."stripePaymentIntentId" IS 'ID del Payment Intent de Stripe (para tracking y reembolsos)'`,
        { transaction }
      );
    }

    if (!existingColumns.includes('stripeSessionId')) {
      await sequelize.query(
        `COMMENT ON COLUMN "Incomes"."stripeSessionId" IS 'ID de la Checkout Session de Stripe'`,
        { transaction }
      );
    }

    // Crear índices para búsquedas rápidas
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_incomes_stripe_payment_intent" 
       ON "Incomes" ("stripePaymentIntentId")`,
      { transaction }
    );

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_incomes_stripe_session" 
       ON "Incomes" ("stripeSessionId")`,
      { transaction }
    );

    console.log('✅ Índices creados para campos de Stripe');

    await transaction.commit();
    console.log('✅ Migración completada exitosamente!');
    
    return { success: true, message: 'Campos de Stripe agregados a Income' };
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en migración:', error);
    throw error;
  }
}

async function down(sequelize) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Revirtiendo migración: Eliminar campos de Stripe de Income...');

    // Eliminar índices
    await sequelize.query(
      `DROP INDEX IF EXISTS "idx_incomes_stripe_payment_intent"`,
      { transaction }
    );

    await sequelize.query(
      `DROP INDEX IF EXISTS "idx_incomes_stripe_session"`,
      { transaction }
    );

    // Eliminar columnas
    await sequelize.query(
      `ALTER TABLE "Incomes" DROP COLUMN IF EXISTS "stripePaymentIntentId"`,
      { transaction }
    );

    await sequelize.query(
      `ALTER TABLE "Incomes" DROP COLUMN IF EXISTS "stripeSessionId"`,
      { transaction }
    );

    await transaction.commit();
    console.log('✅ Migración revertida exitosamente!');
    
    return { success: true, message: 'Campos de Stripe eliminados de Income' };
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error revirtiendo migración:', error);
    throw error;
  }
}

// Función principal para ejecutar la migración
async function runMigration() {
  const { sequelize } = require('../src/data');
  
  try {
    console.log('🔧 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    await up(sequelize);
    
    console.log('\n📊 Verificación final:');
    const [result] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Incomes'
      AND column_name IN ('stripePaymentIntentId', 'stripeSessionId')
      ORDER BY column_name
    `);
    
    console.table(result);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal en migración:', error);
    process.exit(1);
  }
}

// Si se ejecuta directamente (no como módulo)
if (require.main === module) {
  runMigration();
}

module.exports = { up, down };
