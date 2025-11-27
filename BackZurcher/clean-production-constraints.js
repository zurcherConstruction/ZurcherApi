const { Client } = require('pg');
const { DB_DEPLOY } = require('./src/config/envs');

// ⚠️⚠️⚠️ ESTE SCRIPT MODIFICA LA BASE DE DATOS DE PRODUCCIÓN ⚠️⚠️⚠️
// Solo ejecutar en horario de bajo tráfico (madrugada)

const client = new Client({
  connectionString: DB_DEPLOY,
  ssl: { rejectUnauthorized: false }
});

async function cleanProductionConstraints() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔧 LIMPIEZA PRODUCCIÓN - CONSTRAINTS DUPLICADAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('🔴 CONECTANDO A BASE DE DATOS DE PRODUCCIÓN...\n');
    
    await client.connect();
    console.log('✅ Conectado a producción\n');
    
    // PASO 1: Identificar Foreign Keys
    console.log('📋 PASO 1: Identificando Foreign Keys...\n');
    
    const fks = await client.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'Works'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'Permits';
    `);
    
    console.log(`   FK encontradas: ${fks.rows.length}\n`);
    fks.rows.forEach(fk => {
      console.log(`   - ${fk.constraint_name}: Works.${fk.column_name} → Permits.${fk.foreign_column_name}`);
    });
    console.log();
    
    // PASO 2: Contar constraints duplicadas
    console.log('📊 PASO 2: Contando constraints duplicadas...\n');
    
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
    console.log(`   Total constraints duplicadas: ${total}\n`);
    
    if (total === 0) {
      console.log('✅ No hay constraints duplicadas en producción!\n');
      await client.end();
      return;
    }
    
    console.log('⚠️  CONFIRMACIÓN REQUERIDA:\n');
    console.log(`   Se van a eliminar ${total} constraints duplicadas`);
    console.log('   Este proceso tomará aproximadamente 5-10 minutos');
    console.log('   El servidor seguirá funcionando durante el proceso\n');
    console.log('   Presiona Ctrl+C para cancelar, o espera 10 segundos para continuar...\n');
    
    // Esperar 10 segundos
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // PASO 3: Eliminar FK temporalmente
    console.log('🔓 PASO 3: Eliminando Foreign Keys temporalmente...\n');
    
    for (const fk of fks.rows) {
      console.log(`   Eliminando: ${fk.constraint_name}...`);
      await client.query(`ALTER TABLE "Works" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}";`);
      console.log(`   ✓ Eliminada\n`);
    }
    
    // PASO 4: Eliminar constraints duplicadas
    console.log('🗑️  PASO 4: Eliminando constraints duplicadas...\n');
    
    await client.query(`
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
                  RAISE NOTICE 'Progreso: % constraints eliminadas', deleted_count;
              END IF;
          END LOOP;
          
          RAISE NOTICE 'Total eliminadas: % constraints', deleted_count;
      END $$;
    `);
    
    console.log('   ✓ Constraints eliminadas\n');
    
    // PASO 5: Recrear Foreign Keys
    console.log('🔒 PASO 5: Recreando Foreign Keys...\n');
    
    for (const fk of fks.rows) {
      console.log(`   Recreando: ${fk.constraint_name}...`);
      await client.query(`
        ALTER TABLE "Works" 
        ADD CONSTRAINT "${fk.constraint_name}" 
        FOREIGN KEY ("${fk.column_name}") 
        REFERENCES "Permits" ("${fk.foreign_column_name}");
      `);
      console.log(`   ✓ Recreada\n`);
    }
    
    // PASO 6: Verificación
    console.log('✅ PASO 6: Verificación final...\n');
    
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
    console.log(`   Constraints duplicadas restantes: ${remaining}`);
    
    const verifyFKs = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Works'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name IN (${fks.rows.map(fk => `'${fk.constraint_name}'`).join(', ')});
    `);
    
    console.log(`   Foreign Keys recreadas: ${verifyFKs.rows[0].total}/${fks.rows.length}\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 ¡LIMPIEZA DE PRODUCCIÓN COMPLETADA!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Eliminadas ${total - remaining} constraints duplicadas`);
    console.log('✅ Foreign Keys recreadas correctamente');
    console.log('✅ Producción optimizada\n');
    console.log('💡 Próximos pasos:');
    console.log('   1. Monitorear performance del servidor');
    console.log('   2. Ejecutar check-production-duplicates.js en 24h');
    console.log('   3. Verificar que ENABLE_DB_SYNC=false en variables de entorno\n');
    
    await client.end();
    
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\nStack:', err.stack);
    console.error('\n⚠️  ACCIÓN REQUERIDA:');
    console.error('   Si las FK no se recrearon, ejecuta recreate-fk.js en producción\n');
    await client.end();
    process.exit(1);
  }
}

cleanProductionConstraints();
