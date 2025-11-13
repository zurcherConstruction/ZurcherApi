/**
 * Script para ejecutar la migración de legacy_maintenance status
 * 
 * USO: node run-migration-legacy-status.js
 */

require('dotenv').config();
const { sequelize } = require('./src/data');

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración: Add legacy_maintenance status to Budget\n');

    const migration = require('./migrations/20241110-add-legacy-maintenance-status.js');
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📝 Verificación:');
    console.log('   Ejecuta en SQL: SELECT unnest(enum_range(NULL::enum_Budgets_status));');
    console.log('   Debe mostrar "legacy_maintenance" en la lista\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en migración:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n✅ El status "legacy_maintenance" ya existe en la base de datos.');
      console.log('   No es necesario ejecutar la migración nuevamente.\n');
      process.exit(0);
    }
    
    console.error(error);
    process.exit(1);
  }
}

runMigration();
