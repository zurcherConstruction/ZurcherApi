/**
 * Migración: Agregar campos para manejo de transacciones de tarjeta de crédito
 * 
 * Agrega los siguientes campos al modelo SupplierInvoice:
 * - transactionType: Tipo de transacción (charge, payment, interest)
 * - isCreditCard: Indica si es una transacción de tarjeta de crédito
 * - balanceAfter: Balance después de aplicar esta transacción
 * 
 * Permite manejar Chase Credit Card con balance acumulado y pagos parciales
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Iniciando migración: add-credit-card-transaction-fields');

    // 1. Crear el ENUM si no existe
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_SupplierInvoices_transactionType') THEN
          CREATE TYPE "enum_SupplierInvoices_transactionType" AS ENUM ('charge', 'payment', 'interest');
        END IF;
      END $$;
    `);
    console.log('✅ ENUM transactionType verificado/creado');

    // 2. Agregar campo transactionType
    await queryInterface.sequelize.query(`
      ALTER TABLE "SupplierInvoices" 
      ADD COLUMN IF NOT EXISTS "transactionType" "enum_SupplierInvoices_transactionType" NOT NULL DEFAULT 'charge';
    `);
    
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "SupplierInvoices"."transactionType" IS 'Tipo de transacción: charge (cargo/gasto), payment (pago), interest (intereses)';
    `);
    console.log('✅ Campo transactionType agregado');

    // 3. Agregar campo isCreditCard
    await queryInterface.sequelize.query(`
      ALTER TABLE "SupplierInvoices" 
      ADD COLUMN IF NOT EXISTS "isCreditCard" BOOLEAN NOT NULL DEFAULT false;
    `);
    
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "SupplierInvoices"."isCreditCard" IS 'Indica si esta transacción es de tarjeta de crédito (para balance acumulado)';
    `);
    console.log('✅ Campo isCreditCard agregado');

    // 4. Agregar campo balanceAfter
    await queryInterface.sequelize.query(`
      ALTER TABLE "SupplierInvoices" 
      ADD COLUMN IF NOT EXISTS "balanceAfter" DECIMAL(10, 2);
    `);
    
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "SupplierInvoices"."balanceAfter" IS 'Balance de la tarjeta después de aplicar esta transacción';
    `);
    console.log('✅ Campo balanceAfter agregado');

    console.log('✅ Migración completada: add-credit-card-transaction-fields');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración: add-credit-card-transaction-fields');

    // Eliminar los campos en orden inverso
    await queryInterface.removeColumn('SupplierInvoices', 'balanceAfter');
    console.log('✅ Campo balanceAfter eliminado');

    await queryInterface.removeColumn('SupplierInvoices', 'isCreditCard');
    console.log('✅ Campo isCreditCard eliminado');

    await queryInterface.removeColumn('SupplierInvoices', 'transactionType');
    console.log('✅ Campo transactionType eliminado');
    
    // Eliminar el ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_SupplierInvoices_transactionType";
    `);
    console.log('✅ ENUM transactionType eliminado');

    console.log('✅ Migración revertida: add-credit-card-transaction-fields');
  }
};
