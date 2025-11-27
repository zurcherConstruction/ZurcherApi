const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function cleanConstraints() {
  try {
    console.log('\n🔍 Conectando a PostgreSQL...\n');
    await client.connect();
    console.log('✅ Conectado!\n');
    
    // Contar CONSTRAINTS duplicadas (no índices)
    const countResult = await client.query(`
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
    
    const total = parseInt(countResult.rows[0].total);
    console.log(`📊 Total CONSTRAINTS duplicadas encontradas: ${total}\n`);
    
    if (total === 0) {
      console.log('✅ No hay constraints duplicadas!\n');
      await client.end();
      return;
    }
    
    console.log('🗑️  Iniciando eliminación de constraints...');
    console.log('    (Esto puede tardar varios minutos...)\n');
    
    // Eliminar constraints usando ALTER TABLE DROP CONSTRAINT
    const result = await client.query(`
      DO $$
      DECLARE
          constraint_name_var text;
          deleted_count integer := 0;
      BEGIN
          FOR constraint_name_var IN 
              SELECT constraint_name
              FROM information_schema.table_constraints
              WHERE table_schema = 'public' 
                AND table_name = 'Permits'
                AND constraint_type = 'UNIQUE'
                AND (
                  constraint_name ~ '^Permits_permitNumber_key[0-9]+$'
                  OR constraint_name ~ '^Permits_propertyAddress_key[0-9]+$'
                )
              ORDER BY constraint_name
          LOOP
              EXECUTE 'ALTER TABLE "Permits" DROP CONSTRAINT IF EXISTS "' || constraint_name_var || '"';
              deleted_count := deleted_count + 1;
              
              IF deleted_count % 200 = 0 THEN
                  RAISE NOTICE '   Progreso: % constraints eliminadas', deleted_count;
              END IF;
          END LOOP;
          
          RAISE NOTICE '   ✅ Eliminación completada: % constraints', deleted_count;
      END $$;
    `);
    
    console.log('\n✅ Proceso completado!\n');
    
    // Verificar constraints restantes
    const verifyResult = await client.query(`
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
    
    const remaining = parseInt(verifyResult.rows[0].total);
    console.log(`📊 Constraints duplicadas restantes: ${remaining}\n`);
    
    // Listar todas las constraints finales en Permits
    const finalConstraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' 
        AND table_name = 'Permits'
      ORDER BY constraint_type, constraint_name;
    `);
    
    console.log(`✅ Constraints finales en tabla Permits (${finalConstraints.rows.length}):\n`);
    finalConstraints.rows.forEach(row => {
      console.log(`   ${row.constraint_type.padEnd(12)} - ${row.constraint_name}`);
    });
    
    // Verificar índices finales
    const finalIndexes = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits';
    `);
    
    console.log(`\n📊 Total índices en Permits: ${finalIndexes.rows[0].total}\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 ¡Limpieza completada exitosamente!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await client.end();
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nStack trace:', err.stack);
    await client.end();
    process.exit(1);
  }
}

cleanConstraints();
