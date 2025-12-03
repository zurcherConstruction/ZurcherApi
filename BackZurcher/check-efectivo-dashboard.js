const {BankTransaction, BankAccount, Expense} = require('./src/data');
const {Op} = require('sequelize');

(async () => {
  try {
    const firstDay = new Date('2025-12-01');
    const lastDay = new Date('2025-12-31');
    
    console.log('=== VERIFICANDO GASTOS EN EFECTIVO DICIEMBRE ===\n');
    
    // 1. Verificar cuenta Caja Chica
    const cuenta = await BankAccount.findOne({
      where: {accountName: 'Caja Chica'}
    });
    console.log(`Balance actual Caja Chica: $${cuenta.currentBalance}\n`);
    
    // 2. Verificar BankTransactions de retiro en diciembre
    const txs = await BankTransaction.findAll({
      include: [{
        model: BankAccount,
        as: 'account',
        attributes: ['accountName']
      }],
      where: {
        date: {
          [Op.between]: [firstDay, lastDay]
        },
        transactionType: 'withdrawal',
        [Op.or]: [
          { description: { [Op.notLike]: '%Pago%' } },
          { description: null }
        ]
      },
      order: [['date', 'DESC']]
    });
    
    const efectivoTxs = txs.filter(t => t.account?.accountName === 'Caja Chica');
    console.log(`Retiros Caja Chica en diciembre: ${efectivoTxs.length}`);
    
    let totalBankTxs = 0;
    efectivoTxs.forEach(t => {
      totalBankTxs += parseFloat(t.amount);
      const dateStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date;
      console.log(`  ${dateStr} | $${t.amount} | ${t.description || 'Sin descripción'}`);
    });
    console.log(`\nTotal en BankTransactions: $${totalBankTxs.toFixed(2)}\n`);
    
    // 3. Verificar Expenses en efectivo en diciembre
    const expenses = await Expense.findAll({
      where: {
        paymentMethod: 'Efectivo',
        date: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      order: [['date', 'DESC']]
    });
    
    console.log(`Expenses en Efectivo en diciembre: ${expenses.length}`);
    let totalExpenses = 0;
    expenses.forEach(e => {
      totalExpenses += parseFloat(e.amount);
      const dateStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date;
      console.log(`  ${dateStr} | $${e.amount} | ${e.description || 'Sin descripción'}`);
    });
    console.log(`\nTotal en Expenses: $${totalExpenses.toFixed(2)}\n`);
    
    // 4. Verificar si coinciden
    if (Math.abs(totalBankTxs - totalExpenses) > 0.01) {
      console.log(`⚠️ DISCREPANCIA: BankTransactions ($${totalBankTxs.toFixed(2)}) ≠ Expenses ($${totalExpenses.toFixed(2)})`);
    } else {
      console.log(`✅ Totales coinciden: $${totalBankTxs.toFixed(2)}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
