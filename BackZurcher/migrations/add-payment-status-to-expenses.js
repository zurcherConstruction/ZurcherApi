/**
 * Migración: Agregar campos de estado de pago a Expenses
 * 
 * Agrega los siguientes campos al modelo Expense:
 * - paymentStatus: Estado del pago (unpaid, paid, paid_via_invoice)
 * - paidDate: Fecha en que se pagó el gasto
 * - supplierInvoiceItemId: Referencia al item del invoice que pagó este gasto
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear el ENUM para paymentStatus
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Expenses_paymentStatus" AS ENUM ('unpaid', 'paid', 'paid_via_invoice');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Agregar campo paymentStatus
    await queryInterface.addColumn('Expenses', 'paymentStatus', {
      type: DataTypes.ENUM('unpaid', 'paid', 'paid_via_invoice'),
      allowNull: false,
      defaultValue: 'unpaid',
      comment: 'Estado de pago del gasto'
    });

    // 3. Agregar campo paidDate
    await queryInterface.addColumn('Expenses', 'paidDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha en que se pagó el gasto'
    });

    // 4. Agregar campo supplierInvoiceItemId
    await queryInterface.addColumn('Expenses', 'supplierInvoiceItemId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'SupplierInvoiceItems',
        key: 'idItem'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Item del invoice de proveedor que pagó este gasto'
    });

    console.log('✅ Campos de estado de pago agregados a Expenses');
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar los campos en orden inverso
    await queryInterface.removeColumn('Expenses', 'supplierInvoiceItemId');
    await queryInterface.removeColumn('Expenses', 'paidDate');
    await queryInterface.removeColumn('Expenses', 'paymentStatus');
    
    // Eliminar el ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Expenses_paymentStatus";
    `);

    console.log('✅ Campos de estado de pago eliminados de Expenses');
  }
};
