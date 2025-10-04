/**
 * Migración: Agregar campo supplierName a BudgetLineItems
 * Fecha: 2025-10-03
 * Descripción: 
 * - Agrega campo supplierName para almacenar el proveedor de cada item
 * - Especialmente útil para categorías como SAND que tienen múltiples proveedores
 */

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Iniciando migración: add-supplier-name-to-line-items');

    try {
      // Verificar si supplierName ya existe
      const [supplierNameExists] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'BudgetLineItems' AND column_name = 'supplierName';
      `);
      
      if (supplierNameExists.length === 0) {
        await queryInterface.addColumn('BudgetLineItems', 'supplierName', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('   ✅ supplierName agregado a BudgetLineItems');
      } else {
        console.log('   ⏭️  supplierName ya existe en BudgetLineItems, omitiendo...');
      }

      console.log('✅ Migración completada exitosamente');

    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⏪ Revirtiendo migración: add-supplier-name-to-line-items');

    try {
      await queryInterface.removeColumn('BudgetLineItems', 'supplierName');
      
      console.log('✅ Migración revertida');
    } catch (error) {
      console.error('❌ Error al revertir migración:', error);
      throw error;
    }
  }
};
