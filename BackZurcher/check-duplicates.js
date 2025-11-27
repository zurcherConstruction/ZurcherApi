const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function checkDuplicates() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' 
        AND table_name = 'Permits'
        AND constraint_type = 'UNIQUE'
        AND (
          constraint_name ~ '^Permits_permitNumber_key[0-9]+$'
          OR constraint_name ~ '^Permits_propertyAddress_key[0-9]+$'
        );
    `);
    
    const duplicates = parseInt(result.rows[0].total);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICACIÓN DE CONSTRAINTS DUPLICADAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (duplicates > 0) {
      console.log(`⚠️  ALERTA: ${duplicates} constraints duplicadas detectadas!\n`);
      console.log('📋 Acciones recomendadas:');
      console.log('   1. Verificar que DB_SYNC_ALTER=false en .env');
      console.log('   2. Ejecutar: node clean-constraints-safe.js');
      console.log('   3. Investigar qué causó la duplicación\n');
    } else {
      console.log('✅ No hay constraints duplicadas\n');
      console.log('📊 Estado de la base de datos: ÓPTIMO\n');
    }
    
    // Verificar configuración actual
    const syncAlter = process.env.DB_SYNC_ALTER;
    const enableSync = process.env.ENABLE_DB_SYNC;
    
    console.log('⚙️  Configuración actual:');
    console.log(`   DB_SYNC_ALTER: ${syncAlter || 'no definido'}`);
    console.log(`   ENABLE_DB_SYNC: ${enableSync || 'no definido'}\n`);
    
    if (syncAlter === 'true' || enableSync === 'true') {
      console.log('⚠️  ADVERTENCIA: DB_SYNC está activado');
      console.log('   Esto puede crear duplicados en cada reinicio');
      console.log('   Recomendación: Cambiar a false en .env\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await client.end();
    process.exit(duplicates > 0 ? 1 : 0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

checkDuplicates();
