'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Budgets');
    
    if (!tableInfo.paymentProofMethod) {
      await queryInterface.addColumn('Budgets', 'paymentProofMethod', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Column paymentProofMethod added to Budgets table');
    } else {
      console.log('⚠️ Column paymentProofMethod already exists in Budgets table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Budgets', 'paymentProofMethod');
  }
};
