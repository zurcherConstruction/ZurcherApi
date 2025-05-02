const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define("WorkExtraItem", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2), // Permite cantidades decimales si es necesario
      allowNull: false,
      defaultValue: 1.00,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    lineTotal: { // Calculado: quantity * unitPrice
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    dateAdded: {
      type: DataTypes.DATEONLY,
      allowNull: true, // Opcional
      defaultValue: DataTypes.NOW,
    },
    // Clave Foránea se define en las relaciones (index.js)
    // finalInvoiceId
  });
};