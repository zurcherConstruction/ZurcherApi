const { DataTypes } = require('sequelize');

/**
 * Tabla intermedia para vincular SupplierInvoices con Expenses existentes
 * Relación muchos a muchos: Un SupplierInvoice puede pagar múltiples Expenses
 * y un Expense puede estar vinculado a múltiples SupplierInvoices (pago parcial)
 */
module.exports = (sequelize) => {
  const SupplierInvoiceExpense = sequelize.define('SupplierInvoiceExpense', {
    idSupplierInvoiceExpense: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    supplierInvoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SupplierInvoices',
        key: 'idSupplierInvoice'
      },
      comment: 'ID del invoice del proveedor'
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Expenses',
        key: 'idExpense'
      },
      comment: 'ID del gasto vinculado'
    },
    amountApplied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto del invoice aplicado a este expense (para pagos parciales)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre esta vinculación'
    },
    linkedByStaffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      comment: 'Staff que vinculó el invoice con el expense'
    }
  }, {
    timestamps: true,
    tableName: 'SupplierInvoiceExpenses',
    indexes: [
      {
        unique: false,
        fields: ['supplierInvoiceId']
      },
      {
        unique: false,
        fields: ['expenseId']
      }
    ]
  });

  return SupplierInvoiceExpense;
};
