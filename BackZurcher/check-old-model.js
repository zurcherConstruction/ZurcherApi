const { sequelize } = require('./src/data');

async function checkOldModel() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado\n');

    console.log('═'.repeat(80));
    console.log('🔍 VERIFICANDO MODELO ANTIGUO');
    console.log('═'.repeat(80));
    console.log('');

    // Contar items
    const [itemCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoiceItems";
    `);

    console.log('📦 SupplierInvoiceItems:');
    console.log(`   Total registros: ${itemCount[0].total}`);
    console.log('');

    // Contar works
    const [workCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoiceWorks";
    `);

    console.log('🏗️  SupplierInvoiceWorks:');
    console.log(`   Total registros: ${workCount[0].total}`);
    console.log('');

    // Ver vínculos actuales
    const [links] = await sequelize.query(`
      SELECT 
        sie."idSupplierInvoiceExpense",
        si."invoiceNumber",
        si.vendor,
        si."totalAmount" as invoice_total,
        e.amount as expense_amount,
        e.notes as expense_notes,
        e."paymentStatus"
      FROM "SupplierInvoiceExpenses" sie
      JOIN "SupplierInvoices" si ON si."idSupplierInvoice" = sie."supplierInvoiceId"
      JOIN "Expenses" e ON e."idExpense" = sie."expenseId"
      ORDER BY si."createdAt" DESC;
    `);

    console.log('🔗 Vínculos existentes (Invoice → Expense):');
    if (links.length === 0) {
      console.log('   Sin vínculos');
    } else {
      links.forEach((link, idx) => {
        console.log(`   ${idx + 1}. ${link.vendor} - Invoice #${link.invoiceNumber}`);
        console.log(`      Invoice: $${parseFloat(link.invoice_total).toFixed(2)}`);
        console.log(`      Expense: $${parseFloat(link.expense_amount).toFixed(2)} - ${link.paymentStatus}`);
        console.log(`      Notes: ${link.expense_notes?.substring(0, 50) || 'Sin notas'}...`);
        console.log('');
      });
    }

    console.log('═'.repeat(80));
    console.log('✅ RESUMEN Y RECOMENDACIÓN');
    console.log('═'.repeat(80));
    console.log('');

    const hasOldData = itemCount[0].total > 0 || workCount[0].total > 0;

    if (!hasOldData) {
      console.log('🎉 ¡EXCELENTE! Las tablas del modelo antiguo están VACÍAS');
      console.log('');
      console.log('Esto significa que:');
      console.log('✅ No hay datos que migrar');
      console.log('✅ Puedes usar el nuevo sistema directamente');
      console.log('✅ Las tablas viejas pueden eliminarse (opcional)');
      console.log('');
      console.log('📋 PLAN DE DEPLOYMENT:');
      console.log('');
      console.log('1️⃣  PRODUCCIÓN - Ejecutar migraciones:');
      console.log('   cd BackZurcher');
      console.log('   node check-and-add-columns.js  # Agregar columnas status y description');
      console.log('');
      console.log('2️⃣  PRODUCCIÓN - Verificar estado:');
      console.log('   node simple-analysis.js  # Ver qué hay en producción');
      console.log('');
      console.log('3️⃣  GIT - Push del código:');
      console.log('   git add .');
      console.log('   git commit -m "feat: Sistema simplificado Supplier Invoices"');
      console.log('   git push origin yani62');
      console.log('');
      console.log('4️⃣  RAILWAY - Merge a main:');
      console.log('   git checkout main');
      console.log('   git merge yani62');
      console.log('   git push origin main');
      console.log('   # Railway deployará automáticamente');
      console.log('');
      console.log('5️⃣  VERIFICAR en producción:');
      console.log('   • Crear invoice de prueba');
      console.log('   • Pagar con las 3 opciones');
      console.log('   • Verificar emails y auto-refresh');
    } else {
      console.log('⚠️  HAY DATOS EN EL MODELO ANTIGUO');
      console.log('');
      console.log(`   Items: ${itemCount[0].total}`);
      console.log(`   Works: ${workCount[0].total}`);
      console.log('');
      console.log('Necesitarás un plan de migración específico.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkOldModel();
