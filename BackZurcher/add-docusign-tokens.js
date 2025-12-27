const { Sequelize, DataTypes } = require('sequelize');

/**
 * Migración para crear la tabla de tokens DocuSign
 * 
 * Para ejecutar: node add-docusign-tokens.js
 */

// Cargar configuración de base de datos
require('dotenv').config();

// Configurar conexión de base de datos según el entorno
let databaseUrl;

if (process.env.NODE_ENV === 'production') {
  databaseUrl = process.env.DB_DEPLOY || process.env.DATABASE_URL;
} else {
  // Para desarrollo local, construir URL desde componentes individuales
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'ZurcherConstruction';
  
  databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
}

console.log(`🔌 Conectando a base de datos: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  logging: console.log
});

async function up() {
  console.log('🔄 Creando tabla docusign_tokens...');

  await sequelize.getQueryInterface().createTable('docusign_tokens', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    
    // Identificador del proveedor
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
      type: DataTypes.TEXT,
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
    },
    
    refreshCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    
    // Información adicional para debugging
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // Timestamps automáticos
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  // Crear índices únicos y de performance
  await sequelize.getQueryInterface().addIndex('docusign_tokens', 
    ['provider', 'environment', 'accountId'], 
    {
      unique: true,
      name: 'unique_provider_env_account'
    }
  );

  await sequelize.getQueryInterface().addIndex('docusign_tokens', ['expiresAt'], {
    name: 'idx_expires_at'
  });

  await sequelize.getQueryInterface().addIndex('docusign_tokens', ['isActive'], {
    name: 'idx_is_active'
  });

  console.log('✅ Tabla docusign_tokens creada exitosamente');
}

async function down() {
  console.log('🔄 Eliminando tabla docusign_tokens...');
  
  await sequelize.getQueryInterface().dropTable('docusign_tokens');
  
  console.log('✅ Tabla docusign_tokens eliminada exitosamente');
}

// Ejecutar migración
async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de DocuSign Tokens...');
    
    // Probar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos exitosa');

    // Verificar si la tabla ya existe
    const tables = await sequelize.getQueryInterface().showAllTables();
    
    if (tables.includes('docusign_tokens')) {
      console.log('⚠️  La tabla docusign_tokens ya existe');
      
      // Preguntar si queremos recrearla (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Recreando tabla en modo desarrollo...');
        await down();
        await up();
      } else {
        console.log('⏭️  Saltando creación en producción');
      }
    } else {
      await up();
    }

    console.log('🎉 Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration();
}

module.exports = { up, down, runMigration };