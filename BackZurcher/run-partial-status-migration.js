const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function runMigration() {
  try {
    console.log('🚀 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    const migrationPath = path.join(__dirname, 'migrations', 'add-partial-payment-status.js');
    console.log(`📁 Cargando migración: ${migrationPath}\n`);
    
    const migration = require(migrationPath);

    console.log('▶️  Ejecutando migración up()...\n');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('\n✅ Migración completada: add-partial-payment-status');

    // Verificar que el valor se agregó
    console.log('\n🔍 Verificando valores del ENUM paymentStatus...');
    const [results] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Expenses_paymentStatus'
      ORDER BY e.enumlabel;
    `);

    if (results.length > 0) {
      console.log('✅ Valores del ENUM paymentStatus:');
      results.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.enumlabel}`);
      });
    }

    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigration();
