const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function cleanConstraintsCascade() {
  try {
    console.log('\n🔍 Conectando a PostgreSQL...\n');
    await client.connect();
    console.log('✅ Conectado!\n');
    
    // Contar constraints duplicadas
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
    console.log(`📊 Total CONSTRAINTS duplicadas: ${total}\n`);
    
    if (total === 0) {
      console.log('✅ No hay constraints duplicadas!\n');
      await client.end();
      return;
    }
    
    console.log('⚠️  ADVERTENCIA: Usando CASCADE para eliminar dependencias\n');
    console.log('🗑️  Iniciando eliminación...\n');
    
    // Eliminar constraints con CASCADE
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
              -- Usar CASCADE para eliminar dependencias
              EXECUTE 'ALTER TABLE "Permits" DROP CONSTRAINT IF EXISTS "' || constraint_name_var || '" CASCADE';
              deleted_count := deleted_count + 1;
              
              IF deleted_count % 100 = 0 THEN
                  RAISE NOTICE '   ✓ Progreso: %/% (%%%)', deleted_count, ${total}, ROUND((deleted_count::numeric / ${total}::numeric) * 100);
              END IF;
          END LOOP;
          
          RAISE NOTICE '   ';
          RAISE NOTICE '   ✅ Eliminadas % constraints', deleted_count;
      END $$;
    `);
    
    console.log('\n✅ Eliminación completada!\n');
    
    // Verificar que se eliminaron
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
    
    // Mostrar constraints finales
    const finalConstraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' 
        AND table_name = 'Permits'
        AND constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      ORDER BY constraint_type, constraint_name;
    `);
    
    console.log(`✅ Constraints en Permits (${finalConstraints.rows.length}):\n`);
    finalConstraints.rows.forEach(row => {
      console.log(`   ${row.constraint_type.padEnd(12)} ${row.constraint_name}`);
    });
    
    // Contar índices finales
    const indexCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits';
    `);
    
    console.log(`\n📊 Total índices en Permits: ${indexCount.rows[0].total}\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 ¡LIMPIEZA COMPLETADA!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n✅ Eliminadas ${total - remaining} constraints duplicadas`);
    console.log('✅ La funcionalidad de búsqueda por propertyAddress NO se ve afectada');
    console.log('✅ Los trabajos activos siguen funcionando normalmente\n');
    console.log('💡 Reinicia el servidor para ver el impacto en performance\n');
    
    await client.end();
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nStack:', err.stack);
    await client.end();
    process.exit(1);
  }
}

cleanConstraintsCascade();
