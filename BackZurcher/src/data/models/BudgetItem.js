const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define("BudgetItem", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category: { // Para agrupar en el frontend (e.g., "System Type", "Labor", "Inspection", "Drainfield", "Pump", "Sand", "Fees")
      type: DataTypes.STRING,
      allowNull: false,
      
    },

    name: { // Opcional, para más detalle (e.g., "ATU", "Regular", "Health Dept Fee") (e.g., "SepticTank_Fuji_300GPD")
      type: DataTypes.STRING,
      allowNull: false,
      // Asegura que no haya nombres duplicados
    },
    marca: { // O(e.g., "fuji, infiltrator, etc.")
      type: DataTypes.STRING,
      allowNull: true,
    },
    capacity: { // e.g., "300 GPD", "500 GPD"
      type: DataTypes.STRING,
      allowNull: true,
    },
    unitPrice: { // Precio base del artículo/servicio
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // --- NUEVOS CAMPOS DE PROVEEDOR ---
    supplierName: {
      type: DataTypes.STRING,
      allowNull: true, // O false si siempre es requerido
    },
    supplierLocation: { // Podría ser ciudad, dirección, etc.
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: { // Para poder "desactivar" items sin borrarlos
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Puedes añadir más campos si necesitas, como 'brand', 'model', etc.
  }, {
    timestamps: true,
  });
};