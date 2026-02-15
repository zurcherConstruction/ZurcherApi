/**
 * 🔄 MIGRACIÓN: ELIMINAR 'Materiales SimpleWork' DEL ENUM
 * 
 * Simplifica la integración de SimpleWork con gastos:
 * - Elimina el tipo redundante 'Materiales SimpleWork' del ENUM typeExpense
 * - Mantiene el enfoque de usar simpleWorkId para vincular cualquier tipo de gasto
 * 
 * EJECUTAR LOCAL: node remove-materiales-simplework-from-enum.js
 * EJECUTAR PRODUCCIÓN: NODE_ENV=production node remove-materiales-simplework-from-enum.js
 * 
 * ⚠️ IMPORTANTE: Esta migración es irreversible sin un rollback manual
 */

const { conn } = require('./src/data');

async function removeMaterialesSimpleWorkFromEnum() {
  console.log('🚀 Iniciando migración: Eliminar "Materiales SimpleWork" del ENUM...\n');
  
  // Verificar entorno
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`📍 Entorno: ${isProduction ? '🔴 PRODUCCIÓN' : '🟢 DESARROLLO'}\n`);

  const transaction = await conn.transaction();

  try {
    // PASO 0: Verificar si el tipo 'Materiales SimpleWork' existe en el ENUM
    console.log('🔍 PASO 0: Verificando si el tipo existe en el ENUM...');
    
    const [existingEnumValues] = await conn.query(`
      SELECT e.enumlabel AS enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'enum_Expenses_typeExpense'
      ORDER BY e.enumsortorder;
    `, { transaction });

    const hasMaterialesSimpleWork = existingEnumValues.some(row => row.enum_value === 'Materiales SimpleWork');

    if (!hasMaterialesSimpleWork) {
      console.log('   ✅ El tipo "Materiales SimpleWork" NO existe en el ENUM');
      console.log('   ℹ️  No hay nada que eliminar. El ENUM ya está limpio.\n');
      
      console.log('   📋 Valores actuales del ENUM:');
      existingEnumValues.forEach((ev, idx) => {
        console.log(`      ${idx + 1}. ${ev.enum_value}`);
      });
      
      await transaction.commit();
      
      console.log('\n✅ MIGRACIÓN NO NECESARIA\n');
      console.log('📋 Resumen:');
      console.log('   ✅ El tipo "Materiales SimpleWork" nunca existió en la base de datos');
      console.log('   ✅ Solo estaba definido en el modelo Sequelize');
      console.log('   ✅ El ENUM está correcto, no requiere cambios\n');
      
      if (isProduction) {
        console.log('🔴 PRODUCCIÓN: No se requieren cambios');
      } else {
        console.log('🟢 DESARROLLO: No se requieren cambios');
      }
      
      await conn.close();
      console.log('\n✅ Conexión a base de datos cerrada\n');
      process.exit(0);
    }

    console.log('   ⚠️  El tipo "Materiales SimpleWork" SÍ existe en el ENUM. Procediendo con eliminación...\n');

    // PASO 1: Verificar si hay gastos usando este tipo
    console.log('🔍 PASO 1: Verificando gastos existentes con tipo "Materiales SimpleWork"...');
    
    const [existingExpenses] = await conn.query(`
      SELECT 
        "idExpense", 
        "typeExpense", 
        notes, 
        amount,
        "simpleWorkId",
        "createdAt"
      FROM "Expenses"
      WHERE "typeExpense" = 'Materiales SimpleWork';
    `, { transaction });

    if (existingExpenses.length > 0) {
      console.log(`\n⚠️  Se encontraron ${existingExpenses.length} gasto(s) con tipo "Materiales SimpleWork":`);
      existingExpenses.forEach(exp => {
        console.log(`   - ID: ${exp.idExpense}, Monto: $${exp.amount}, Notas: ${exp.notes || 'N/A'}`);
      });

      // PASO 2: Actualizar gastos existentes a 'Materiales'
      console.log('\n🔧 PASO 2: Actualizando gastos existentes a tipo "Materiales"...');
      
      await conn.query(`
        UPDATE "Expenses"
        SET "typeExpense" = 'Materiales'
        WHERE "typeExpense" = 'Materiales SimpleWork';
      `, { transaction });

      console.log(`✅ ${existingExpenses.length} gasto(s) actualizado(s) correctamente a tipo "Materiales"`);
    } else {
      console.log('✅ No hay gastos usando "Materiales SimpleWork". Procediendo con la migración...');
    }

    // PASO 3: Modificar el ENUM para eliminar 'Materiales SimpleWork'
    console.log('\n🔧 PASO 3: Modificando ENUM "expense_type"...');
    console.log('   📝 PostgreSQL no permite eliminar valores de ENUM directamente.');
    console.log('   📝 Creando nuevo ENUM sin "Materiales SimpleWork" y reemplazando...\n');

    // 3.1 Crear nuevo tipo ENUM sin 'Materiales SimpleWork'
    console.log('   → Creando expense_type_new...');
    await conn.query(`
      CREATE TYPE expense_type_new AS ENUM (
        'Materiales',
        'Diseño',
        'Workers',
        'Fee de Inspección',
        'Gastos Generales',
        'Sub Contractor',
        'Comisión del Vendedor',
        'Waste Removal',
        'Gastos de Viaje',
        'Invoice de Proveedoores',
        'Gasto Fijo'
      );
    `, { transaction });
    console.log('   ✅ expense_type_new creado');

    // 3.2 Actualizar la columna para usar el nuevo tipo
    console.log('   → Actualizando columna "typeExpense" a nuevo tipo...');
    await conn.query(`
      ALTER TABLE "Expenses" 
        ALTER COLUMN "typeExpense" TYPE expense_type_new 
        USING "typeExpense"::text::expense_type_new;
    `, { transaction });
    console.log('   ✅ Columna actualizada');

    // 3.3 Renombrar tipos
    console.log('   → Renombrando tipos...');
    await conn.query(`ALTER TYPE expense_type RENAME TO expense_type_old;`, { transaction });
    await conn.query(`ALTER TYPE expense_type_new RENAME TO expense_type;`, { transaction });
    console.log('   ✅ Tipos renombrados');

    // 3.4 Eliminar tipo antiguo
    console.log('   → Eliminando tipo antiguo...');
    await conn.query(`DROP TYPE expense_type_old;`, { transaction });
    console.log('   ✅ Tipo antiguo eliminado');

    // PASO 4: Verificar los cambios
    console.log('\n🔍 PASO 4: Verificando cambios...');
    
    // Verificar valores del ENUM
    const [enumValues] = await conn.query(`
      SELECT 
        e.enumlabel AS enum_value,
        e.enumsortorder AS sort_order
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'expense_type'
      ORDER BY e.enumsortorder;
    `, { transaction });

    console.log('\n   📋 Valores actuales del ENUM expense_type:');
    enumValues.forEach((ev, idx) => {
      console.log(`      ${idx + 1}. ${ev.enum_value}`);
    });

    // Verificar que no queden gastos con el tipo eliminado
    const [remainingCount] = await conn.query(`
      SELECT COUNT(*) as count
      FROM "Expenses"
      WHERE "typeExpense"::text = 'Materiales SimpleWork';
    `, { transaction });

    if (remainingCount[0].count > 0) {
      throw new Error(`❌ Aún existen ${remainingCount[0].count} gasto(s) con tipo "Materiales SimpleWork"`);
    }

    console.log('   ✅ No hay gastos con tipo "Materiales SimpleWork"');

    // Verificar gastos con simpleWorkId
    const [simpleWorkExpenses] = await conn.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM "Expenses"
      WHERE "simpleWorkId" IS NOT NULL;
    `, { transaction });

    if (simpleWorkExpenses[0].count > 0) {
      console.log(`\n   📊 Gastos vinculados a SimpleWorks (usando simpleWorkId):`);
      console.log(`      • Total: ${simpleWorkExpenses[0].count} gasto(s)`);
      console.log(`      • Monto: $${parseFloat(simpleWorkExpenses[0].total_amount || 0).toFixed(2)}`);
    }

    // COMMIT
    await transaction.commit();
    
    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('📋 Resumen de cambios:');
    console.log('   ✅ Tipo "Materiales SimpleWork" eliminado del ENUM');
    console.log('   ✅ Gastos existentes migrados a tipo "Materiales"');
    console.log('   ✅ Sistema ahora usa simpleWorkId para vincular gastos a SimpleWorks');
    console.log('   ✅ Cualquier tipo de gasto puede vincularse a SimpleWork\n');

    if (isProduction) {
      console.log('🔴 PRODUCCIÓN: Cambios aplicados en base de datos de producción');
    } else {
      console.log('🟢 DESARROLLO: Cambios aplicados en base de datos local');
    }

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Verificar que el frontend funcione correctamente');
    console.log('   2. Probar creación de gastos vinculados a SimpleWork');
    console.log('   3. Si todo funciona, los cambios están completos\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error.message);
    console.error('\n📜 Stack trace:', error);
    console.error('\n⚠️  Transacción revertida. No se aplicaron cambios.\n');
    
    console.log('🔧 ROLLBACK MANUAL (si es necesario):');
    console.log(`
      Si necesitas restaurar el tipo eliminado, ejecuta en PostgreSQL:
      
      BEGIN;
      
      CREATE TYPE expense_type_new AS ENUM (
        'Materiales',
        'Diseño',
        'Workers',
        'Fee de Inspección',
        'Gastos Generales',
        'Sub Contractor',
        'Comisión del Vendedor',
        'Waste Removal',
        'Gastos de Viaje',
        'Invoice de Proveedoores',
        'Materiales SimpleWork',
        'Gasto Fijo'
      );
      
      ALTER TABLE "Expenses" 
        ALTER COLUMN "typeExpense" TYPE expense_type_new 
        USING "typeExpense"::text::expense_type_new;
      
      ALTER TYPE expense_type RENAME TO expense_type_old;
      ALTER TYPE expense_type_new RENAME TO expense_type;
      DROP TYPE expense_type_old;
      
      COMMIT;
    `);
    
    process.exit(1);
  } finally {
    await conn.close();
    console.log('✅ Conexión a base de datos cerrada\n');
  }
}

// Ejecutar migración
removeMaterialesSimpleWorkFromEnum().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
