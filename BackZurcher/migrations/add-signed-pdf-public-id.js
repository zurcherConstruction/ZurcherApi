const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Agregando campo signedPdfPublicId a Budgets...');
    
    // Verificar si la columna ya existe en Budgets
    const budgetTable = await queryInterface.describeTable('Budgets');
    if (!budgetTable.signedPdfPublicId) {
      await queryInterface.addColumn('Budgets', 'signedPdfPublicId', {
        type: DataTypes.STRING(200),
        allowNull: true,
        after: 'signedPdfPath'
      });
      console.log('✅ Campo signedPdfPublicId agregado a Budgets');
    } else {
      console.log('ℹ️  Campo signedPdfPublicId ya existe en Budgets');
    }

    console.log('🔄 Agregando campo signedPdfPublicId a ChangeOrders...');
    
    // Verificar si la columna ya existe en ChangeOrders
    const changeOrderTable = await queryInterface.describeTable('ChangeOrders');
    if (!changeOrderTable.signedPdfPublicId) {
      await queryInterface.addColumn('ChangeOrders', 'signedPdfPublicId', {
        type: DataTypes.STRING(200),
        allowNull: true,
        after: 'signedPdfPath'
      });
      console.log('✅ Campo signedPdfPublicId agregado a ChangeOrders');
    } else {
      console.log('ℹ️  Campo signedPdfPublicId ya existe en ChangeOrders');
    }

    console.log('✅ Migración completada: signedPdfPublicId agregado');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración de signedPdfPublicId...');
    
    await queryInterface.removeColumn('Budgets', 'signedPdfPublicId');
    console.log('✅ Campo signedPdfPublicId eliminado de Budgets');
    
    await queryInterface.removeColumn('ChangeOrders', 'signedPdfPublicId');
    console.log('✅ Campo signedPdfPublicId eliminado de ChangeOrders');
    
    console.log('✅ Migración revertida');
  }
};
