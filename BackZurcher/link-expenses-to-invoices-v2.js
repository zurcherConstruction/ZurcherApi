const {Expense, SupplierInvoiceExpense, SupplierInvoice, SupplierInvoiceItem} = require('./src/data');

(async () => {
  try {
    console.log('=== CREANDO ITEMS Y VINCULANDO EXPENSES A SUPPLIER INVOICES ===\n');
    
    // 1. Buscar todos los registros en SupplierInvoiceExpense
    const links = await SupplierInvoiceExpense.findAll();
    
    console.log(`Links encontrados en SupplierInvoiceExpense: ${links.length}\n`);
    
    let itemsCreated = 0;
    let expensesUpdated = 0;
    let alreadyLinked = 0;
    
    for (const link of links) {
      // Buscar el expense
      const expense = await Expense.findByPk(link.expenseId);
      
      if (!expense) {
        console.log(`⚠️ Expense ${link.expenseId} no encontrado`);
        continue;
      }
      
      if (expense.supplierInvoiceItemId) {
        alreadyLinked++;
        continue; // Ya está vinculado
      }
      
      // Buscar el invoice
      const invoice = await SupplierInvoice.findByPk(link.supplierInvoiceId);
      if (!invoice) {
        console.log(`⚠️ SupplierInvoice ${link.supplierInvoiceId} no encontrado`);
        continue;
      }
      
      // Crear el SupplierInvoiceItem
      const invoiceItem = await SupplierInvoiceItem.create({
        supplierInvoiceId: link.supplierInvoiceId,
        workId: expense.workId || null,
        description: expense.notes || `${invoice.vendor} - Invoice #${invoice.invoiceNumber}`,
        category: expense.typeExpense || 'Gastos Generales',
        amount: expense.amount,
        notes: link.notes || null
      });
      
      console.log(`✅ SupplierInvoiceItem creado: ${invoiceItem.idItem}`);
      itemsCreated++;
      
      // Actualizar el expense con el item ID
      await expense.update({
        supplierInvoiceItemId: invoiceItem.idItem
      });
      
      console.log(`✅ Expense ${expense.idExpense} vinculado a Item ${invoiceItem.idItem}`);
      console.log(`   Amount: $${expense.amount} | PaymentMethod: ${expense.paymentMethod} | Date: ${expense.date}\n`);
      expensesUpdated++;
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Items creados: ${itemsCreated}`);
    console.log(`Expenses actualizados: ${expensesUpdated}`);
    console.log(`Ya estaban vinculados: ${alreadyLinked}`);
    console.log(`Total procesados: ${links.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
