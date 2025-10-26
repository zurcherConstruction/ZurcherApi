/**
 * Migración: Agregar campos para PDF del invoice en SupplierInvoices
 * Fecha: 2025-10-26
 * 
 * Agrega:
 * - invoicePdfPath: URL del PDF/imagen del invoice en Cloudinary
 * - invoicePdfPublicId: Public ID de Cloudinary para gestión del archivo
 */

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Agregando campos invoicePdfPath e invoicePdfPublicId a SupplierInvoices...');

      // Agregar invoicePdfPath
      await queryInterface.addColumn(
        'SupplierInvoices',
        'invoicePdfPath',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'URL del PDF/imagen del invoice en Cloudinary'
        },
        { transaction }
      );

      // Agregar invoicePdfPublicId
      await queryInterface.addColumn(
        'SupplierInvoices',
        'invoicePdfPublicId',
        {
          type: Sequelize.STRING(200),
          allowNull: true,
          comment: 'Public ID de Cloudinary del PDF/imagen del invoice'
        },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Migración completada exitosamente');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Revirtiendo migración: eliminando campos de SupplierInvoices...');

      await queryInterface.removeColumn('SupplierInvoices', 'invoicePdfPath', { transaction });
      await queryInterface.removeColumn('SupplierInvoices', 'invoicePdfPublicId', { transaction });

      await transaction.commit();
      console.log('✅ Migración revertida exitosamente');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al revertir migración:', error);
      throw error;
    }
  }
};
