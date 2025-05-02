const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define("FinalInvoice", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW, // Fecha de creación por defecto
    },
    originalBudgetTotal: { // Copia del Budget.totalPrice al momento de crear la factura
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotalExtras: { // Suma de todos los WorkExtraItem.lineTotal asociados
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    initialPaymentMade: { // Copia del Budget.initialPayment
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    finalAmountDue: { // Calculado: originalBudgetTotal + subtotalExtras - initialPaymentMade
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'partially_paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentDate: { // Fecha en que se marcó como pagada
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    paymentNotes: { // Notas sobre el pago final
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pdfPath: { // Ruta al PDF generado para esta factura final
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Claves Foráneas se definen en las relaciones (index.js)
    // workId
    // budgetId
  });
};