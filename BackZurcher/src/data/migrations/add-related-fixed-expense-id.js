'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Expenses', 'relatedFixedExpenseId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'FixedExpenses',
        key: 'idFixedExpense'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Referencia al gasto fijo que generó este expense'
    });

    await queryInterface.addColumn('Expenses', 'vendor', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nombre del proveedor/beneficiario del gasto'
    });

    console.log('✅ Columnas relatedFixedExpenseId y vendor agregadas a Expenses');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Expenses', 'relatedFixedExpenseId');
    await queryInterface.removeColumn('Expenses', 'vendor');
    console.log('✅ Columnas relatedFixedExpenseId y vendor eliminadas de Expenses');
  }
};
