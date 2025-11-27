const { Client } = require('pg');

// ⚠️ REEMPLAZA ESTO con tu connection string de Railway/Render
const PRODUCTION_CONNECTION_STRING = 'postgresql://usuario:password@host:puerto/database';

const client = new Client({
  connectionString: PRODUCTION_CONNECTION_STRING,
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
      console.log(`🔴 ${duplicates} constraints duplicadas en PRODUCCIÓN\n`);
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
      
      console.log('\n📋 Recomendación: Ejecutar limpieza en horario de bajo tráfico\n');
    } else {
      console.log('✅ No hay constraints duplicadas en producción\n');
      console.log('📊 Estado: ÓPTIMO\n');
    }
    
    // Contar índices
    const indexes = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits';
    `);
    
    console.log(`🔑 Total índices en Permits: ${indexes.rows[0].total}`);
    
    // Contar UNIQUE constraints
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
    
  } catch (err) {
    console.error('\n❌ Error al conectar a producción:', err.message);
    console.error('\n💡 Verifica que el connection string sea correcto\n');
    await client.end();
    process.exit(1);
  }
}

checkProductionDuplicates();
