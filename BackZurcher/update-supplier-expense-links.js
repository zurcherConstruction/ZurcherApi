const {Expense, SupplierInvoiceExpense} = require('./src/data');

(async () => {
  try {
    console.log('=== ACTUALIZANDO EXPENSES VINCULADOS A SUPPLIER INVOICES ===\n');
    
    // Buscar todos los registros en SupplierInvoiceExpense
    const links = await SupplierInvoiceExpense.findAll();
    
    console.log(`Links encontrados: ${links.length}\n`);
    
    let updated = 0;
    let alreadyLinked = 0;
    
    for (const link of links) {
      const expense = await Expense.findByPk(link.expenseId);
      
      if (!expense) {
        console.log(`⚠️ Expense ${link.expenseId} no encontrado`);
        continue;
      }
      
      if (expense.supplierInvoiceItemId) {
        alreadyLinked++;
        continue;
      }
      
      // Actualizar el expense - poner el ID del invoice en supplierInvoiceItemId
      // (aunque el nombre del campo dice "Item", realmente apunta al Invoice)
      await expense.update({
        supplierInvoiceItemId: link.supplierInvoiceId
      });
      
      console.log(`✅ Expense ${expense.idExpense.slice(0,8)}... → Invoice ${link.supplierInvoiceId.slice(0,8)}...`);
      console.log(`   $${expense.amount} | ${expense.paymentMethod || 'null'} | ${expense.date}\n`);
      updated++;
    }
    
    console.log(`=== RESUMEN ===`);
    console.log(`Actualizados: ${updated}`);
    console.log(`Ya vinculados: ${alreadyLinked}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
