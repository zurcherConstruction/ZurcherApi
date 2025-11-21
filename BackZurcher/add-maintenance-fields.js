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

async function addNewMaintenanceFields() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    console.log('\n📋 Agregando nuevos campos al modelo MaintenanceVisit...\n');

    // Campos de nivel del tanque
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "tank_inlet_level" VARCHAR(255);
    `);
    console.log('✅ Agregado: tank_inlet_level');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "tank_inlet_notes" TEXT;
    `);
    console.log('✅ Agregado: tank_inlet_notes');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "tank_outlet_level" VARCHAR(255);
    `);
    console.log('✅ Agregado: tank_outlet_level');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "tank_outlet_notes" TEXT;
    `);
    console.log('✅ Agregado: tank_outlet_notes');

    // Inspección General - Nuevos campos
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "septic_access_clear" BOOLEAN;
    `);
    console.log('✅ Agregado: septic_access_clear');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "septic_access_notes" TEXT;
    `);
    console.log('✅ Agregado: septic_access_notes');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "needs_pumping_notes" TEXT;
    `);
    console.log('✅ Agregado: needs_pumping_notes');

    // Sistema ATU - Nuevos campos
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "alarm_test" BOOLEAN;
    `);
    console.log('✅ Agregado: alarm_test');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "alarm_test_notes" TEXT;
    `);
    console.log('✅ Agregado: alarm_test_notes');

    // Lift Station - Nuevos campos
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "pump_running" BOOLEAN;
    `);
    console.log('✅ Agregado: pump_running');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "pump_running_notes" TEXT;
    `);
    console.log('✅ Agregado: pump_running_notes');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "float_switches" BOOLEAN;
    `);
    console.log('✅ Agregado: float_switches');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "float_switches_notes" TEXT;
    `);
    console.log('✅ Agregado: float_switches_notes');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "alarm_working" BOOLEAN;
    `);
    console.log('✅ Agregado: alarm_working');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "alarm_working_notes" TEXT;
    `);
    console.log('✅ Agregado: alarm_working_notes');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "pump_condition" BOOLEAN;
    `);
    console.log('✅ Agregado: pump_condition');

    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "pump_condition_notes" TEXT;
    `);
    console.log('✅ Agregado: pump_condition_notes');

    // Video del sistema
    await sequelize.query(`
      ALTER TABLE "MaintenanceVisits" 
      ADD COLUMN IF NOT EXISTS "system_video_url" VARCHAR(500);
    `);
    console.log('✅ Agregado: system_video_url');

    console.log('\n🎉 ¡Todos los campos se agregaron exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

addNewMaintenanceFields();
