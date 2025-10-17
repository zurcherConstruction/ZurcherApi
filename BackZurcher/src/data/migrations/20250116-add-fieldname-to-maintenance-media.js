const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('MaintenanceMedia', 'fieldName', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del campo del formulario al que pertenece este archivo (ej: strong_odors, blower_working, general)',
    });

    console.log('✅ Campo fieldName agregado a MaintenanceMedia');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('MaintenanceMedia', 'fieldName');
    console.log('✅ Campo fieldName eliminado de MaintenanceMedia');
  }
};
