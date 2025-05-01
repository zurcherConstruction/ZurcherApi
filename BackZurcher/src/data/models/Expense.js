const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Expense = sequelize.define('Expense', {
    idExpense: {
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
    typeExpense: {
        type: DataTypes.ENUM(
            'Materiales',
            'Diseño',
            'Workers',
            'Imprevistos',
             "Comprobante Gasto",
        ),
        allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
     workId: { // Add workId to Expense model
      type: DataTypes.UUID,
      allowNull: true, // or false, depending on your requirements
    }
  });

  

  return Expense;
};