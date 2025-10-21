const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierInvoiceItem = sequelize.define('SupplierInvoiceItem', {
    idItem: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    
    // Relación con el Invoice principal
    supplierInvoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SupplierInvoices',
        key: 'idSupplierInvoice'
      },
      comment: 'Invoice al que pertenece este item'
    },
    
    // Relación con el Work (PUEDE SER NULL para gastos generales sin work específico)
    workId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Works',
        key: 'idWork'
      },
      comment: 'Work al que pertenece este gasto (null para gastos generales de la empresa)'
    },
    
    // Descripción del item
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Descripción detallada del item/concepto'
    },
    
    // Categoría del gasto (debe coincidir con los tipos de Expense)
    category: {
      type: DataTypes.ENUM(
        'Materiales',
        'Diseño',
        'Workers',
        'Imprevistos',
        'Comprobante Gasto',
        'Gastos Generales',
        'Materiales Iniciales',
        'Inspección Inicial',
        'Inspección Final',
        'Comisión Vendedor',
        'Gasto Fijo',
        'Otro' // Para casos especiales
      ),
      allowNull: false,
     
    },
    
    // Monto de este item específico
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto de este item individual'
    },
    
    // 🔑 CAMPO CLAVE: Vinculación con Expense existente
    relatedExpenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Expenses',
        key: 'idExpense'
      },
      comment: 'Si existe un Expense previo comprometido, se vincula aquí. Si es null, es un gasto nuevo.'
    },
    
    // 🆕 CAMPO CLAVE: Vinculación con FixedExpense existente
    relatedFixedExpenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'FixedExpenses',
        key: 'idFixedExpense'
      },
      comment: 'Si existe un FixedExpense previo comprometido, se vincula aquí. Si es null, es un gasto nuevo.'
    },
    
    // Notas específicas de este item
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre este item'
    }
  }, {
    timestamps: true,
    tableName: 'SupplierInvoiceItems'
  });

  return SupplierInvoiceItem;
};
