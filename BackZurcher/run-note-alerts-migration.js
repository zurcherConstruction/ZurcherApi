/**
 * Script para ejecutar la migración de alertas y recordatorios en BudgetNotes
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const migration = require('./migrations/add-note-alerts-and-reminders');

const isDeploy = !!process.env.DB_DEPLOY;
const databaseUrl = isDeploy ? process.env.DB_DEPLOY : null;

console.log(`📊 Ejecutando en: ${isDeploy ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);
console.log('🔧 Migración: add-note-alerts-and-reminders\n');

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );
}

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    // Ejecutar migración UP
    await migration.up(sequelize.getQueryInterface(), Sequelize);

    console.log('\n✅ Migración ejecutada exitosamente');
    console.log('\n📋 Campos agregados a BudgetNotes:');
    console.log('   - isRead: BOOLEAN (default: false)');
    console.log('   - readBy: ARRAY(UUID) - quiénes la leyeron');
    console.log('   - reminderDate: DATE - fecha del recordatorio');
    console.log('   - reminderFor: ARRAY(UUID) - para quiénes es el recordatorio');
    console.log('   - isReminderActive: BOOLEAN (default: false)');
    console.log('   - reminderCompletedAt: DATE - cuándo se completó\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
