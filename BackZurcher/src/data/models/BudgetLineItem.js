const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define("BudgetLineItem", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Foreign Key a Budget
    budgetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Budgets', // Asegúrate que coincida con el nombre de tu tabla Budget
        key: 'idBudget',
      },
      onDelete: 'CASCADE', // Si se borra el budget, se borran sus líneas
    },
    // Foreign Key a BudgetItem
    budgetItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'BudgetItems', // Asegúrate que coincida con el nombre de tu tabla BudgetItem
        key: 'id',
      },
      // onDelete: 'RESTRICT' // O 'SET NULL' si quieres mantener la línea aunque se borre el item base
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2), // DECIMAL por si usas fracciones de unidades (ej: 1.5 horas)
      allowNull: false,
      defaultValue: 1,
    },
    priceAtTimeOfBudget: { // Guarda el precio unitario que tenía el item CUANDO se añadió a este budget
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    lineTotal: { // Calculado: quantity * priceAtTimeOfBudget
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    notes: { // Notas específicas para esta línea en este budget (opcional)
        type: DataTypes.TEXT,
        allowNull: true,
    }
  }, {
    timestamps: true,
  });
};