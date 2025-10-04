'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Verificar si la columna ya existe en Budgets
      const budgetsTableInfo = await queryInterface.describeTable('Budgets');
      
      if (!budgetsTableInfo.paymentProofMethod) {
        await queryInterface.addColumn(
          'Budgets',
          'paymentProofMethod',
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Método de pago del comprobante de pago inicial'
          },
          { transaction }
        );
        console.log('✅ Columna paymentProofMethod agregada a Budgets');
      } else {
        console.log('⏭️  Columna paymentProofMethod ya existe en Budgets');
      }

      await transaction.commit();
      console.log('✅ Migración add-payment-proof-method completada');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración add-payment-proof-method:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const budgetsTableInfo = await queryInterface.describeTable('Budgets');
      
      if (budgetsTableInfo.paymentProofMethod) {
        await queryInterface.removeColumn('Budgets', 'paymentProofMethod', { transaction });
        console.log('✅ Columna paymentProofMethod eliminada de Budgets');
      }

      await transaction.commit();
      console.log('✅ Rollback de add-payment-proof-method completado');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en rollback de add-payment-proof-method:', error);
      throw error;
    }
  }
};
