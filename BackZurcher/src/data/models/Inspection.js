const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Inspection', {
    idInspection: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('initial', 'final'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    dateRequested: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    dateCompleted: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });
};
