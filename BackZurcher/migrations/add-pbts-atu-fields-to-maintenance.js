const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Agregando campos para sistemas PBTS/ATU a MaintenanceVisits...');
    
    const maintenanceTable = await queryInterface.describeTable('MaintenanceVisits');
    
    // 1. well_points_quantity - Cantidad de well points encontrados
    if (!maintenanceTable.well_points_quantity) {
      await queryInterface.addColumn('MaintenanceVisits', 'well_points_quantity', {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Cantidad de well points encontrados (para sistemas PBTS/ATU)'
      });
      console.log('✅ Campo well_points_quantity agregado a MaintenanceVisits');
    } else {
      console.log('ℹ️  Campo well_points_quantity ya existe en MaintenanceVisits');
    }

    // 2. well_sample_1_url - URL de foto muestra 1
    if (!maintenanceTable.well_sample_1_url) {
      await queryInterface.addColumn('MaintenanceVisits', 'well_sample_1_url', {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de Cloudinary con foto de la muestra 1 (para sistemas PBTS/ATU)'
      });
      console.log('✅ Campo well_sample_1_url agregado a MaintenanceVisits');
    } else {
      console.log('ℹ️  Campo well_sample_1_url ya existe en MaintenanceVisits');
    }

    // 3. well_sample_2_url - URL de foto muestra 2
    if (!maintenanceTable.well_sample_2_url) {
      await queryInterface.addColumn('MaintenanceVisits', 'well_sample_2_url', {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de Cloudinary con foto de la muestra 2 (para sistemas PBTS/ATU)'
      });
      console.log('✅ Campo well_sample_2_url agregado a MaintenanceVisits');
    } else {
      console.log('ℹ️  Campo well_sample_2_url ya existe en MaintenanceVisits');
    }

    // 4. well_sample_3_url - URL de foto muestra 3
    if (!maintenanceTable.well_sample_3_url) {
      await queryInterface.addColumn('MaintenanceVisits', 'well_sample_3_url', {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de Cloudinary con foto de la muestra 3 (para sistemas PBTS/ATU)'
      });
      console.log('✅ Campo well_sample_3_url agregado a MaintenanceVisits');
    } else {
      console.log('ℹ️  Campo well_sample_3_url ya existe en MaintenanceVisits');
    }

    console.log('✅ Migración completada exitosamente');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo campos PBTS/ATU de MaintenanceVisits...');
    
    await queryInterface.removeColumn('MaintenanceVisits', 'well_sample_3_url');
    console.log('✅ Campo well_sample_3_url eliminado');
    
    await queryInterface.removeColumn('MaintenanceVisits', 'well_sample_2_url');
    console.log('✅ Campo well_sample_2_url eliminado');
    
    await queryInterface.removeColumn('MaintenanceVisits', 'well_sample_1_url');
    console.log('✅ Campo well_sample_1_url eliminado');
    
    await queryInterface.removeColumn('MaintenanceVisits', 'well_points_quantity');
    console.log('✅ Campo well_points_quantity eliminado');
    
    console.log('✅ Rollback completado');
  }
};
