const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuración de la base de datos
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

    // Importar la migración
    const migrationPath = path.join(__dirname, 'migrations', 'add-paid-amount-to-expenses.js');
    console.log(`📁 Cargando migración: ${migrationPath}\n`);
    
    const migration = require(migrationPath);

    // Ejecutar la migración
    console.log('▶️  Ejecutando migración up()...\n');
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('\n✅ Migración completada: add-paid-amount-to-expenses');

    // Verificar que el campo se agregó correctamente
    console.log('\n🔍 Verificando el campo paidAmount...');
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Expenses'
      AND column_name = 'paidAmount';
    `);

    if (results.length > 0) {
      console.log('✅ Campo paidAmount confirmado:');
      console.log(`   - Tipo: ${results[0].data_type}`);
      console.log(`   - Default: ${results[0].column_default}`);
    } else {
      console.log('❌ Campo paidAmount NO encontrado');
    }

    // Verificar algunos registros actualizados
    console.log('\n🔍 Verificando registros actualizados...');
    const [expenses] = await sequelize.query(`
      SELECT "idExpense", amount, "paymentStatus", "paidAmount", "paymentMethod"
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      LIMIT 5;
    `);

    if (expenses.length > 0) {
      console.log(`✅ ${expenses.length} registros encontrados con Chase Credit Card:`);
      expenses.forEach((exp, idx) => {
        console.log(`   ${idx + 1}. Status: ${exp.paymentStatus}, Amount: $${exp.amount}, Paid: $${exp.paidAmount || 0}`);
      });
    } else {
      console.log('ℹ️  No hay registros con Chase Credit Card aún');
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
