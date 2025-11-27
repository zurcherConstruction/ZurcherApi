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
    }
  }, {
    timestamps: true
  });
};