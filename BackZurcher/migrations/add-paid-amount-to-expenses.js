/**
 * Migración: Agregar campo paidAmount a Expenses
 * 
 * Agrega el campo paidAmount para trackear pagos parciales
 * especialmente para Chase Credit Card con sistema FIFO
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Iniciando migración: add-paid-amount-to-expenses');

    // Agregar campo paidAmount
    await queryInterface.sequelize.query(`
      ALTER TABLE "Expenses" 
      ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10, 2) DEFAULT 0;
    `);
    
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "Expenses"."paidAmount" IS 'Monto pagado del gasto (para pagos parciales)';
    `);
    console.log('✅ Campo paidAmount agregado');

    // Actualizar expenses existentes con paidAmount = amount si están paid o paid_via_invoice
    await queryInterface.sequelize.query(`
      UPDATE "Expenses"
      SET "paidAmount" = amount
      WHERE "paymentStatus" IN ('paid', 'paid_via_invoice') AND ("paidAmount" IS NULL OR "paidAmount" = 0);
    `);
    console.log('✅ Expenses existentes actualizados');

    console.log('✅ Migración completada: add-paid-amount-to-expenses');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración: add-paid-amount-to-expenses');

    await queryInterface.removeColumn('Expenses', 'paidAmount');
    console.log('✅ Campo paidAmount eliminado');

    console.log('✅ Migración revertida: add-paid-amount-to-expenses');
  }
};
