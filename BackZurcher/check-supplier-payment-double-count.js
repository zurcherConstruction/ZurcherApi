const {Expense, SupplierInvoice} = require('./src/data');
const {Op} = require('sequelize');

(async () => {
  try {
    const firstDay = new Date('2025-12-01');
    const lastDay = new Date('2025-12-31');
    
    console.log('=== VERIFICANDO DOBLE CONTEO DE PAGO A PROVEEDOR ===\n');
    
    // 1. Buscar el supplier invoice de $5000
    const invoice = await SupplierInvoice.findOne({
      where: {
        paymentStatus: 'paid',
        paymentDate: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      order: [['paymentDate', 'DESC']]
    });
    
    if (invoice) {
      console.log(`Invoice encontrado:`);
      console.log(`  ID: ${invoice.idSupplierInvoice}`);
      console.log(`  Vendor: ${invoice.vendor}`);
      console.log(`  Total: $${invoice.totalAmount}`);
      console.log(`  Paid: $${invoice.paidAmount}`);
      console.log(`  Payment Method: ${invoice.paymentMethod}`);
      console.log(`  Payment Date: ${invoice.paymentDate}\n`);
      
      // 2. Buscar expenses relacionados
      const relatedExpenses = await Expense.findAll({
        where: {
          date: {
            [Op.between]: [firstDay, lastDay]
          },
          amount: {
            [Op.in]: [2500, 5000] // Los montos del pago
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      console.log(`Expenses potencialmente relacionados: ${relatedExpenses.length}\n`);
      relatedExpenses.forEach(e => {
        const dateStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date;
        console.log(`  ${dateStr} | $${e.amount} | ${e.typeExpense} | paymentStatus: ${e.paymentStatus}`);
        console.log(`    supplierInvoiceItemId: ${e.supplierInvoiceItemId || 'NULL'}`);
        console.log(`    relatedFixedExpenseId: ${e.relatedFixedExpenseId || 'NULL'}`);
        console.log(`    paymentMethod: ${e.paymentMethod || 'NULL'}\n`);
      });
      
      // 3. Verificar cuántos se contarían en el dashboard
      const dashboardExpenses = await Expense.findAll({
        where: {
          date: {
            [Op.between]: [firstDay, lastDay]
          },
          paymentStatus: { [Op.in]: ['paid', 'paid_via_invoice'] },
          relatedFixedExpenseId: null,
          supplierInvoiceItemId: null,
          paymentMethod: { 
            [Op.notIn]: ['Chase Credit Card', 'AMEX']
          }
        }
      });
      
      const totalDashboard = dashboardExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      console.log(`\n=== CONTEO DASHBOARD ===`);
      console.log(`Expenses que se cuentan (sin supplierInvoiceItemId): ${dashboardExpenses.length}`);
      console.log(`Total Expenses: $${totalDashboard.toFixed(2)}`);
      console.log(`Total SupplierInvoice.paidAmount: $${invoice.paidAmount}`);
      console.log(`TOTAL QUE APARECERÍA: $${(totalDashboard + parseFloat(invoice.paidAmount)).toFixed(2)}`);
    } else {
      console.log('No se encontró invoice pagado en diciembre');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
