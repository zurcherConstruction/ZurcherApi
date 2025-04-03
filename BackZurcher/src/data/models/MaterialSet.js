const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MaterialSet', {
    idMaterialSet: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    invoiceFile: {
      type: DataTypes.STRING, // Ruta del archivo de factura
      allowNull: true,
    },
    totalCost: {
        type: DataTypes.DECIMAL(10, 2), // Costo total del conjunto de materiales
        allowNull: true,
      },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    workId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  });
};