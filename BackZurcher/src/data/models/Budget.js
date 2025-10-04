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
      type: DataTypes.ENUM(
        "draft",              // 🆕 NUEVO: Borrador inicial (no enviado) - OPCIONAL
        "pending_review",     // 🆕 NUEVO: Enviado para revisión del cliente (sin firma) - OPCIONAL
        "client_approved",    // 🆕 NUEVO: Cliente aprobó, listo para firma - OPCIONAL
        "created",            // ✅ Estado original y DEFAULT
        "send",               // Enviado (legacy)
        "sent_for_signature", // Enviado a SignNow para firma
        "signed",             // Firmado por el cliente
        "approved",           // Aprobado (después de firma y/o pago)
        "notResponded",       // Cliente no respondió
        "rejected"            // Rechazado por el cliente
      ),
      allowNull: false,
      defaultValue: "created"   // ✅ MANTENER el default original
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
  signNowDocumentId: { // ID del documento de SignNow
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
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
  },
  
  // --- IDENTIFICADOR DE TRABAJO IMPORTADO ---
  isLegacy: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  
  // --- PDF FIRMADO PARA TRABAJOS LEGACY ---
  legacySignedPdfUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  legacySignedPdfPublicId: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // --- 🆕 SISTEMA DE VENDEDORES Y COMISIONES ---
  
  // Fuente del presupuesto (de dónde vino el lead)
  leadSource: {
    type: DataTypes.ENUM(
      'web',              // Desde el sitio web
      'direct_client',    // Cliente directo (sin intermediarios)
      'social_media',     // Redes sociales
      'referral',         // Referido
      'sales_rep'         // Vendedor/Representante de ventas
    ),
    allowNull: true,
    defaultValue: 'web'
  },
  
  // ID del vendedor (solo si leadSource = 'sales_rep')
  createdByStaffId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Staffs',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  
  // Comisión fija para vendedores ($500 USD)
  salesCommissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  
  // Total mostrado al cliente (incluye comisión si aplica)
  clientTotalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  // Porcentaje de comisión (para futuros casos variables)
  commissionPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  
  commissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  
  commissionPaid: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  
  commissionPaidDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // --- 🆕 SISTEMA DE REVISIÓN PREVIA (OPCIONAL) ---
  
  // Token único para que el cliente pueda aprobar/rechazar sin autenticación
  reviewToken: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true
  },
  
  // Fecha en que se envió para revisión
  sentForReviewAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Fecha en que el cliente respondió
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
    
    
  });
};
