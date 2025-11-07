const { SupplierInvoice } = require('./src/data');

async function createTestInvoices() {
  try {
    await SupplierInvoice.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    const today = new Date().toISOString().split('T')[0];

    // Invoice 1: Para probar create_with_works
    const invoice1 = await SupplierInvoice.create({
      invoiceNumber: 'TEST-WORKS-001',
      vendor: 'Home Depot',
      issueDate: today,
      dueDate: today,
      totalAmount: 5000,
      status: 'pending',
      notes: 'Invoice de prueba para vincular con works',
      receiptUrl: 'https://via.placeholder.com/600x800/4CAF50/ffffff?text=TEST-WORKS-001'
    });

    console.log('✅ Invoice 1 creado (create_with_works):');
    console.log(`   ID: ${invoice1.idSupplierInvoice}`);
    console.log(`   Invoice #: ${invoice1.invoiceNumber}`);
    console.log(`   Total: $${invoice1.totalAmount}`);
    console.log('');

    // Invoice 2: Para probar create_general
    const invoice2 = await SupplierInvoice.create({
      invoiceNumber: 'TEST-GENERAL-001',
      vendor: 'Lowes',
      issueDate: today,
      dueDate: today,
      totalAmount: 3500,
      status: 'pending',
      notes: 'Invoice de prueba para gasto general',
      receiptUrl: 'https://via.placeholder.com/600x800/2196F3/ffffff?text=TEST-GENERAL-001'
    });

    console.log('✅ Invoice 2 creado (create_general):');
    console.log(`   ID: ${invoice2.idSupplierInvoice}`);
    console.log(`   Invoice #: ${invoice2.invoiceNumber}`);
    console.log(`   Total: $${invoice2.totalAmount}`);
    console.log('');

    // Invoice 3: Para probar link_existing
    const invoice3 = await SupplierInvoice.create({
      invoiceNumber: 'TEST-LINK-001',
      vendor: 'DRAKE',
      issueDate: today,
      dueDate: today,
      totalAmount: 7500,
      status: 'pending',
      notes: 'Invoice de prueba para vincular con expense existente',
      receiptUrl: 'https://via.placeholder.com/600x800/FF9800/ffffff?text=TEST-LINK-001'
    });

    console.log('✅ Invoice 3 creado (link_existing):');
    console.log(`   ID: ${invoice3.idSupplierInvoice}`);
    console.log(`   Invoice #: ${invoice3.invoiceNumber}`);
    console.log(`   Total: $${invoice3.totalAmount}`);
    console.log('');

    console.log('🎉 3 invoices de prueba creados exitosamente!');
    console.log('\n📝 INSTRUCCIONES DE PRUEBA:');
    console.log('');
    console.log('1️⃣ PRUEBA create_with_works (Invoice TEST-WORKS-001):');
    console.log('   - Ir a Vista por Proveedores → Home Depot → Pagar');
    console.log('   - Seleccionar "Crear con Work(s)"');
    console.log('   - Elegir 1 o 2 works de la lista');
    console.log('   - Escribir descripción personalizada en cada work (ej: "Materiales para techo")');
    console.log('   - Distribuir el monto ($5000 total)');
    console.log('   - Enviar y verificar:');
    console.log('     ✓ Descripción aparece en los expenses creados');
    console.log('     ✓ Llegan emails de notificación');
    console.log('');
    console.log('2️⃣ PRUEBA create_general (Invoice TEST-GENERAL-001):');
    console.log('   - Ir a Vista por Proveedores → Lowes → Pagar');
    console.log('   - Seleccionar "Crear Gasto General"');
    console.log('   - Escribir descripción (ej: "Herramientas varias para almacén")');
    console.log('   - Enviar y verificar:');
    console.log('     ✓ Descripción aparece en el expense general');
    console.log('     ✓ Llega email de notificación');
    console.log('');
    console.log('3️⃣ PRUEBA link_existing (Invoice TEST-LINK-001):');
    console.log('   - Ir a Vista por Proveedores → DRAKE → Pagar');
    console.log('   - Seleccionar "Vincular Existente(s)"');
    console.log('   - Elegir 1 o más expenses de la lista de pendientes');
    console.log('   - Enviar y verificar:');
    console.log('     ✓ Invoice se marca como PAID');
    console.log('     ✓ Receipt NO aparece en los expenses (ya tienen su receipt original)');
    console.log('');

    await SupplierInvoice.sequelize.close();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestInvoices();
