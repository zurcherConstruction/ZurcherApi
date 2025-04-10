const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Income = sequelize.define('Income', {
   idIncome: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    typeIncome: {
        type: DataTypes.ENUM(
            'Factura Pago Inicial Budget',
            'Factura Pago Final Budget',
            'Diseño'
        ),
        allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workId: { // Add workId to Income model
      type: DataTypes.UUID,
      allowNull: true, // or false, depending on your requirements
    }
  });

  Income.associate = (models) => {
    Income.belongsTo(models.Work, {
      foreignKey: 'workId',
      as: 'work',
    });
  };

  return Income;
};