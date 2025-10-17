const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MaintenanceMedia', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    maintenanceVisitId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'MaintenanceVisits', // Nombre de la tabla MaintenanceVisits
        key: 'id',
      },
    },
    mediaUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    publicId: { // Para Cloudinary
      type: DataTypes.STRING,
      allowNull: true,
    },
    mediaType: {
      type: DataTypes.ENUM('image', 'video', 'document'),
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del campo del formulario al que pertenece este archivo (ej: strong_odors, blower_working, general)',
    },
  }, {
    timestamps: true,
  });
};