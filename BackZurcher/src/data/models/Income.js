const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Income = sequelize.define('Income', {
   idIncome: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    staffId: {
  type: DataTypes.UUID,
  allowNull: true, // o true si puede ser opcional
  references: {
    model: 'Staffs', // nombre de la tabla Staff
    key: 'id'
  }
},
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    typeIncome: {
        type: DataTypes.ENUM(
            'Factura Pago Inicial Budget',
            'Factura Pago Final Budget',
            'DiseñoDif',
            "Comprobante Ingreso",
        ),
        allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workId: { // Add workId to Income model
      type: DataTypes.UUID,
      allowNull: true, // or false, depending on your requirements
    },
    // 🆕 Método/Cuenta de pago
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Método de pago o cuenta por la que ingresó el dinero (ej: Zelle, Cash, Check #1234, Bank Transfer - Chase, etc.)'
    },
    // 🆕 Campo de verificación/revisión
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el ingreso ha sido verificado/revisado por el equipo de finanzas'
    }
  });

 

  return Income;
};