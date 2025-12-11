/**
 * 🔧 Fix Script: Sincronizar paidAmount en FixedExpenses
 * 
 * Problema: Los FixedExpensePayments se registran correctamente pero
 * el campo paidAmount en FixedExpense no se actualiza automáticamente
 * 
 * Solución: Calcular y actualizar paidAmount basado en la suma de pagos
 */

const { FixedExpense, FixedExpensePayment } = require('./src/data');
const { Op, fn, col } = require('sequelize');

async function syncFixedExpensesPaidAmounts() {
  try {
    console.log('🔗 Conectando a base de datos...\n');

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🔧 SINCRONIZACIÓN DE PAID AMOUNTS EN FIXED EXPENSES');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // 1. Obtener todos los FixedExpenses activos
    const fixedExpenses = await FixedExpense.findAll({
      where: { isActive: true }
    });

    console.log(`📋 Total de gastos fijos activos: ${fixedExpenses.length}\n`);

    let totalFixed = 0;
    let totalUpdated = 0;

    for (const expense of fixedExpenses) {
      console.log(`\n🔍 Procesando: ${expense.name}`);
      
      // 2. Calcular total pagado basado en FixedExpensePayments
      const totalPaid = await FixedExpensePayment.sum('amount', {
        where: { fixedExpenseId: expense.idFixedExpense }
      }) || 0;

      const currentPaidAmount = parseFloat(expense.paidAmount || 0);
      
      console.log(`   💰 Pagado actual en modelo: $${currentPaidAmount.toFixed(2)}`);
      console.log(`   💰 Pagado según payments: $${totalPaid.toFixed(2)}`);

      // 3. Solo actualizar si hay diferencia
      const difference = Math.abs(totalPaid - currentPaidAmount);
      
      if (difference > 0.01) { // Diferencia mayor a 1 centavo
        console.log(`   🔧 Actualizando paidAmount: $${currentPaidAmount.toFixed(2)} → $${totalPaid.toFixed(2)}`);
        
        await expense.update({
          paidAmount: totalPaid
        });

        totalUpdated++;
        console.log(`   ✅ Actualizado correctamente`);
      } else {
        console.log(`   ✅ Ya está sincronizado`);
      }

      totalFixed++;
    }

    // 4. Verificación final
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICACIÓN FINAL');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // Obtener datos actualizados para verificar
    const verification = await FixedExpense.findAll({
      where: { isActive: true },
      include: [
        {
          model: FixedExpensePayment,
          as: 'payments',
          attributes: []
        }
      ],
      attributes: [
        'idFixedExpense',
        'name',
        'totalAmount',
        'paidAmount',
        [fn('COALESCE', fn('SUM', col('payments.amount')), 0), 'calculatedPaid']
      ],
      group: ['FixedExpense.idFixedExpense'],
      raw: true
    });

    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Gasto Fijo                    │ Total     │ Pagado    │ Calculado │ OK  │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    let discrepancies = 0;

    verification.forEach(item => {
      const name = item.name.substring(0, 28).padEnd(28);
      const total = `$${parseFloat(item.totalAmount || 0).toFixed(2)}`.padStart(9);
      const paid = `$${parseFloat(item.paidAmount || 0).toFixed(2)}`.padStart(9);
      const calculated = `$${parseFloat(item.calculatedPaid || 0).toFixed(2)}`.padStart(9);
      
      const isOk = Math.abs(parseFloat(item.paidAmount || 0) - parseFloat(item.calculatedPaid || 0)) < 0.01;
      const status = isOk ? ' ✅ ' : ' ❌ ';
      
      if (!isOk) discrepancies++;
      
      console.log(`│ ${name} │ ${total} │ ${paid} │ ${calculated} │${status}│`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // 5. Resumen
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE SINCRONIZACIÓN');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    console.log(`✅ Gastos fijos procesados: ${totalFixed}`);
    console.log(`🔧 Gastos actualizados: ${totalUpdated}`);
    console.log(`⚠️  Discrepancias restantes: ${discrepancies}`);

    if (discrepancies === 0) {
      console.log('\n🎉 ¡PERFECTO! Todos los gastos fijos están sincronizados correctamente');
    } else {
      console.log('\n⚠️  Aún hay discrepancias. Verificar datos manualmente.');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ Sincronización completada');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // 6. Mostrar el impacto en el reporte mensual
    console.log('🔄 Para ver los cambios reflejados, ejecuta:');
    console.log('node verify-monthly-finances.js\n');

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  syncFixedExpensesPaidAmounts()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = syncFixedExpensesPaidAmounts;