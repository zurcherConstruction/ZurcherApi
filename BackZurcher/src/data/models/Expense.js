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
      type: DataTypes.STRING(10), // Formato: YYYY-MM-DD
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    staffId: {
  type: DataTypes.UUID,
  allowNull: true,
  references: {
    model: 'Staffs',
    key: 'id'
  }
},
    typeExpense: {
        type: DataTypes.ENUM(
            'Materiales',
            'Diseño',
            'Workers',
            'Imprevistos',
            "Comprobante Gasto",
            "Gastos Generales",
            'Materiales Iniciales',
            'Inspección Inicial',
            'Inspección Final',
            'Comisión Vendedor', // 🆕 Nuevo tipo para comisiones
            'Gasto Fijo', // 🆕 Para gastos fijos recurrentes (alquiler, servicios, etc.)
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
    },
    // 🆕 Método/Cuenta de pago
    paymentMethod: {
      type: DataTypes.ENUM(
        'Cap Trabajos Septic',
        'Capital Proyectos Septic',
        'Chase Bank',
        'AMEX',
        'Chase Credit Card',
        'Cheque',
        'Transferencia Bancaria',
        'Efectivo',
        'Zelle',
        'Tarjeta Débito',
        'PayPal',
        'Stripe',
        'Otro'
      ),
      allowNull: true,
      
    },
    // Detalle adicional del método de pago (ej: últimos 4 dígitos, número de cheque, etc.)
    paymentDetails: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Detalles adicionales del pago (ej: Check #1234, Últimos 4 dígitos: 5678, etc.)'
    },
    // 🆕 Campo de verificación/revisión
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el gasto ha sido verificado/revisado por el equipo de finanzas'
    },
    // 🆕 Relación con Fixed Expense (si este gasto fue generado automáticamente)
    relatedFixedExpenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'FixedExpenses',
        key: 'idFixedExpense'
      },
      comment: 'Referencia al gasto fijo que generó este expense'
    },
    // 🆕 Proveedor/Vendor
    vendor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del proveedor/beneficiario del gasto'
    },
    
    // 🆕 Estado de Pago del Gasto
    paymentStatus: {
      type: DataTypes.ENUM(
        'unpaid',              // No pagado (gasto comprometido pero sin pagar)
        'partial',             // Pagado parcialmente (para Chase Credit Card con FIFO)
        'paid',                // Pagado directamente (sin invoice de proveedor)
        'paid_via_invoice'     // Pagado a través de un SupplierInvoice
      ),
      allowNull: false,
      defaultValue: 'unpaid',
      
    },
    
    // Fecha en que se pagó el gasto
    paidDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      
    },
    
    // 🆕 Monto pagado (para pagos parciales)
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Monto pagado del gasto (para pagos parciales, especialmente Chase Credit Card)'
    },
    
    // 🔑 Vinculación con SupplierInvoiceItem (cuando se paga vía invoice)
    supplierInvoiceItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'SupplierInvoiceItems',
        key: 'idItem'
      },
      
    }
  });

  

  return Expense;
};