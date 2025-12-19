const { FixedExpense, FixedExpensePayment, Expense } = require('../data');
const moment = require('moment');

/**
 * 🔄 CRON SIMPLE: Solo resetear gastos pagados
 * 
 * Este servicio SOLO resetea gastos fijos pagados para el próximo ciclo.
 * NO genera expenses automáticamente.
 * 
 * Los expenses se generan SOLO cuando el usuario registra un pago.
 */

function calculateNextDueDate(currentDueDate, frequency) {
  const current = new Date(currentDueDate);
  const next = new Date(current);

  switch (frequency) {
    case 'weekly':
      next.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(current.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(current.getMonth() + 3);
      break;
    case 'semiannual':
      next.setMonth(current.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(current.getFullYear() + 1);
      break;
    default:
      next.setMonth(current.getMonth() + 1);
  }

  return next;
}

/**
 * SOLO resetear gastos pagados para próximo ciclo
 */
const onlyResetPaidExpenses = async () => {
  const startTime = new Date();
  console.log(`\n🔄 [CRON SIMPLE] Reseteando gastos pagados - ${startTime.toISOString()}`);
  
  try {
    // Buscar gastos pagados con auto-generación habilitada
    const paidExpenses = await FixedExpense.findAll({
      where: {
        isActive: true,
        autoCreateExpense: true,
        paymentStatus: 'paid'
      },
      include: [{
        model: FixedExpensePayment,
        as: 'payments',
        required: false,
        order: [['paymentDate', 'DESC']],
        limit: 1
      }]
    });

    console.log(`📊 [CRON SIMPLE] Gastos pagados encontrados: ${paidExpenses.length}`);

    if (paidExpenses.length === 0) {
      console.log(`✅ [CRON SIMPLE] No hay gastos pagados para resetear`);
      return;
    }

    let resetCount = 0;

    for (const expense of paidExpenses) {
      try {
        // Encontrar último pago
        const lastPayment = expense.payments && expense.payments.length > 0 
          ? expense.payments[0] 
          : null;

        if (lastPayment) {
          // Calcular próximo vencimiento basado en último pago
          const lastPaymentDate = new Date(lastPayment.paymentDate);
          const nextDueDate = calculateNextDueDate(lastPaymentDate, expense.frequency);
          
          console.log(`   📝 ${expense.name}: ${lastPayment.paymentDate} → ${nextDueDate.toISOString().split('T')[0]}`);
          
          // Resetear el gasto fijo para próximo ciclo
          await expense.update({
            paymentStatus: 'unpaid',
            paidAmount: 0,
            paidDate: null,
            nextDueDate: nextDueDate.toISOString().split('T')[0]
          });
          
          resetCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error reseteando ${expense.name}: ${error.message}`);
      }
    }

    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ [CRON SIMPLE] Proceso completado en ${duration}s`);
    console.log(`   🔄 Gastos reseteados: ${resetCount}`);
    console.log(`   ⚠️  NO se generaron expenses automáticamente`);
    console.log(`   💡 Expenses se generarán cuando registres pagos`);

  } catch (error) {
    console.error(`\n❌ [CRON SIMPLE] Error:`, error);
  }
};

module.exports = {
  onlyResetPaidExpenses
};