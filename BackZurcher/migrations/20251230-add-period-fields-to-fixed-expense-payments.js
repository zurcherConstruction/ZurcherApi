/**
 * Migración: Agregar campos de período pagado a FixedExpensePayments
 * Permite registrar el período (inicio/fin o dueDate) al que corresponde el pago.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar qué columnas ya existen
    const table = await queryInterface.describeTable('FixedExpensePayments');
    
    // Agregar columnas solo si no existen
    if (!table.periodStart) {
      await queryInterface.addColumn('FixedExpensePayments', 'periodStart', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Inicio del período pagado (opcional)'
      });
    }
    
    if (!table.periodEnd) {
      await queryInterface.addColumn('FixedExpensePayments', 'periodEnd', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Fin del período pagado (opcional)'
      });
    }
    
    if (!table.periodDueDate) {
      await queryInterface.addColumn('FixedExpensePayments', 'periodDueDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Fecha de vencimiento del período pagado (opcional)'
      });
    }
  },
  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('FixedExpensePayments');
    
    if (table.periodStart) {
      await queryInterface.removeColumn('FixedExpensePayments', 'periodStart');
    }
    if (table.periodEnd) {
      await queryInterface.removeColumn('FixedExpensePayments', 'periodEnd');
    }
    if (table.periodDueDate) {
      await queryInterface.removeColumn('FixedExpensePayments', 'periodDueDate');
    }
  }
};
