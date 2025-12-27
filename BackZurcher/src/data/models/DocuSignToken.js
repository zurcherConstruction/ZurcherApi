const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    'DocuSignToken',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      
      // Identificador del proveedor (para soportar múltiples cuentas en el futuro)
      provider: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'docusign'
      },
      
      // Entorno (production, demo)
      environment: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: process.env.DOCUSIGN_ENVIRONMENT || 'demo'
      },
      
      // Account ID de DocuSign
      accountId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: process.env.DOCUSIGN_ACCOUNT_ID
      },
      
      // Tokens OAuth
      accessToken: {
        type: DataTypes.TEXT, // Usar TEXT para tokens largos
        allowNull: false,
      },
      
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      
      tokenType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Bearer'
      },
      
      // Información de expiración
      expiresIn: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tiempo de vida del token en segundos'
      },
      
      obtainedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      
      // Metadatos útiles
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que se usó el token'
      },
      
      refreshCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número de veces que se ha refrescado el token'
      },
      
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Si el token está activo o ha sido revocado'
      },
      
      // Información adicional para debugging
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User agent cuando se obtuvo el token'
      },
      
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'IP desde donde se obtuvo el token'
      },
      
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales sobre el token'
      }
    },
    {
      tableName: 'docusign_tokens',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['provider', 'environment', 'accountId'],
          name: 'unique_provider_env_account'
        },
        {
          fields: ['expiresAt'],
          name: 'idx_expires_at'
        },
        {
          fields: ['isActive'],
          name: 'idx_is_active'
        }
      ],
      
      // Hooks para gestión automática
      hooks: {
        beforeCreate: (token) => {
          // Calcular expiresAt basado en obtainedAt y expiresIn
          if (!token.expiresAt && token.obtainedAt && token.expiresIn) {
            token.expiresAt = new Date(token.obtainedAt.getTime() + token.expiresIn * 1000);
          }
        },
        
        beforeUpdate: (token) => {
          // Actualizar expiresAt si se modificó expiresIn u obtainedAt
          if ((token.changed('obtainedAt') || token.changed('expiresIn')) && !token.changed('expiresAt')) {
            token.expiresAt = new Date(token.obtainedAt.getTime() + token.expiresIn * 1000);
          }
        }
      }
    }
  );
};