const { SupplierInvoice } = require('./src/data');

async function recreateTestInvoices() {
  try {
    await SupplierInvoice.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Eliminar invoices de prueba anteriores
    const deleted = await SupplierInvoice.destroy({
      where: {
        invoiceNumber: {
          [require('sequelize').Op.in]: ['TEST-WORKS-001', 'TEST-GENERAL-001', 'TEST-LINK-001']
        }
      }
    });

    if (deleted > 0) {
      console.log(`🗑️  ${deleted} invoice(s) de prueba anterior(es) eliminado(s)\n`);
    }

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

    console.log('═'.repeat(80));
    console.log('🎉 3 INVOICES DE PRUEBA LISTOS');
    console.log('═'.repeat(80));
    console.log('');
    console.log('📋 INSTRUCCIONES DE PRUEBA:');
    console.log('');
    console.log('1️⃣  TEST-WORKS-001 (Home Depot) - $5,000');
    console.log('   ▶ Objetivo: Verificar que llegan TODOS los emails cuando creas 2+ expenses');
    console.log('   ▶ Pasos:');
    console.log('     • Vista por Proveedores → Home Depot → Pagar');
    console.log('     • Seleccionar "Crear con Work(s)"');
    console.log('     • Elegir 2 works diferentes');
    console.log('     • Work 1: Escribe "Materiales de construcción" - $2500');
    console.log('     • Work 2: Escribe "Herramientas eléctricas" - $2500');
    console.log('   ▶ Verificar:');
    console.log('     ✓ Se crean 2 expenses con las descripciones correctas');
    console.log('     ✓ Llegan 2 emails (uno por cada expense)');
    console.log('     ✓ Lista de invoices se actualiza automáticamente (sin refresh manual)');
    console.log('');
    console.log('2️⃣  TEST-GENERAL-001 (Lowes) - $3,500');
    console.log('   ▶ Objetivo: Verificar descripción y email para gasto general');
    console.log('   ▶ Pasos:');
    console.log('     • Vista por Proveedores → Lowes → Pagar');
    console.log('     • Seleccionar "Crear Gasto General"');
    console.log('     • Escribir "Suministros de oficina para almacén"');
    console.log('   ▶ Verificar:');
    console.log('     ✓ Expense creado con la descripción completa');
    console.log('     ✓ Llega 1 email con los detalles');
    console.log('     ✓ Lista se actualiza automáticamente');
    console.log('');
    console.log('3️⃣  TEST-LINK-001 (DRAKE) - $7,500');
    console.log('   ▶ Objetivo: Verificar vincular expenses existentes');
    console.log('   ▶ Pasos:');
    console.log('     • Vista por Proveedores → DRAKE → Pagar');
    console.log('     • Seleccionar "Vincular Existente(s)"');
    console.log('     • Elegir 1 o más expenses de la lista');
    console.log('   ▶ Verificar:');
    console.log('     ✓ Invoice marcado como PAID');
    console.log('     ✓ NO se duplica el receipt en los expenses');
    console.log('     ✓ Lista se actualiza automáticamente');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
    console.log('📧 VERIFICACIÓN DE EMAILS:');
    console.log('   Los emails deben enviarse a: yaninazurcher@gmail.com y cerianimaia24@gmail.com');
    console.log('   Revisa los logs del servidor para confirmar:');
    console.log('   ✅ "📧 Notificación enviada para expense..."');
    console.log('   ❌ Si ves "⏭️ Saltando notificación duplicada" = PROBLEMA');
    console.log('');
    console.log('🔍 VERIFICAR DESCRIPCIONES:');
    console.log('   Después de cada pago, ejecuta:');
    console.log('   node check-expense-descriptions.js');
    console.log('');
    console.log('🔄 AUTO-REFRESH:');
    console.log('   Después de pagar, la lista debe actualizarse sola (sin F5)');
    console.log('   Si no se actualiza = PROBLEMA');
    console.log('');

    await SupplierInvoice.sequelize.close();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

recreateTestInvoices();
