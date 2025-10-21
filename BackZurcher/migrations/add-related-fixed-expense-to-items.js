/**
 * Migración: Agregar relatedFixedExpenseId a SupplierInvoiceItems
 * 
 * Permite vincular items de facturas de proveedores con gastos fijos
 */

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Agregar campo relatedFixedExpenseId
      await queryInterface.addColumn(
        'SupplierInvoiceItems',
        'relatedFixedExpenseId',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'FixedExpenses',
            key: 'idFixedExpense'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'FixedExpense vinculado a este item de factura'
        },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Migración completada: relatedFixedExpenseId agregado a SupplierInvoiceItems');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeColumn('SupplierInvoiceItems', 'relatedFixedExpenseId', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completado: relatedFixedExpenseId removido');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en rollback:', error);
      throw error;
    }
  }
};
