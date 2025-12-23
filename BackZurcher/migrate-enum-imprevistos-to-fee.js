const { sequelize } = require('./src/data');

/**
 * Script para actualizar ENUMs de PostgreSQL
 * Cambia 'Imprevistos' por 'Fee de Inspección' en todos los ENUMs
 */

async function updateEnums() {
  try {
    console.log('🔄 === ACTUALIZACIÓN DE ENUMs POSTGRESQL ===\n');
    
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    console.log('1. 🔍 Verificando ENUMs existentes...');
    
    // Ver los ENUMs actuales
    const [currentEnums] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'enum_Expenses_typeExpense'
      )
      ORDER BY enumlabel;
    `);
    
    console.log('   📋 ENUM actual enum_Expenses_typeExpense:');
    currentEnums.forEach(e => console.log(`      - ${e.enumlabel}`));
    console.log('');

    // 2. Actualizar ENUM de Expenses
    console.log('2. 🛠️ Actualizando ENUM enum_Expenses_typeExpense...');
    
    // Agregar el nuevo valor si no existe
    try {
      await sequelize.query(`
        ALTER TYPE "enum_Expenses_typeExpense" 
        ADD VALUE 'Fee de Inspección';
      `);
      console.log('   ✅ Agregado "Fee de Inspección" al ENUM');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ "Fee de Inspección" ya existe en el ENUM');
      } else {
        throw error;
      }
    }

    // 3. Actualizar registros existentes
    console.log('\n3. 📝 Actualizando registros existentes...');
    
    const [updateResult] = await sequelize.query(`
      UPDATE "Expenses" 
      SET "typeExpense" = 'Fee de Inspección' 
      WHERE "typeExpense" = 'Imprevistos'
      RETURNING "idExpense";
    `);
    
    console.log(`   ✅ ${updateResult.length} registros actualizados en Expenses`);

    // 4. Actualizar ENUM de Receipts
    console.log('\n4. 🛠️ Actualizando ENUM enum_Receipts_type...');
    
    try {
      await sequelize.query(`
        ALTER TYPE "enum_Receipts_type" 
        ADD VALUE 'Fee de Inspección';
      `);
      console.log('   ✅ Agregado "Fee de Inspección" al ENUM de Receipts');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ "Fee de Inspección" ya existe en el ENUM de Receipts');
      } else {
        throw error;
      }
    }

    // 5. Actualizar registros de Receipts
    const [receiptsUpdateResult] = await sequelize.query(`
      UPDATE "Receipts" 
      SET "type" = 'Fee de Inspección' 
      WHERE "type" = 'Imprevistos'
      RETURNING "idReceipt";
    `);
    
    console.log(`   ✅ ${receiptsUpdateResult.length} registros actualizados en Receipts`);

    // 6. Actualizar ENUM de SupplierInvoiceItems
    console.log('\n5. 🛠️ Actualizando ENUM enum_SupplierInvoiceItems_category...');
    
    try {
      await sequelize.query(`
        ALTER TYPE "enum_SupplierInvoiceItems_category" 
        ADD VALUE 'Fee de Inspección';
      `);
      console.log('   ✅ Agregado "Fee de Inspección" al ENUM de SupplierInvoiceItems');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ "Fee de Inspección" ya existe en el ENUM de SupplierInvoiceItems');
      } else {
        throw error;
      }
    }

    // 7. Actualizar registros de SupplierInvoiceItems
    const [supplierUpdateResult] = await sequelize.query(`
      UPDATE "SupplierInvoiceItems" 
      SET "category" = 'Fee de Inspección' 
      WHERE "category" = 'Imprevistos'
      RETURNING "idItem";
    `);
    
    console.log(`   ✅ ${supplierUpdateResult.length} registros actualizados en SupplierInvoiceItems`);

    // 8. Verificar que todo está bien
    console.log('\n6. 🔍 Verificando actualización...');
    
    const [verifyExpenses] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "Expenses" 
      WHERE "typeExpense" = 'Fee de Inspección'
    `);
    
    const [verifyReceipts] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "Receipts" 
      WHERE "type" = 'Fee de Inspección'
    `);
    
    const [verifySupplier] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "SupplierInvoiceItems" 
      WHERE "category" = 'Fee de Inspección'
    `);

    console.log(`   📊 Expenses con 'Fee de Inspección': ${verifyExpenses[0].count}`);
    console.log(`   📊 Receipts con 'Fee de Inspección': ${verifyReceipts[0].count}`);
    console.log(`   📊 SupplierInvoiceItems con 'Fee de Inspección': ${verifySupplier[0].count}`);

    // 9. OPCIONAL: Remover el valor viejo del ENUM (solo si no hay datos que lo usen)
    console.log('\n7. 🗑️ Verificando si se puede eliminar "Imprevistos"...');
    
    const [checkImprevistos] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Expenses" WHERE "typeExpense" = 'Imprevistos') +
        (SELECT COUNT(*) FROM "Receipts" WHERE "type" = 'Imprevistos') +
        (SELECT COUNT(*) FROM "SupplierInvoiceItems" WHERE "category" = 'Imprevistos') as total
    `);
    
    if (checkImprevistos[0].total === '0') {
      console.log('   ✅ No hay registros con "Imprevistos", se puede eliminar del ENUM');
      console.log('   ⚠️ NOTA: No eliminaremos automáticamente por seguridad');
    } else {
      console.log(`   ⚠️ Aún hay ${checkImprevistos[0].total} registros con "Imprevistos"`);
    }

    console.log('\n🎉 === ACTUALIZACIÓN COMPLETADA EXITOSAMENTE ===');
    console.log('✅ ENUMs actualizados');
    console.log('✅ Registros migrados');
    console.log('✅ Ya puedes usar "Fee de Inspección" en tu aplicación');
    console.log('\n🔄 Reinicia tu aplicación para que tome los cambios');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    try {
      await sequelize.close();
      console.log('🔒 Conexión cerrada');
    } catch (error) {
      console.error('Error cerrando conexión:', error.message);
    }
  }
}

// Ejecutar la actualización
updateEnums();