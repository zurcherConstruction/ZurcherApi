const { sequelize } = require('./src/data');

async function simpleAnalysis() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado\n');

    // Verificar existencia de tablas
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%SupplierInvoice%'
      ORDER BY table_name;
    `);

    console.log('📋 Tablas relacionadas con SupplierInvoice:');
    tables.forEach(t => console.log(`   • ${t.table_name}`));
    console.log('');

    // Contar invoices
    const [counts] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid
      FROM "SupplierInvoices";
    `);

    console.log('📊 Supplier Invoices:');
    console.log(`   Total: ${counts[0].total}`);
    console.log(`   Pending: ${counts[0].pending}`);
    console.log(`   Paid: ${counts[0].paid}`);
    console.log('');

    // Mostrar algunos invoices
    const [invoices] = await sequelize.query(`
      SELECT 
        "invoiceNumber",
        vendor,
        "totalAmount",
        status,
        "createdAt"
      FROM "SupplierInvoices"
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);

    console.log('📄 Últimos 10 invoices:');
    invoices.forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.vendor} - Invoice #${inv.invoiceNumber || 'N/A'}`);
      console.log(`      Total: $${parseFloat(inv.totalAmount).toFixed(2)} - Status: ${inv.status}`);
      console.log(`      Fecha: ${new Date(inv.createdAt).toISOString().split('T')[0]}`);
      console.log('');
    });

    // Contar expenses
    const [expenseCounts] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "paymentStatus" = 'unpaid' THEN 1 END) as unpaid,
        COUNT(CASE WHEN "paymentStatus" = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN "paymentStatus" = 'paid_via_invoice' THEN 1 END) as paid_via_invoice
      FROM "Expenses";
    `);

    console.log('💰 Expenses:');
    console.log(`   Total: ${expenseCounts[0].total}`);
    console.log(`   Unpaid: ${expenseCounts[0].unpaid}`);
    console.log(`   Paid: ${expenseCounts[0].paid}`);
    console.log(`   Paid via Invoice: ${expenseCounts[0].paid_via_invoice}`);
    console.log('');

    // Verificar vínculos existentes
    const [links] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM "SupplierInvoiceExpenses";
    `);

    console.log('🔗 Vínculos Invoice-Expense:');
    console.log(`   Total: ${links[0].total}`);
    console.log('');

    console.log('═'.repeat(80));
    console.log('✅ CONCLUSIÓN');
    console.log('═'.repeat(80));
    console.log('');
    
    if (tables.length === 2) { // Solo SupplierInvoices y SupplierInvoiceExpenses
      console.log('🎉 Tu sistema está LIMPIO - no tiene modelo antiguo');
      console.log('');
      console.log('Puedes hacer deployment directamente:');
      console.log('1. Ejecutar migraciones en producción');
      console.log('2. Push del código');
      console.log('3. Empezar a usar el nuevo sistema');
    } else {
      console.log('⚠️  Tu sistema tiene tablas del modelo antiguo');
      console.log('   Necesitarás revisar invoices existentes');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

simpleAnalysis();
