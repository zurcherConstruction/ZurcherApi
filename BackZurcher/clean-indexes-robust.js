const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function cleanIndexesRobust() {
  try {
    console.log('\n🔍 Conectando a PostgreSQL...\n');
    await client.connect();
    console.log('✅ Conectado!\n');
    
    // Contar índices duplicados
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname ~ '^Permits_permitNumber_key[0-9]+$'
          OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
        );
    `);
    
    const total = parseInt(countResult.rows[0].total);
    console.log(`📊 Total índices duplicados encontrados: ${total}\n`);
    
    if (total === 0) {
      console.log('✅ No hay índices duplicados!\n');
      await client.end();
      return;
    }
    
    console.log('🗑️  Iniciando eliminación masiva...\n');
    
    // Eliminar todos de una vez usando DO block de PostgreSQL
    const result = await client.query(`
      DO $$
      DECLARE
          idx_name text;
          deleted_count integer := 0;
      BEGIN
          FOR idx_name IN 
              SELECT indexname 
              FROM pg_indexes 
              WHERE schemaname = 'public' 
                AND tablename = 'Permits'
                AND (
                  indexname ~ '^Permits_permitNumber_key[0-9]+$'
                  OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
                )
              ORDER BY indexname
          LOOP
              EXECUTE 'DROP INDEX IF EXISTS "' || idx_name || '"';
              deleted_count := deleted_count + 1;
              
              IF deleted_count % 200 = 0 THEN
                  RAISE NOTICE 'Progreso: % índices eliminados', deleted_count;
              END IF;
          END LOOP;
          
          RAISE NOTICE 'Eliminación completada: % índices', deleted_count;
      END $$;
    `);
    
    console.log('✅ Eliminación completada!\n');
    
    // Verificar que ya no existen duplicados
    const verifyResult = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname ~ '^Permits_permitNumber_key[0-9]+$'
          OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
        );
    `);
    
    const remaining = parseInt(verifyResult.rows[0].total);
    console.log(`📊 Índices duplicados restantes: ${remaining}\n`);
    
    // Listar índices finales
    const finalIndexes = await client.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
      ORDER BY indexname;
    `);
    
    console.log(`✅ Índices finales en Permits (${finalIndexes.rows.length}):\n`);
    finalIndexes.rows.forEach(row => {
      console.log(`   ${row.indexname}`);
    });
    console.log();
    
    await client.end();
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    await client.end();
    process.exit(1);
  }
}

cleanIndexesRobust();
