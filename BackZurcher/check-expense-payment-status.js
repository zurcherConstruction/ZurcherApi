const {Expense} = require('./src/data');
const {Op} = require('sequelize');

(async () => {
  try {
    const firstDay = new Date('2025-12-01');
    const lastDay = new Date('2025-12-31');
    
    console.log('=== VERIFICANDO PAYMENT STATUS DE EXPENSES EN EFECTIVO ===\n');
    
    const expenses = await Expense.findAll({
      where: {
        paymentMethod: 'Efectivo',
        date: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      order: [['date', 'DESC']],
      attributes: ['idExpense', 'amount', 'typeExpense', 'paymentMethod', 'paymentStatus', 'date', 'createdAt']
    });
    
    console.log(`Total Expenses en Efectivo: ${expenses.length}\n`);
    
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalPartial = 0;
    
    expenses.forEach(e => {
      const dateStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date;
      const createdStr = e.createdAt.toISOString().split('T')[0];
      const status = e.paymentStatus || 'NULL';
      
      console.log(`${dateStr} | $${e.amount} | ${status} | ${e.typeExpense || 'Sin tipo'}`);
      console.log(`  ID: ${e.idExpense} | Created: ${createdStr}`);
      
      if (status === 'paid' || status === 'paid_via_invoice') {
        totalPaid += parseFloat(e.amount);
      } else if (status === 'unpaid') {
        totalUnpaid += parseFloat(e.amount);
      } else if (status === 'partial') {
        totalPartial += parseFloat(e.amount);
      }
    });
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Paid: $${totalPaid.toFixed(2)}`);
    console.log(`Unpaid: $${totalUnpaid.toFixed(2)}`);
    console.log(`Partial: $${totalPartial.toFixed(2)}`);
    console.log(`Total: $${(totalPaid + totalUnpaid + totalPartial).toFixed(2)}`);
    
    console.log(`\n=== DASHBOARD DEBERÍA MOSTRAR ===`);
    console.log(`Efectivo: $${totalPaid.toFixed(2)} (solo 'paid' o 'paid_via_invoice')`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
