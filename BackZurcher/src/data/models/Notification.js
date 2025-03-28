const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Genera automáticamente un UUID
      primaryKey: true, // Define este campo como clave primaria
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    staffId: { // Cambiado de "Id" a "staffId"
      type: DataTypes.UUID,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    type: {
      type: DataTypes.STRING, // Por ejemplo: 'alerta', 'mensaje', 'tarea'
      allowNull: true,
    },
  });
};