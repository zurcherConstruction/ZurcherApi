const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FixedExpensePayment = sequelize.define('FixedExpensePayment', {
    idPayment: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    
    // 🔑 Relación con el gasto fijo principal
    fixedExpenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'FixedExpenses',
        key: 'idFixedExpense'
      },
      comment: 'ID del gasto fijo al que pertenece este pago'
    },
    
    // 💰 Información del pago
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto de este pago parcial'
    },
    
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha en que se realizó este pago'
    },
    
    paymentMethod: {
      type: DataTypes.ENUM(
        // Bancos
        'Proyecto Septic BOFA',
        'Chase Bank',
        // Tarjetas
        'AMEX',
        'Chase Credit Card',
        // Otros métodos
        'Cheque',
        'Transferencia Bancaria',
        'Efectivo',
        'Zelle',
        'Tarjeta Débito',
        'PayPal',
        'Otro'
      ),
      allowNull: true,
     
    },
    
    // 📎 Comprobante de pago
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL del comprobante de pago (recibo, transferencia, etc.)'
    },
    
    receiptPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Public ID de Cloudinary para el comprobante'
    },
    
    // 📝 Notas
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas o detalles sobre este pago específico'
    },
    
    // 🔗 Relación con Expense generado
    expenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Expenses',
        key: 'idExpense'
      },
      comment: 'ID del Expense que se creó automáticamente al registrar este pago'
    },
    
    // 👤 Quién registró el pago
    createdByStaffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      comment: 'Staff que registró este pago'
    }
    
  }, {
    timestamps: true,
    tableName: 'FixedExpensePayments',
    indexes: [
      {
        fields: ['fixedExpenseId']
      },
      {
        fields: ['paymentDate']
      },
      {
        fields: ['expenseId']
      }
    ]
  });

  return FixedExpensePayment;
};
