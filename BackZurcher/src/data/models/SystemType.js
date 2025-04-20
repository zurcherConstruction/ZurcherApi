const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemType = sequelize.define(
    'SystemType', 
    {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Ensure system type names are unique
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  });

  return SystemType;
};