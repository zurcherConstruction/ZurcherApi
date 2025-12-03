const {Expense, SupplierInvoiceExpense} = require('./src/data');

(async () => {
  try {
    console.log('=== VINCULANDO EXPENSES A SUPPLIER INVOICES ===\n');
    
    // 1. Buscar todos los registros en SupplierInvoiceExpense
    const links = await SupplierInvoiceExpense.findAll();
    
    console.log(`Links encontrados en SupplierInvoiceExpense: ${links.length}\n`);
    
    let updated = 0;
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
      
      // Actualizar el expense con el supplierInvoiceId
      await expense.update({
        supplierInvoiceItemId: link.supplierInvoiceId
      });
      
      console.log(`✅ Expense ${expense.idExpense} vinculado a SupplierInvoice ${link.supplierInvoiceId}`);
      console.log(`   Amount: $${expense.amount} | PaymentMethod: ${expense.paymentMethod} | Date: ${expense.date}\n`);
      updated++;
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Expenses actualizados: ${updated}`);
    console.log(`Ya estaban vinculados: ${alreadyLinked}`);
    console.log(`Total procesados: ${links.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
