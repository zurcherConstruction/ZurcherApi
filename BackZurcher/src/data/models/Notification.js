const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true, // Opcional para notificaciones internas
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    staffId: {
      type: DataTypes.UUID,
      allowNull: false, // Usuario destinatario
    },
    senderId: {
      type: DataTypes.UUID, // Usuario remitente
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    type: {
      type: DataTypes.STRING, // 'email', 'push', 'socket'
      allowNull: false,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Notifications',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
  });
};