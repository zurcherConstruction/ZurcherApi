const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('InstallationDetail', {
    idInstallationDetail: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    idWork: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    extraDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    extraMaterials: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING), // URLs de imágenes
      defaultValue: [],
    },
  });
};