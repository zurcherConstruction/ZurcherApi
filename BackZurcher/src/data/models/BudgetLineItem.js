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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Si se borra el budget, se borran sus líneas
    },
    budgetItemId: { // Relación con BudgetItem (puede ser null para items personalizados)
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: { // Solo para items personalizados
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: { // Solo para items personalizados
      type: DataTypes.STRING,
      allowNull: true,
    },
    marca: { // Solo para items personalizados
      type: DataTypes.STRING,
      allowNull: true,
    },
    capacity: { // Solo para items personalizados
      type: DataTypes.STRING,
      allowNull: true,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
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
    },
 description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    supplierName: { // ✅ Nombre del proveedor (especialmente para SAND)
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });
};