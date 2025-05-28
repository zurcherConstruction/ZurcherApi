const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define("Budget", {
    idBudget: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    propertyAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      
    },
    applicantName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expirationDate: {
      type: DataTypes.DATEONLY,
    },
    // price: {
    //   type: DataTypes.DECIMAL(10, 2), // Aseguramos precisión decimal
    //   allowNull: false,   //precio total de la suma 
    // },
    initialPayment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("created","send", "approved", "notResponded", "rejected", "sent_for_signature", "signed"),
      allowNull: false,
    },
    paymentProofAmount:{
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    //  systemType: {
    //   type: DataTypes.TEXT,
    //   allowNull: true
    // },
    // drainfieldDepth: {
    //   type: DataTypes.TEXT,
    //   allowNull: true
    // },
    // gpdCapacity: {
    //   type: DataTypes.TEXT,
    //   allowNull: true
    // },
    paymentInvoice: { // Guarda la URL del comprobante
      type: DataTypes.STRING, 
      allowNull: true, 
    },
    // --- NUEVO CAMPO ---
    paymentProofType: { // Guarda el TIPO del comprobante
      type: DataTypes.ENUM('pdf', 'image'), 
      allowNull: true, 
    },
    discountDescription: { // Una descripción general del descuento aplicado
      type: DataTypes.STRING,
      allowNull: true,
  },
  discountAmount: { // El monto total del descuento
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
  },

  // Totales generales (calculados a partir de BudgetLineItems)
  subtotalPrice: { // Suma de todos los lineTotal de BudgetLineItem
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  totalPrice: { // subtotalPrice - discountAmount
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  initialPaymentPercentage: {
    type: DataTypes.INTEGER, // O FLOAT, DECIMAL si necesitas decimales
    allowNull: true, // O false si siempre debe tener un valor
    defaultValue: 60 // Opcional: poner un valor por defecto
  },
  // Notas generales del presupuesto (opcional)
  generalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
  },
  pdfPath: {
    type: DataTypes.STRING,
    allowNull: true, // Puede ser null si no se ha subido un PDF
},
  signedPdfPath: { // Para guardar la ruta al PDF firmado por el cliente
    type: DataTypes.STRING,
    allowNull: true,
  },
  adobeAgreementId: { // ID del acuerdo de Adobe Sign
    type: DataTypes.STRING, // Los IDs de Adobe Sign suelen ser strings
    allowNull: true, // Será null hasta que se envíe a Adobe Sign
    unique: true, // Cada acuerdo de Adobe debe ser único
  },
  PermitIdPermit: {
    type: DataTypes.UUID, // Debe coincidir con el tipo de Permit.idPermit
    allowNull: false, // O true si un Budget puede existir sin Permit
    references: {
      model: 'Permits', // Nombre de la tabla referenciada
      key: 'idPermit'   // Clave primaria referenciada
    },
    onUpdate: 'CASCADE', // Opcional: qué hacer si el idPermit cambia
    onDelete: 'SET NULL' // Opcional: qué hacer si el Permit se borra (SET NULL, CASCADE, RESTRICT)
  }
    
    
  });
};
