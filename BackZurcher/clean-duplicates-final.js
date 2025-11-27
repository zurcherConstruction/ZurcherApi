const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');
const { Client } = require('pg');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function cleanDuplicates() {
  try {
    console.log('\n🔍 Conectando a PostgreSQL LOCAL...\n');
    await client.connect();
    console.log('✅ Conectado!\n');
    
    console.log('🔍 Buscando índices duplicados (con números)...\n');
    
    // Buscar SOLO los índices con números (key1, key2, key3...)
    // NO tocar: Permits_permitNumber_key, Permits_propertyAddress_key (sin números)
    const result = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname ~ '^Permits_permitNumber_key[0-9]+$'
          OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
        )
      ORDER BY indexname;
    `);
    
    const duplicates = result.rows;
    console.log(`📊 Total índices duplicados: ${duplicates.length}\n`);
    
    if (duplicates.length === 0) {
      console.log('✅ No hay índices duplicados para limpiar\n');
      await client.end();
      return;
    }
    
    console.log('🗑️  Eliminando índices duplicados...');
    console.log('    (Mostrando progreso cada 100 índices)\n');
    
    let deleted = 0;
    let errors = 0;
    
    for (let i = 0; i < duplicates.length; i++) {
      const idx = duplicates[i];
      try {
        await client.query(`DROP INDEX IF EXISTS "${idx.indexname}";`);
        deleted++;
        
        if (deleted % 100 === 0 || deleted === duplicates.length) {
          console.log(`   📊 ${deleted}/${duplicates.length} (${Math.round(deleted/duplicates.length*100)}%)`);
        }
      } catch (err) {
        errors++;
        console.error(`   ❌ Error: ${idx.indexname}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}\n`);
    
    // Verificar índices restantes
    const remaining = await client.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
      ORDER BY indexname;
    `);
    
    console.log(`📋 Índices restantes (${remaining.rows.length}):\n`);
    remaining.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });
    console.log();
    
    await client.end();
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

cleanDuplicates();
