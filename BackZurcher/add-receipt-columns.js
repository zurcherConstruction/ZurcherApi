/**
 * MIGRACIÓN: Agregar columnas receiptUrl y receiptPublicId a SupplierInvoices
 */

const { sequelize } = require('./src/data');

async function addReceiptColumns() {
  try {
    await sequelize.authenticate();
    const dbName = process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'LOCAL';
    console.log(`✅ Conectado a base de datos: ${dbName}\n`);

    console.log('🔧 Verificando columnas en SupplierInvoices...\n');

    // Verificar si receiptUrl existe
    const [receiptUrlExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'SupplierInvoices' AND column_name = 'receiptUrl'
      );
    `);

    // Verificar si receiptPublicId existe
    const [receiptPublicIdExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'SupplierInvoices' AND column_name = 'receiptPublicId'
      );
    `);

    console.log('📋 Estado actual:');
    console.log(`   receiptUrl: ${receiptUrlExists[0].exists ? '✅ YA EXISTE' : '❌ NO EXISTE'}`);
    console.log(`   receiptPublicId: ${receiptPublicIdExists[0].exists ? '✅ YA EXISTE' : '❌ NO EXISTE'}`);
    console.log('');

    let cambiosRealizados = false;

    // Agregar receiptUrl si no existe
    if (!receiptUrlExists[0].exists) {
      console.log('➕ Agregando columna receiptUrl...');
      await sequelize.query(`
        ALTER TABLE "SupplierInvoices" 
        ADD COLUMN "receiptUrl" VARCHAR(500);
      `);
      console.log('   ✅ Columna receiptUrl agregada\n');
      cambiosRealizados = true;
    } else {
      console.log('   ⏭️  receiptUrl ya existe - omitiendo\n');
    }

    // Agregar receiptPublicId si no existe
    if (!receiptPublicIdExists[0].exists) {
      console.log('➕ Agregando columna receiptPublicId...');
      await sequelize.query(`
        ALTER TABLE "SupplierInvoices" 
        ADD COLUMN "receiptPublicId" VARCHAR(255);
      `);
      console.log('   ✅ Columna receiptPublicId agregada\n');
      cambiosRealizados = true;
    } else {
      console.log('   ⏭️  receiptPublicId ya existe - omitiendo\n');
    }

    // Verificar columnas finales
    console.log('📊 Verificando estructura final...\n');
    const [columns] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'SupplierInvoices' 
      AND column_name IN ('receiptUrl', 'receiptPublicId')
      ORDER BY column_name;
    `);

    if (columns.length > 0) {
      console.log('✅ Columnas confirmadas:');
      columns.forEach(col => {
        console.log(`   • ${col.column_name}: ${col.data_type}(${col.character_maximum_length || 'N/A'})`);
      });
      console.log('');
    }

    // Mostrar resumen de invoices
    const [summary] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COUNT("receiptUrl") as invoices_with_receipt,
        COUNT(*) - COUNT("receiptUrl") as invoices_without_receipt
      FROM "SupplierInvoices";
    `);

    console.log('📈 Resumen de Supplier Invoices:');
    console.log(`   Total: ${summary[0].total_invoices}`);
    console.log(`   Con receipt: ${summary[0].invoices_with_receipt}`);
    console.log(`   Sin receipt: ${summary[0].invoices_without_receipt}`);
    console.log('');

    if (cambiosRealizados) {
      console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    } else {
      console.log('✅ NO SE REQUIRIERON CAMBIOS - Todo al día');
    }

    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
addReceiptColumns();
