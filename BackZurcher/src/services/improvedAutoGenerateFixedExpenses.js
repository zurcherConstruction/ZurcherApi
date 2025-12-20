const cron = require('node-cron');
const { FixedExpense, FixedExpensePayment, Expense } = require('../data');
const { Op } = require('sequelize');

/**
 * 🔄 CRON JOB MEJORADO: Auto-generación completa de gastos fijos
 * 
 * Este servicio maneja automáticamente TODOS los aspectos de los gastos fijos:
 * 1. Generar expenses automáticamente cuando llega la fecha
 * 2. Resetear gastos pagados para el próximo ciclo  
 * 3. Actualizar nextDueDate correctamente
 * 4. Manejar frecuencias (weekly, biweekly, monthly, etc.)
 * 
 * Se ejecuta diariamente a las 00:30 AM
 */

/**
 * Calcular la siguiente fecha de vencimiento
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
 * Obtener fecha actual en formato local
 */
function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * PROCESO 1: Resetear gastos pagados para próximo ciclo
 */
async function resetPaidExpensesForNextCycle() {
  console.log('\n1️⃣ [CRON] Reseteando gastos pagados para próximo ciclo...');
  
  try {
    const today = new Date();
    
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

    console.log(`📊 [CRON] Gastos pagados encontrados: ${paidExpenses.length}`);

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
          
          console.log(`   📝 ${expense.name}: Último pago ${lastPayment.paymentDate} → Próximo ${nextDueDate.toISOString().split('T')[0]}`);
          
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

    console.log(`   ✅ Gastos reseteados: ${resetCount}`);
    return resetCount;

  } catch (error) {
    console.error('❌ Error en resetPaidExpensesForNextCycle:', error);
    return 0;
  }
}

/**
 * PROCESO 2: Generar expenses automáticamente para gastos vencidos
 */
async function generateAutomaticExpenses() {
  console.log('\n2️⃣ [CRON] Generando expenses automáticamente...');
  
  try {
    const todayString = getLocalDateString();
    const today = new Date(todayString + 'T00:00:00');
    
    // Buscar gastos fijos vencidos que necesitan expense
    const dueExpenses = await FixedExpense.findAll({
      where: {
        isActive: true,
        autoCreateExpense: true,
        paymentStatus: 'unpaid',
        nextDueDate: {
          [Op.lte]: today
        }
      },
      order: [['nextDueDate', 'ASC']]
    });

    console.log(`📊 [CRON] Gastos vencidos encontrados: ${dueExpenses.length}`);

    let generatedCount = 0;

    for (const expense of dueExpenses) {
      try {
        const dueDate = new Date(expense.nextDueDate);
        
        // Verificar si ya existe expense para esta fecha
        const existingExpense = await Expense.findOne({
          where: {
            relatedFixedExpenseId: expense.idFixedExpense,
            date: expense.nextDueDate
          }
        });

        if (existingExpense) {
          console.log(`   ⚠️ ${expense.name}: Ya existe expense para ${expense.nextDueDate}`);
          
          // Actualizar nextDueDate para próximo ciclo
          const nextDueDate = calculateNextDueDate(expense.nextDueDate, expense.frequency);
          await expense.update({
            nextDueDate: nextDueDate.toISOString().split('T')[0]
          });
          
          continue;
        }

        // Crear expense automático
        const newExpense = await Expense.create({
          date: expense.nextDueDate,
          amount: expense.totalAmount,
          typeExpense: 'Gasto Fijo',
          paymentMethod: expense.paymentMethod || 'Otro',
          paymentStatus: 'unpaid',
          notes: `${expense.name} - Auto-generado (${todayString})`,
          relatedFixedExpenseId: expense.idFixedExpense,
          staffId: expense.createdByStaffId
        });

        console.log(`   🤖 ${expense.name}: Expense generado $${expense.totalAmount} para ${expense.nextDueDate}`);

        // Actualizar nextDueDate para próximo ciclo
        const nextDueDate = calculateNextDueDate(expense.nextDueDate, expense.frequency);
        await expense.update({
          nextDueDate: nextDueDate.toISOString().split('T')[0]
        });

        generatedCount++;

      } catch (error) {
        console.error(`   ❌ Error generando expense para ${expense.name}: ${error.message}`);
      }
    }

    console.log(`   ✅ Expenses generados: ${generatedCount}`);
    return generatedCount;

  } catch (error) {
    console.error('❌ Error en generateAutomaticExpenses:', error);
    return 0;
  }
}

/**
 * Función principal del CRON mejorado
 */
const improvedFixedExpensesCron = async () => {
  const startTime = new Date();
  console.log(`\n🚀 [CRON MEJORADO] Iniciando auto-generación de gastos fijos - ${startTime.toISOString()}`);
  
  try {
    // Proceso 1: Resetear gastos pagados
    const resetCount = await resetPaidExpensesForNextCycle();
    
    // Proceso 2: Generar expenses automáticos
    const generatedCount = await generateAutomaticExpenses();
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ [CRON MEJORADO] Proceso completado en ${duration}s`);
    console.log(`   🔄 Gastos reseteados: ${resetCount}`);
    console.log(`   🤖 Expenses generados: ${generatedCount}`);
    console.log(`   📊 Total procesados: ${resetCount + generatedCount}`);

  } catch (error) {
    console.error(`\n❌ [CRON MEJORADO] Error general:`, error);
    console.error(error.stack);
  }
};

/**
 * Inicializar el CRON mejorado
 */
const startImprovedFixedExpensesCron = () => {
  console.log('🚀 [CRON MEJORADO] Servicio de auto-generación mejorado iniciado');
  console.log('   ⏰ Se ejecutará todos los días a las 00:30 AM');
  console.log('   🔄 Resetea gastos pagados automáticamente');
  console.log('   🤖 Genera expenses automáticamente');
  console.log('   📅 Actualiza nextDueDate correctamente');
  
  // Ejecutar todos los días a las 00:30 AM
  cron.schedule('0 30 0 * * *', async () => {
    await improvedFixedExpensesCron();
  });

  // Opción para ejecutar inmediatamente (testing)
  // setTimeout(() => improvedFixedExpensesCron(), 5000);
};

module.exports = {
  startImprovedFixedExpensesCron,
  improvedFixedExpensesCron,
  resetPaidExpensesForNextCycle,
  generateAutomaticExpenses
};