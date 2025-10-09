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
      type: DataTypes.STRING, // ID del registro relacionado
      allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(
            'Factura Pago Inicial Budget',
            'Factura Pago Final Budget',
            'Materiales',
            'Diseño',
            'Workers',
            'Comisión Vendedor',
            'Imprevistos',
            'Comprobante Gasto',
            'Comprobante Ingreso',
            'Gastos Generales',
            'Materiales Iniciales',
            'Inspección Inicial',
            'Inspección Final',
            'Gasto Fijo' // 🆕 Para comprobantes de gastos fijos
        ),
        allowNull: false,
    },
       // --- Campos para Cloudinary ---
    fileUrl: {
      type: DataTypes.STRING, // URL segura devuelta por Cloudinary
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING, // ID público de Cloudinary (útil para borrar/gestionar)
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING, // Tipo MIME original del archivo
      allowNull: true, // Puede ser null si algo falla antes de guardarlo
    },
    originalName: {
       type: DataTypes.STRING, // Nombre original del archivo subido
       allowNull: true,
    },
    // pdfData: {
    //   type: DataTypes.BLOB, // Archivo PDF del comprobante
    //   allowNull: true,
    // },
    notes: {
        type: DataTypes.TEXT, // Notas adicionales sobre el comprobante
        allowNull: true,
      },
  }, {
    timestamps: true,
  });
};