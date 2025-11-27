const { Client } = require('pg');
const { DB_DEPLOY } = require('./src/config/envs');

// ⚠️ Este script se conecta a PRODUCCIÓN
// Solo ejecutar cuando quieras verificar la BD de producción

const client = new Client({
  connectionString: DB_DEPLOY,
  ssl: { rejectUnauthorized: false }
});

async function checkProductionDuplicates() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICACIÓN PRODUCCIÓN - CONSTRAINTS DUPLICADAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('⚠️  Conectando a BASE DE DATOS DE PRODUCCIÓN...\n');
    
    await client.connect();
    console.log('✅ Conectado a producción\n');
    
    // Contar duplicados
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
    
    console.log('📊 RESULTADOS:\n');
    
    if (duplicates > 0) {
      console.log(`🔴 CRÍTICO: ${duplicates} constraints duplicadas en PRODUCCIÓN\n`);
      console.log('📋 Estimación del impacto:');
      
      if (duplicates < 100) {
        console.log('   Impacto: BAJO - Performance levemente afectado');
      } else if (duplicates < 1000) {
        console.log('   Impacto: MEDIO - Performance notablemente afectado');
      } else if (duplicates < 3000) {
        console.log('   Impacto: ALTO - Performance severamente afectado');
      } else {
        console.log('   Impacto: CRÍTICO - Performance extremadamente afectado');
      }
      
      console.log('\n📋 Acciones recomendadas:');
      console.log('   1. Agregar variables en producción:');
      console.log('      DB_SYNC_ALTER=false');
      console.log('      ENABLE_DB_SYNC=false');
      console.log('   2. Programar mantenimiento en horario de bajo tráfico');
      console.log('   3. Ejecutar clean-constraints-safe.js en producción');
      console.log('   4. Verificar que no se vuelvan a crear\n');
    } else {
      console.log('✅ No hay constraints duplicadas en producción\n');
      console.log('📊 Estado: ÓPTIMO\n');
    }
    
    // Contar total de índices
    const indexes = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits';
    `);
    
    console.log(`🔑 Total índices en Permits: ${indexes.rows[0].total}`);
    
    // Contar constraints UNIQUE
    const uniques = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' 
        AND table_name = 'Permits'
        AND constraint_type = 'UNIQUE';
    `);
    
    console.log(`🔒 Total constraints UNIQUE: ${uniques.rows[0].total}\n`);
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await client.end();
    process.exit(duplicates > 0 ? 1 : 0);
    
  } catch (err) {
    console.error('\n❌ Error al conectar a producción:', err.message);
    console.error('\n💡 Verifica:');
    console.error('   - Variable DB_DEPLOY está configurada correctamente');
    console.error('   - Tienes acceso a la base de datos de producción');
    console.error('   - La conexión SSL está permitida\n');
    await client.end();
    process.exit(1);
  }
}

checkProductionDuplicates();
