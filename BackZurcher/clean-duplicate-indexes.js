const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_DEPLOY } = require('./src/config/envs');
const { Client } = require('pg');

// Usar la misma lógica que el servidor
const connectionString = DB_DEPLOY 
  ? DB_DEPLOY 
  : `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const client = new Client({ 
  connectionString,
  ssl: DB_DEPLOY ? { rejectUnauthorized: false } : false
});

async function cleanDuplicateIndexes() {
  try {
    console.log(`📊 Base de datos: ${DB_DEPLOY ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);
    await client.connect();
    console.log('✅ Conectado a PostgreSQL...\n');
    
    // 1. Contar índices duplicados
    console.log('🔍 Buscando índices duplicados en tabla Permits...');
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname LIKE 'Permits_permitNumber_key%'
          OR indexname LIKE 'Permits_propertyAddress_key%'
        );
    `);
    
    const totalDuplicates = parseInt(countResult.rows[0].total);
    console.log(`📋 Total de índices duplicados encontrados: ${totalDuplicates}\n`);
    
    if (totalDuplicates === 0) {
      console.log('✅ No hay índices duplicados para limpiar.');
      await client.end();
      return;
    }
    
    // 2. Obtener lista de índices a eliminar (mantener solo el principal)
    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname LIKE 'Permits_permitNumber_key%'
          OR indexname LIKE 'Permits_propertyAddress_key%'
        )
        AND indexname NOT IN (
          'Permits_permitNumber_unique',
          'idx_permits_property_address'
        )
      ORDER BY indexname;
    `);
    
    const indexesToDrop = indexesResult.rows;
    console.log(`🗑️  Índices a eliminar: ${indexesToDrop.length}\n`);
    
    if (indexesToDrop.length === 0) {
      console.log('✅ Solo existen los índices necesarios.');
      await client.end();
      return;
    }
    
    // 3. Confirmar antes de eliminar
    console.log('⚠️  Esta operación eliminará los siguientes índices:');
    indexesToDrop.slice(0, 10).forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    if (indexesToDrop.length > 10) {
      console.log(`   ... y ${indexesToDrop.length - 10} más\n`);
    }
    
    console.log('🚀 Iniciando limpieza de índices duplicados...\n');
    
    // 4. Eliminar índices duplicados
    let deleted = 0;
    let errors = 0;
    
    for (const index of indexesToDrop) {
      try {
        await client.query(`DROP INDEX IF EXISTS "${index.indexname}";`);
        deleted++;
        
        // Mostrar progreso cada 50 índices
        if (deleted % 50 === 0) {
          console.log(`   ✓ Eliminados: ${deleted}/${indexesToDrop.length}`);
        }
      } catch (err) {
        console.error(`   ❌ Error eliminando ${index.indexname}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n✅ Limpieza completada!');
    console.log(`   📊 Eliminados: ${deleted}`);
    console.log(`   ❌ Errores: ${errors}\n`);
    
    // 5. Verificar índices restantes
    const remainingResult = await client.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname LIKE '%permit%'
          OR indexname LIKE '%property%'
        )
      ORDER BY indexname;
    `);
    
    console.log('📋 Índices restantes en Permits:');
    remainingResult.rows.forEach(idx => {
      console.log(`   ✓ ${idx.indexname}`);
    });
    
    console.log('\n🎉 ¡Índices duplicados eliminados exitosamente!');
    console.log('💡 Reinicia el servidor para que los cambios surtan efecto completo.');
    
    await client.end();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

cleanDuplicateIndexes();
