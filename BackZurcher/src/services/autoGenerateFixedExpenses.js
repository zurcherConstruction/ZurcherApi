const cron = require('node-cron');
const { FixedExpense, Expense } = require('../data');
const { Op } = require('sequelize');

/**
 * 🔄 CRON JOB: Verificar FixedExpenses vencidos
 * 
 * Este servicio verifica diariamente si hay gastos fijos (FixedExpenses) 
 * que han llegado a su fecha de vencimiento (nextDueDate) y actualiza su estado.
 * 
 * ⚠️ IMPORTANTE: NO crea Expenses automáticamente.
 * Los Expenses solo se crean cuando el usuario registra el pago manualmente.
 * Esto evita duplicación de expenses.
 * 
 * Características:
 * - Se ejecuta todos los días a las 00:30 AM
 * - Solo procesa FixedExpenses con autoCreateExpense = true
 * - Solo procesa gastos activos (isActive = true)
 * - Marca como 'overdue' los gastos vencidos
 * - Actualiza automáticamente el nextDueDate para el próximo período
 * 
 * Flujo:
 * 1. Busca FixedExpenses vencidos (nextDueDate <= hoy)
 * 2. Actualiza su paymentStatus a 'overdue'
 * 3. Calcula y actualiza el nextDueDate del FixedExpense
 * 4. Registra todo en consola para auditoría
 */

/**
 * Función auxiliar para calcular la siguiente fecha de vencimiento
 * @param {Date} currentDueDate - Fecha de vencimiento actual
 * @param {string} frequency - Frecuencia del gasto fijo
 * @returns {Date} - Nueva fecha de vencimiento
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
    case 'one_time':
      return null; // No hay próxima fecha para gastos únicos
    default:
      next.setMonth(current.getMonth() + 1); // Default: mensual
  }

  return next;
}

/**
 * Función auxiliar para obtener la fecha actual en formato local (sin UTC)
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Función principal que verifica y genera expenses para fixed expenses vencidos
 */
const checkAndGenerateFixedExpenses = async () => {
  const startTime = new Date();
  console.log(`\n⏰ [CRON - FIXED EXPENSES] Iniciando verificación de gastos fijos vencidos - ${startTime.toISOString()}`);
  
  try {
    // Obtener fecha actual en zona local (sin problemas de UTC)
    const todayString = getLocalDateString();
    const today = new Date(todayString + 'T00:00:00');
    
    console.log(`📅 [CRON - FIXED EXPENSES] Fecha de verificación: ${todayString}`);

    // 🔍 Buscar FixedExpenses vencidos que cumplan las condiciones
    const dueExpenses = await FixedExpense.findAll({
      where: {
        isActive: true,                        // Solo activos
        autoCreateExpense: true,                // Solo los que tienen auto-generación habilitada
        paymentStatus: {
          [Op.in]: ['unpaid', 'overdue']       // Sin pagar o ya vencidos
        },
        nextDueDate: {
          [Op.lte]: today                       // Vencidos o que vencen hoy
        }
      },
      order: [['nextDueDate', 'ASC']]
    });

    if (dueExpenses.length === 0) {
      console.log(`✅ [CRON - FIXED EXPENSES] No se encontraron gastos fijos vencidos para procesar.`);
      return;
    }

    console.log(`📊 [CRON - FIXED EXPENSES] ${dueExpenses.length} gasto(s) fijo(s) vencido(s) encontrado(s):`);
    
    let successCount = 0;
    let errorCount = 0;

    // 🔄 Procesar cada FixedExpense vencido
    for (const fixedExpense of dueExpenses) {
      try {
        console.log(`\n  ⚙️ Procesando: "${fixedExpense.name}" (ID: ${fixedExpense.idFixedExpense})`);
        console.log(`     💰 Monto: $${fixedExpense.totalAmount}`);
        console.log(`     📆 Fecha vencimiento: ${fixedExpense.nextDueDate}`);
        console.log(`     🔁 Frecuencia: ${fixedExpense.frequency}`);

        // ⚠️ CAMBIO: Ya NO creamos Expense automáticamente
        // Solo marcamos el FixedExpense como 'overdue'

        // 📅 Calcular la próxima fecha de vencimiento
        let newNextDueDate = null;
        
        if (fixedExpense.frequency !== 'one_time') {
          newNextDueDate = calculateNextDueDate(fixedExpense.nextDueDate, fixedExpense.frequency);
          console.log(`     📆 Próxima fecha calculada: ${newNextDueDate.toISOString().split('T')[0]}`);
        } else {
          console.log(`     ⚠️ Gasto único (one_time) - No se calculará próxima fecha`);
        }

        // ✅ Actualizar el FixedExpense: marcar como 'overdue' y calcular siguiente vencimiento
        await fixedExpense.update({ 
          paymentStatus: 'overdue',
          nextDueDate: newNextDueDate
        });

        console.log(`     ✅ FixedExpense marcado como vencido. Expense se creará al registrar el pago.`);
        successCount++;

      } catch (error) {
        console.error(`     ❌ Error procesando "${fixedExpense.name}" (ID: ${fixedExpense.idFixedExpense}):`, error.message);
        errorCount++;
      }
    }

    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✅ [CRON - FIXED EXPENSES] Verificación completada en ${duration}s`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📊 Total procesados: ${dueExpenses.length}`);

  } catch (error) {
    console.error(`\n❌ [CRON - FIXED EXPENSES] Error general en la verificación:`, error);
    console.error(error.stack);
  }
};

/**
 * Inicializar el CRON JOB
 * Ejecuta la verificación todos los días a las 00:30 AM
 */
const startFixedExpensesCron = () => {
  console.log('🚀 [CRON - FIXED EXPENSES] Servicio de auto-generación de gastos fijos iniciado');
  console.log('   ⏰ Se ejecutará todos los días a las 00:30 AM');
  
  // Ejecutar todos los días a las 00:30 AM
  // Formato: '0 30 0 * * *' = segundo 0, minuto 30, hora 0 (medianoche), todos los días
  cron.schedule('0 30 0 * * *', async () => {
    await checkAndGenerateFixedExpenses();
  });

  // 🆕 OPCIONAL: Ejecutar inmediatamente al iniciar el servidor (solo para testing)
  // Descomentar la siguiente línea si quieres que se ejecute al iniciar:
  // setTimeout(() => checkAndGenerateFixedExpenses(), 5000); // 5 segundos después del inicio
};

module.exports = {
  startFixedExpensesCron,
  checkAndGenerateFixedExpenses // Exportar también para poder ejecutarlo manualmente
};
