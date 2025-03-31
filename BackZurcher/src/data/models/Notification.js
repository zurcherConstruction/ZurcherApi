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
    staffId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    senderId: {
        type: DataTypes.UUID, // ID del remitente
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
    parentId: {
      type: DataTypes.UUID, // Cambiado de INTEGER a UUID
      allowNull: true,
      references: {
        model: 'Notifications', // Hace referencia a la misma tabla
        key: 'id',
      },
      onDelete: 'SET NULL', // Si se elimina la notificación original, establece parentId como NULL
      onUpdate: 'CASCADE',
    },
  });
};