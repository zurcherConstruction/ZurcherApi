/**
 * 🔄 MIGRACIÓN: CORREGIR TIPO DE DATO linkedWorkId EN SIMPLEWORK
 * 
 * Convierte linkedWorkId de VARCHAR a UUID en SimpleWork
 * Esto permite la correcta asociación con Works.idWork (UUID)
 * 
 * EJECUTAR LOCAL: node fix-simplework-linkedworkid-type.js
 * EJECUTAR PRODUCCIÓN: NODE_ENV=production node fix-simplework-linkedworkid-type.js
 */

const { conn } = require('./src/data');

async function fixLinkedWorkIdType() {
  console.log('🚀 Iniciando migración: Corregir tipo linkedWorkId en SimpleWork...\n');
  
  // Verificar entorno
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`📍 Entorno: ${isProduction ? '🔴 PRODUCCIÓN' : '🟢 DESARROLLO'}\n`);

  const transaction = await conn.transaction();

  try {
    // PASO 1: Verificar tipo actual de linkedWorkId
    console.log('🔍 PASO 1: Verificando tipo actual de SimpleWork.linkedWorkId...');
    
    const [linkedWorkColumn] = await conn.query(`
      SELECT column_name, data_type, udt_name, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'SimpleWork'
      AND column_name = 'linkedWorkId';
    `, { transaction });

    if (linkedWorkColumn.length > 0) {
      console.log(`   ℹ️  Tipo actual: ${linkedWorkColumn[0].data_type} (${linkedWorkColumn[0].udt_name})`);
      
      if (linkedWorkColumn[0].udt_name === 'varchar') {
        console.log('   → Convirtiendo de VARCHAR a UUID...');
        
        // Verificar si hay valores que no son UUIDs válidos
        const [invalidValues] = await conn.query(`
          SELECT "linkedWorkId", COUNT(*) as count
          FROM "SimpleWork"
          WHERE "linkedWorkId" IS NOT NULL
          AND "linkedWorkId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          GROUP BY "linkedWorkId";
        `, { transaction });

        if (invalidValues.length > 0) {
          console.log('\n   ⚠️  ADVERTENCIA: Se encontraron valores que no son UUIDs válidos:');
          invalidValues.forEach(row => {
            console.log(`      - "${row.linkedWorkId}" (${row.count} registro(s))`);
          });
          console.log('\n   → Limpiando valores inválidos antes de la conversión...');
          
          await conn.query(`
            UPDATE "SimpleWork"
            SET "linkedWorkId" = NULL
            WHERE "linkedWorkId" IS NOT NULL
            AND "linkedWorkId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
          `, { transaction });
          
          console.log('   ✅ Valores inválidos limpiados');
        } else {
          console.log('   ✅ Todos los valores existentes son UUIDs válidos');
        }

        // Convertir columna a UUID
        await conn.query(`
          ALTER TABLE "SimpleWork" 
          ALTER COLUMN "linkedWorkId" TYPE UUID 
          USING CASE 
            WHEN "linkedWorkId" IS NULL THEN NULL 
            ELSE "linkedWorkId"::uuid 
          END;
        `, { transaction });
        
        console.log('   ✅ SimpleWork.linkedWorkId convertido a UUID');
      } else if (linkedWorkColumn[0].udt_name === 'uuid') {
        console.log('   ✅ SimpleWork.linkedWorkId ya es UUID');
      }
    } else {
      console.log('   ⚠️  Columna linkedWorkId no existe en SimpleWork');
    }

    // PASO 2: Crear foreign key si no existe
    console.log('\n🔍 PASO 2: Verificando foreign key con Works...');
    
    try {
      await conn.query(`
        ALTER TABLE "SimpleWork"
        ADD CONSTRAINT "SimpleWork_linkedWorkId_fkey" 
        FOREIGN KEY ("linkedWorkId") 
        REFERENCES "Works"("idWork")
        ON DELETE SET NULL;
      `, { transaction });
      console.log('   ✅ Foreign key creado: SimpleWork.linkedWorkId → Works.idWork');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Foreign key ya existe');
      } else {
        throw error;
      }
    }

    // PASO 3: Verificar datos
    console.log('\n🔍 PASO 3: Verificando datos...');
    
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("linkedWorkId") as with_linked_work
      FROM "SimpleWork";
    `, { transaction });

    console.log(`   📊 SimpleWorks totales: ${stats[0].total}`);
    console.log(`   📊 Con Work vinculado: ${stats[0].with_linked_work}`);

    // COMMIT
    await transaction.commit();
    
    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('📋 Resumen de cambios:');
    console.log('   ✅ SimpleWork.linkedWorkId → UUID');
    console.log('   ✅ Foreign key verificado/creado con Works');
    console.log('   ✅ Sistema listo para asociación con Works\n');

    if (isProduction) {
      console.log('🔴 PRODUCCIÓN: Cambios aplicados en base de datos de producción');
    } else {
      console.log('🟢 DESARROLLO: Cambios aplicados en base de datos local');
    }

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Reiniciar el servidor backend');
    console.log('   2. Verificar que las consultas de SimpleWork funcionen correctamente\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error.message);
    console.error('\n📜 Stack trace:', error);
    console.error('\n⚠️  Transacción revertida. No se aplicaron cambios.\n');
    
    process.exit(1);
  } finally {
    await conn.close();
    console.log('✅ Conexión a base de datos cerrada\n');
  }
}

// Ejecutar migración
fixLinkedWorkIdType().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
