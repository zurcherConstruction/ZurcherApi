const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Work', {
    idWork: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    
    propertyAddress: {
      type: DataTypes.TEXT,
      allowNull: false, // Aseguramos que este campo sea obligatorio
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'inProgress',
        'completed', //se agrega installed
        'inspectionPending', //cambiar por firstInspectionPending revisar inspecciones
        'approved',  
        'rejected',
        'maintenance'
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,                                                                                                                                                                                                                                                         
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });
};
