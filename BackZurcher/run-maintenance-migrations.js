// Script para ejecutar las migraciones de mantenimiento
const { sequelize, Sequelize } = require('./src/data');

async function runMaintenanceMigrations() {
  console.log('\n🚀 Ejecutando migraciones de mantenimiento...\n');

  try {
    const conn = sequelize;
    const queryInterface = conn.getQueryInterface();

    // Migración 1: Agregar campos del formulario a MaintenanceVisits
    console.log('📝 Ejecutando: add-maintenance-form-fields.js');
    const migration1 = require('./src/data/migrations/20250116-add-maintenance-form-fields');
    await migration1.up(queryInterface, Sequelize);
    console.log('✅ Migración 1 completada: campos del formulario agregados\n');

    // Migración 2: Agregar campo fieldName a MaintenanceMedia
    console.log('📝 Ejecutando: add-fieldname-to-maintenance-media.js');
    const migration2 = require('./src/data/migrations/20250116-add-fieldname-to-maintenance-media');
    await migration2.up(queryInterface, Sequelize);
    console.log('✅ Migración 2 completada: campo fieldName agregado\n');

    console.log('🎉 Todas las migraciones de mantenimiento completadas exitosamente!\n');
    
    // Mostrar estructura actualizada
    console.log('📊 Verificando estructura de MaintenanceVisits...');
    const [columns] = await conn.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'MaintenanceVisits'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Columnas de MaintenanceVisits:');
    const newColumns = columns.filter(col => 
      ['level_inlet', 'level_outlet', 'strong_odors', 'needs_pumping', 
       'blower_working', 'alarm_panel_working', 'well_samples', 
       'general_notes', 'signature_url', 'completed_by_staff_id'].includes(col.column_name)
    );
    
    if (newColumns.length > 0) {
      newColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('  ⚠️  No se encontraron las nuevas columnas. Puede que ya existieran.');
    }

    await conn.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  }
}

runMaintenanceMigrations();
