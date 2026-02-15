/**
 * 🔄 MIGRACIÓN: CORREGIR TIPO DE DATO createdBy EN SIMPLEWORK TABLES
 * 
 * Convierte createdBy de INTEGER a UUID en:
 * - SimpleWorkPayment
 * - SimpleWorkExpense
 * 
 * Esto permite la correcta asociación con Staff.id (UUID)
 * 
 * EJECUTAR LOCAL: node fix-simplework-createdby-type.js
 * EJECUTAR PRODUCCIÓN: NODE_ENV=production node fix-simplework-createdby-type.js
 */

const { conn } = require('./src/data');

async function fixCreatedByType() {
  console.log('🚀 Iniciando migración: Corregir tipo createdBy en SimpleWork tables...\n');
  
  // Verificar entorno
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`📍 Entorno: ${isProduction ? '🔴 PRODUCCIÓN' : '🟢 DESARROLLO'}\n`);

  const transaction = await conn.transaction();

  try {
    // PASO 1: Verificar tipo actual de SimpleWorkPayment.createdBy
    console.log('🔍 PASO 1: Verificando tipo actual de SimpleWorkPayment.createdBy...');
    
    const [paymentColumn] = await conn.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'SimpleWorkPayment'
      AND column_name = 'createdBy';
    `, { transaction });

    if (paymentColumn.length > 0) {
      console.log(`   ℹ️  Tipo actual: ${paymentColumn[0].data_type} (${paymentColumn[0].udt_name})`);
      
      if (paymentColumn[0].udt_name === 'int4') {
        console.log('   → Convirtiendo de INTEGER a UUID...');
        
        // Convertir columna a UUID
        await conn.query(`
          ALTER TABLE "SimpleWorkPayment" 
          ALTER COLUMN "createdBy" TYPE UUID 
          USING "createdBy"::text::uuid;
        `, { transaction });
        
        console.log('   ✅ SimpleWorkPayment.createdBy convertido a UUID');
      } else if (paymentColumn[0].udt_name === 'uuid') {
        console.log('   ✅ SimpleWorkPayment.createdBy ya es UUID');
      }
    } else {
      console.log('   ⚠️  Columna createdBy no existe en SimpleWorkPayment');
    }

    // PASO 2: Verificar tipo actual de SimpleWorkExpense.createdBy
    console.log('\n🔍 PASO 2: Verificando tipo actual de SimpleWorkExpense.createdBy...');
    
    const [expenseColumn] = await conn.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'SimpleWorkExpense'
      AND column_name = 'createdBy';
    `, { transaction });

    if (expenseColumn.length > 0) {
      console.log(`   ℹ️  Tipo actual: ${expenseColumn[0].data_type} (${expenseColumn[0].udt_name})`);
      
      if (expenseColumn[0].udt_name === 'int4') {
        console.log('   → Convirtiendo de INTEGER a UUID...');
        
        // Convertir columna a UUID
        await conn.query(`
          ALTER TABLE "SimpleWorkExpense" 
          ALTER COLUMN "createdBy" TYPE UUID 
          USING "createdBy"::text::uuid;
        `, { transaction });
        
        console.log('   ✅ SimpleWorkExpense.createdBy convertido a UUID');
      } else if (expenseColumn[0].udt_name === 'uuid') {
        console.log('   ✅ SimpleWorkExpense.createdBy ya es UUID');
      }
    } else {
      console.log('   ⚠️  Columna createdBy no existe en SimpleWorkExpense');
    }

    // PASO 3: Crear foreign keys si no existen
    console.log('\n🔍 PASO 3: Verificando foreign keys...');
    
    try {
      await conn.query(`
        ALTER TABLE "SimpleWorkPayment"
        ADD CONSTRAINT "SimpleWorkPayment_createdBy_fkey" 
        FOREIGN KEY ("createdBy") 
        REFERENCES "Staffs"(id)
        ON DELETE SET NULL;
      `, { transaction });
      console.log('   ✅ Foreign key creado en SimpleWorkPayment.createdBy');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Foreign key ya existe en SimpleWorkPayment.createdBy');
      } else {
        throw error;
      }
    }

    try {
      await conn.query(`
        ALTER TABLE "SimpleWorkExpense"
        ADD CONSTRAINT "SimpleWorkExpense_createdBy_fkey" 
        FOREIGN KEY ("createdBy") 
        REFERENCES "Staffs"(id)
        ON DELETE SET NULL;
      `, { transaction });
      console.log('   ✅ Foreign key creado en SimpleWorkExpense.createdBy');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ℹ️  Foreign key ya existe en SimpleWorkExpense.createdBy');
      } else {
        throw error;
      }
    }

    // COMMIT
    await transaction.commit();
    
    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('📋 Resumen de cambios:');
    console.log('   ✅ SimpleWorkPayment.createdBy → UUID');
    console.log('   ✅ SimpleWorkExpense.createdBy → UUID');
    console.log('   ✅ Foreign keys verificados/creados');
    console.log('   ✅ Sistema listo para asociaciones con Staff\n');

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
    
    console.log('⚠️  NOTA: Si los datos en createdBy no son UUIDs válidos, la conversión fallará.');
    console.log('   En ese caso, puedes limpiar primero con:');
    console.log(`
      UPDATE "SimpleWorkPayment" SET "createdBy" = NULL WHERE "createdBy" IS NOT NULL;
      UPDATE "SimpleWorkExpense" SET "createdBy" = NULL WHERE "createdBy" IS NOT NULL;
    `);
    
    process.exit(1);
  } finally {
    await conn.close();
    console.log('✅ Conexión a base de datos cerrada\n');
  }
}

// Ejecutar migración
fixCreatedByType().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
