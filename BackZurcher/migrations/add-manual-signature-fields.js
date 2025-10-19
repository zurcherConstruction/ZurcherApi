const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Agregando campos para firma manual a Budgets...');
    
    const budgetTable = await queryInterface.describeTable('Budgets');
    
    // 1. signatureMethod - ENUM para identificar cómo se firmó
    if (!budgetTable.signatureMethod) {
      await queryInterface.addColumn('Budgets', 'signatureMethod', {
        type: DataTypes.ENUM('signnow', 'manual', 'legacy', 'none'),
        allowNull: true,
        defaultValue: 'none',
        comment: 'Método de firma: signnow=firmado via SignNow, manual=PDF subido manualmente, legacy=importado ya firmado, none=sin firmar'
      });
      console.log('✅ Campo signatureMethod agregado a Budgets');
    } else {
      console.log('ℹ️  Campo signatureMethod ya existe en Budgets');
    }

    // 2. manualSignedPdfPath - URL del PDF firmado manualmente
    if (!budgetTable.manualSignedPdfPath) {
      await queryInterface.addColumn('Budgets', 'manualSignedPdfPath', {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de Cloudinary del PDF firmado subido manualmente'
      });
      console.log('✅ Campo manualSignedPdfPath agregado a Budgets');
    } else {
      console.log('ℹ️  Campo manualSignedPdfPath ya existe en Budgets');
    }

    // 3. manualSignedPdfPublicId - Public ID de Cloudinary
    if (!budgetTable.manualSignedPdfPublicId) {
      await queryInterface.addColumn('Budgets', 'manualSignedPdfPublicId', {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Public ID de Cloudinary para borrar/actualizar el PDF manual'
      });
      console.log('✅ Campo manualSignedPdfPublicId agregado a Budgets');
    } else {
      console.log('ℹ️  Campo manualSignedPdfPublicId ya existe en Budgets');
    }

    // 4. Actualizar budgets existentes con signNowDocumentId a signatureMethod='signnow'
    await queryInterface.sequelize.query(`
      UPDATE "Budgets" 
      SET "signatureMethod" = 'signnow' 
      WHERE "signNowDocumentId" IS NOT NULL 
      AND "signatureMethod" = 'none'
    `);
    console.log('✅ Budgets con SignNow actualizados a signatureMethod=signnow');

    // 5. Actualizar budgets legacy con legacySignedPdfUrl a signatureMethod='legacy'
    await queryInterface.sequelize.query(`
      UPDATE "Budgets" 
      SET "signatureMethod" = 'legacy' 
      WHERE "legacySignedPdfUrl" IS NOT NULL 
      AND "signatureMethod" = 'none'
    `);
    console.log('✅ Budgets legacy actualizados a signatureMethod=legacy');

    console.log('✅ Migración completada: Campos de firma manual agregados');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración de campos de firma manual...');
    
    await queryInterface.removeColumn('Budgets', 'signatureMethod');
    console.log('✅ Campo signatureMethod eliminado de Budgets');
    
    await queryInterface.removeColumn('Budgets', 'manualSignedPdfPath');
    console.log('✅ Campo manualSignedPdfPath eliminado de Budgets');
    
    await queryInterface.removeColumn('Budgets', 'manualSignedPdfPublicId');
    console.log('✅ Campo manualSignedPdfPublicId eliminado de Budgets');
    
    console.log('✅ Migración revertida');
  }
};
