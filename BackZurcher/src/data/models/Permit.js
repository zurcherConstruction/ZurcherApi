const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Permit', {
    idPermit:{
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    permitNumber: {
      type: DataTypes.TEXT,
      allowNull: false, // ✅ Ahora es obligatorio
      unique: true, // ✅ Único en la base de datos
      validate: {
        notEmpty: {
          msg: 'Permit number is required'
        }
      }
    },
    applicationNumber: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    documentNumber: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    constructionPermitFor: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    applicant: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    propertyAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique:true
    },
    applicantName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    applicantEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    applicantPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lot: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    block: {
      type: DataTypes.TEXT,
      allowNull: true
    },
   
    systemType: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // 🆕 NUEVO: Indicador si el sistema ATU también es PBTS
    isPBTS: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Indica si el sistema ATU también incluye PBTS (Pretreatment Biological Treatment System)'
    },
    // 🆕 NUEVO: Correos adicionales para notificaciones (vendedores, etc)
    notificationEmails: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidEmailArray(value) {
          if (value && Array.isArray(value)) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            for (const email of value) {
              if (!emailRegex.test(email)) {
                throw new Error(`Invalid email in notificationEmails: ${email}`);
              }
            }
          }
        }
      },

    },
    configuration: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    locationBenchmark: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    elevation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    drainfieldDepth: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fillRequired: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    specificationsBy: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approvedBy: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expirationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    greaseInterceptorCapacity: {
      type: DataTypes.TEXT,
      allowNull: true
    },
   
    gpdCapacity: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    excavationRequired:{
      type: DataTypes.STRING,
      allowNull: true
    },
    squareFeetSystem: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    other: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  
    pump:{
      type: DataTypes.TEXT,
      allowNull: true
    },
    // ❌ DEPRECATED: PDFs como BLOB (causaban queries de 5+ segundos)
    // Mantener temporalmente para migración, eliminar después de verificar
    pdfData: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    optionalDocs: {
      type: DataTypes.BLOB, 
      allowNull: true,
    },
    
    // ✅ NUEVO: URLs de PDFs en Cloudinary (reemplazo de BLOBs)
    permitPdfUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL del PDF principal del permit en Cloudinary'
    },
    permitPdfPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Public ID de Cloudinary para eliminar PDF si es necesario'
    },
    optionalDocsUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de documentos opcionales en Cloudinary'
    },
    optionalDocsPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Public ID de Cloudinary para documentos opcionales'
    },
    
    // --- IDENTIFICADOR DE PERMIT IMPORTADO ---
    isLegacy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Indica si este permit fue importado desde sistema externo'
    },
    
    // --- CAMPOS PPI (Pre-Permit Inspection) ---
    // Part 1 - Applicant Information (Zurcher como Property Owner)
    ppiPropertyOwnerEmail: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: 'admin@zurcherseptic.com',
      comment: 'Email de Zurcher para Part 1 del PPI'
    },
    ppiPropertyOwnerPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Teléfono de Zurcher para Part 1 del PPI'
    },
    
    // Part 2 - Property Information
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ciudad de la propiedad'
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'FL',
      comment: 'Estado de la propiedad'
    },
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Código postal'
    },
    ppiStreetAddress: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: ' Dirección de calle para PPI (editable manualmente si parsing falla)'
    },
    subdivision: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Subdivisión'
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Unidad'
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Sección'
    },
    township: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Township'
    },
    range: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Range'
    },
    parcelNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Número de parcela'
    },
    applicationNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '🆕 PPI Part 2: Application Number (if known)'
    },
    
    // Part 3 - Request Type
    ppiAuthorizationType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'initial',
      validate: {
        isIn: [['initial', 'rescind', 'amend']]
      },
      comment: 'Tipo de autorización: initial, rescind, o amend'
    },
    
    // Part 4 - Inspector Type & Generated Files
    ppiInspectorType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['type-a', 'type-b']]
      },
      comment: 'Tipo de inspector: type-a (Landperc) o type-b (Carlos)'
    },
    ppiTemplatePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta al template PDF original (ppi-type-a.pdf o ppi-type-b.pdf)'
    },
    ppiGeneratedPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta al PPI generado con datos del permit'
    },
    ppiUploadedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de generación/carga del PPI'
    },
    ppiDocusignEnvelopeId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '🆕 DocuSign Envelope ID para firma del PPI'
    },
    ppiSentForSignatureAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '🆕 Fecha de envío del PPI a DocuSign'
    },
    ppiSignatureStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '🆕 Estado de firma del PPI: sent, signed, declined'
    },
    ppiSignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '🆕 Fecha en que se firmó el PPI'
    },
    ppiSignedPdfUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '🆕 URL del PPI firmado en Cloudinary'
    },
    ppiSignedPdfPublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '🆕 Public ID del PPI firmado en Cloudinary para eliminación'
    },
    ppiCloudinaryUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '🆕 URL del PPI en Cloudinary'
    },
    ppiCloudinaryPublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '🆕 Public ID del PPI en Cloudinary para eliminación'
    },  }, {
    timestamps: true
  });
};