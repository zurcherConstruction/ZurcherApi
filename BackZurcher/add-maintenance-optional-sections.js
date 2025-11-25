require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

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

async function addOptionalSectionsAndObservations() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    console.log('\n📋 Agregando campos para secciones opcionales y observaciones PBTS...\n');

    // Control de secciones opcionales
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "has_lift_station" BOOLEAN DEFAULT false;
    `);
    console.log('✅ Agregado: has_lift_station');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "has_pbts" BOOLEAN DEFAULT false;
    `);
    console.log('✅ Agregado: has_pbts');

    // PBTS - Muestra 1: Observaciones y Notas
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "well_sample_1_observations" TEXT;
    `);
    console.log('✅ Agregado: well_sample_1_observations');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "well_sample_1_notes" TEXT;
    `);
    console.log('✅ Agregado: well_sample_1_notes');

    // PBTS - Muestra 2: Observaciones y Notas
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "well_sample_2_observations" TEXT;
    `);
    console.log('✅ Agregado: well_sample_2_observations');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "well_sample_2_notes" TEXT;
    `);
    console.log('✅ Agregado: well_sample_2_notes');

    // PBTS - Muestra 3: Observaciones y Notas
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "well_sample_3_observations" TEXT;
    `);
    console.log('✅ Agregado: well_sample_3_observations');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "well_sample_3_notes" TEXT;
    `);
    console.log('✅ Agregado: well_sample_3_notes');

    console.log('\n🎉 ¡Todos los campos se agregaron exitosamente!');
    console.log('\n📝 Resumen de campos agregados:');
    console.log('  - has_lift_station (BOOLEAN): Controla visibilidad de sección Lift Station');
    console.log('  - has_pbts (BOOLEAN): Controla visibilidad de sección PBTS');
    console.log('  - well_sample_1_observations (TEXT): Observaciones muestra 1');
    console.log('  - well_sample_1_notes (TEXT): Notas adicionales muestra 1');
    console.log('  - well_sample_2_observations (TEXT): Observaciones muestra 2');
    console.log('  - well_sample_2_notes (TEXT): Notas adicionales muestra 2');
    console.log('  - well_sample_3_observations (TEXT): Observaciones muestra 3');
    console.log('  - well_sample_3_notes (TEXT): Notas adicionales muestra 3');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

addOptionalSectionsAndObservations();
