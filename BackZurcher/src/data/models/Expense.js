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
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Método de pago o cuenta por la que se realizó el gasto (ej: Zelle, Cash, Check #1234, Bank Transfer - Chase, Credit Card - Visa, etc.)'
    },
    // 🆕 Campo de verificación/revisión
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el gasto ha sido verificado/revisado por el equipo de finanzas'
    }
  });

  

  return Expense;
};