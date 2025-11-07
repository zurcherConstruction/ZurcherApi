/**
 * LIMPIEZA DE INVOICES ANTIGUOS
 * 
 * Este script:
 * 1. Elimina todos los SupplierInvoiceItems
 * 2. Elimina todos los SupplierInvoiceWorks
 * 3. Mantiene los SupplierInvoices intactos con su información básica:
 *    - Vendor, totalAmount, invoiceNumber, dates, receipt, etc.
 * 
 * Los invoices quedarán listos para usar el nuevo sistema
 */

const { sequelize } = require('./src/data');

async function cleanOldInvoiceData() {
  try {
    await sequelize.authenticate();
    const dbName = process.env.NODE_ENV === 'production' ? '🔴 PRODUCCIÓN' : '🟢 LOCAL';
    console.log(`Conectado a: ${dbName}\n`);

    console.log('═'.repeat(80));
    console.log('🧹 LIMPIEZA DE DATOS ANTIGUOS DE INVOICES');
    console.log('═'.repeat(80));
    console.log('');

    // Verificar si las tablas antiguas existen
    const [itemsTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SupplierInvoiceItems'
      );
    `);

    const [worksTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SupplierInvoiceWorks'
      );
    `);

    const hasItemsTable = itemsTableExists[0].exists;
    const hasWorksTable = worksTableExists[0].exists;

    console.log('🔍 Verificando tablas antiguas:');
    console.log(`   SupplierInvoiceItems: ${hasItemsTable ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   SupplierInvoiceWorks: ${hasWorksTable ? '✅ Existe' : '❌ No existe'}`);
    console.log('');

    if (!hasItemsTable && !hasWorksTable) {
      console.log('✅ Base de datos limpia - No existen tablas antiguas');
      console.log('   El sistema ya está listo para usar el nuevo modelo');
      await sequelize.close();
      return;
    }

    // 1. Contar lo que vamos a eliminar
    let itemCount = [{ total: 0 }];
    let workCount = [{ total: 0 }];

    if (hasItemsTable) {
      [itemCount] = await sequelize.query(`
        SELECT COUNT(*) as total FROM "SupplierInvoiceItems";
      `);
    }

    if (hasWorksTable) {
      [workCount] = await sequelize.query(`
        SELECT COUNT(*) as total FROM "SupplierInvoiceWorks";
      `);
    }

    const [invoiceCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoices";
    `);

    console.log('📊 Estado actual:');
    console.log(`   Supplier Invoices: ${invoiceCount[0].total}`);
    console.log(`   Items a eliminar: ${itemCount[0].total}`);
    console.log(`   Works a eliminar: ${workCount[0].total}`);
    console.log('');

    if (itemCount[0].total === 0 && workCount[0].total === 0) {
      console.log('✅ No hay nada que limpiar - el sistema ya está limpio');
      await sequelize.close();
      return;
    }

    console.log('⚠️  ADVERTENCIA: Esta operación eliminará los datos antiguos');
    console.log('   Los invoices se mantendrán con su información básica');
    console.log('   Esta acción NO es reversible sin un backup');
    console.log('');

    // 2. Eliminar items
    if (hasItemsTable && itemCount[0].total > 0) {
      console.log(`🗑️  Eliminando ${itemCount[0].total} items...`);
      await sequelize.query(`DELETE FROM "SupplierInvoiceItems";`);
      console.log('   ✅ Items eliminados');
      console.log('');
    }

    // 3. Eliminar works
    if (hasWorksTable && workCount[0].total > 0) {
      console.log(`🗑️  Eliminando ${workCount[0].total} works...`);
      await sequelize.query(`DELETE FROM "SupplierInvoiceWorks";`);
      console.log('   ✅ Works eliminados');
      console.log('');
    }

    // 4. Verificar que los invoices siguen ahí
    const [finalInvoiceCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoices";
    `);

    console.log('═'.repeat(80));
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('═'.repeat(80));
    console.log('');
    console.log(`📋 Invoices conservados: ${finalInvoiceCount[0].total}`);
    console.log(`🗑️  Items eliminados: ${itemCount[0].total}`);
    console.log(`🗑️  Works eliminados: ${workCount[0].total}`);
    console.log('');
    
    console.log('📝 Información conservada en cada invoice:');
    console.log('   • Vendor');
    console.log('   • Total Amount');
    console.log('   • Invoice Number');
    console.log('   • Dates (issue, due, payment)');
    console.log('   • Receipt (PDF/imagen)');
    console.log('   • Status');
    console.log('   • Notes y descripción');
    console.log('');

    console.log('🎯 Próximos pasos:');
    console.log('   1. Los invoices están listos para el nuevo sistema');
    console.log('   2. Para pagarlos, usa las 3 opciones de pago:');
    console.log('      - Vincular expenses existentes');
    console.log('      - Crear con works asociados');
    console.log('      - Crear gasto general');
    console.log('');

    // Mostrar algunos invoices de ejemplo
    const [sampleInvoices] = await sequelize.query(`
      SELECT 
        "invoiceNumber",
        vendor,
        "totalAmount",
        status
      FROM "SupplierInvoices"
      ORDER BY "createdAt" DESC
      LIMIT 5;
    `);

    console.log('📄 Ejemplos de invoices conservados:');
    sampleInvoices.forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.vendor} - Invoice #${inv.invoiceNumber}`);
      console.log(`      Total: $${parseFloat(inv.totalAmount).toFixed(2)} - Status: ${inv.status}`);
    });
    console.log('');

    await sequelize.close();
    console.log('🔌 Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
console.log('⚠️  IMPORTANTE: Este script eliminará items y works antiguos');
console.log('   Los invoices se mantendrán intactos con su información básica');
console.log('   Asegúrate de tener un backup antes de continuar en producción');
console.log('');

cleanOldInvoiceData();
