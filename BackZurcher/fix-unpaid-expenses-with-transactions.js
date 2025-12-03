const {Expense, BankTransaction} = require('./src/data');
const {Op} = require('sequelize');

(async () => {
  try {
    console.log('=== ACTUALIZANDO EXPENSES UNPAID CON BANK TRANSACTIONS ===\n');
    
    // 1. Buscar todos los Expenses con paymentStatus='unpaid'
    const unpaidExpenses = await Expense.findAll({
      where: {
        paymentStatus: 'unpaid'
      }
    });
    
    console.log(`Expenses con paymentStatus='unpaid': ${unpaidExpenses.length}\n`);
    
    let updated = 0;
    let notFound = 0;
    
    for (const expense of unpaidExpenses) {
      // Buscar si existe un BankTransaction relacionado
      const bankTx = await BankTransaction.findOne({
        where: {
          relatedExpenseId: expense.idExpense
        }
      });
      
      if (bankTx) {
        // Actualizar a 'paid'
        await expense.update({ paymentStatus: 'paid' });
        const dateStr = expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date;
        console.log(`✅ Actualizado: ${dateStr} | $${expense.amount} | ${expense.typeExpense} → 'paid'`);
        updated++;
      } else {
        const dateStr = expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date;
        console.log(`⚠️ Sin BankTransaction: ${dateStr} | $${expense.amount} | ${expense.typeExpense} → sigue 'unpaid'`);
        notFound++;
      }
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Actualizados a 'paid': ${updated}`);
    console.log(`Sin BankTransaction (siguen 'unpaid'): ${notFound}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
