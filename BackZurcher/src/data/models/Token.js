const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  sequelize.define(
    'Token',
    {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
        }
      );
    };