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
        'installed',
        'firstInspectionPending',
        'approvedInspection',  
        'rejectedInspection',
        'coverPending', //se agrega installed
        'invoiceFinal',
        'paymentReceived',
        'finalInspectionPending', //cambiar por firstInspectionPending revisar inspecciones
        'finalApproved',
        'finalRejected',
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
    staffId: {
      type: DataTypes.UUID, // Clave foránea que referencia a Staff
      allowNull: true, // Permitir NULL si no todas las obras están asignadas
      references: {
        model: 'Staffs', // Nombre del modelo relacionado
        key: 'id', // Clave primaria del modelo Staff
      },
    },
    idBudget: {
      type: DataTypes.INTEGER, // Cambiado a INTEGER para coincidir con Budget
      allowNull: true,
      references: {
        model: 'Budgets',
        key: 'idBudget',
      },
    },
    
  });
};
