// filepath: c:\Users\yaniz\Documents\ZurcherApi\BackZurcher\src\data\models\Receipt.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Receipt', {
    idReceipt: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    relatedModel: {
      type: DataTypes.STRING, // Nombre del modelo relacionado (e.g., 'Permit', 'Payment')
      allowNull: false,
    },
    relatedId: {
      type: DataTypes.UUID, // ID del registro relacionado
      allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('Factura Pago Inicial Budget',
            'Factura Pago Final Budget', 'Materiales',
            'Diseño',
            'Workers',
            'Imprevistos',
            'DiseñoDif' ),
        allowNull: false,
      },
    pdfData: {
      type: DataTypes.BLOB, // Archivo PDF del comprobante
      allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT, // Notas adicionales sobre el comprobante
        allowNull: true,
      },
  }, {
    timestamps: true,
  });
};