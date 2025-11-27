require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY,
  NODE_ENV
} = process.env;

// Usar DB_DEPLOY si existe (Railway/Producción), sino usar configuración local
const sequelize = DB_DEPLOY 
  ? new Sequelize(DB_DEPLOY, {
      logging: console.log,
      native: false,
      timezone: 'America/New_York',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
      }
    })
  : new Sequelize(
      `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      {
        logging: console.log,
        native: false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

console.log(`📊 Base de datos: ${DB_DEPLOY ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}\n`);

async function addDocuSignEnvelopeIdColumn() {
  try {
    console.log('� Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    // Verificar si la columna ya existe
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Budgets' 
      AND column_name = 'docusignEnvelopeId';
    `);

    if (results.length > 0) {
      console.log('ℹ️  La columna docusignEnvelopeId ya existe en la tabla Budgets');
      console.log('✅ No se requiere ninguna acción\n');
    } else {
      console.log('🔧 Agregando columna docusignEnvelopeId a la tabla Budgets...\n');
      
      await sequelize.query(`
        ALTER TABLE "Budgets" 
        ADD COLUMN "docusignEnvelopeId" VARCHAR(255);
      `);

      console.log('✅ Columna docusignEnvelopeId agregada exitosamente\n');

      // Crear índice para búsquedas más rápidas
      console.log('🔧 Creando índice para docusignEnvelopeId...\n');
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_budgets_docusign_envelope_id 
        ON "Budgets" ("docusignEnvelopeId")
        WHERE "docusignEnvelopeId" IS NOT NULL;
      `);

      console.log('✅ Índice creado exitosamente\n');
    }

    // Verificar estructura final
    console.log('📋 Columnas relacionadas con firma en Budgets:');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Budgets' 
      AND column_name IN (
        'signNowDocumentId', 
        'docusignEnvelopeId', 
        'signatureDocumentId',
        'signatureMethod',
        'signedPdfPath',
        'signedPdfPublicId'
      )
      ORDER BY column_name;
    `);

    console.table(columns);

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar migración
addDocuSignEnvelopeIdColumn();
