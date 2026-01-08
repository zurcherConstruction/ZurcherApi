const { FixedExpense } = require('./src/data');
const conn = require('./src/data');

/**
 * Script para auto-desactivar gastos one_time completamente pagados
 * Uso: node deactivate-completed-onetime-expenses.js
 */

async function deactivateCompletedOneTimeExpenses() {
  try {
    console.log('\n🔄 DESACTIVADOR DE GASTOS ONE_TIME COMPLETADOS\n');
    console.log('=' .repeat(80));

    // Buscar gastos one_time que:
    // 1. Estén activos (isActive = true)
    // 2. Tengan frecuencia = one_time
    // 3. Estén completamente pagados (paidAmount >= totalAmount)
    const completedOneTimeExpenses = await FixedExpense.findAll({
      where: {
        frequency: 'one_time',
        isActive: true
      },
      raw: true,
      order: [['name', 'ASC']]
    });

    if (completedOneTimeExpenses.length === 0) {
      console.log('\n✅ No hay gastos one_time activos incompletos.\n');
      process.exit(0);
    }

    console.log(`\n📋 Gastos one_time activos encontrados: ${completedOneTimeExpenses.length}\n`);

    // Filtrar solo los que están completamente pagados
    const toDeactivate = completedOneTimeExpenses.filter(expense => {
      const totalAmount = parseFloat(expense.totalAmount);
      const paidAmount = parseFloat(expense.paidAmount || 0);
      return paidAmount >= totalAmount;
    });

    if (toDeactivate.length === 0) {
      console.log('✅ Todos los gastos one_time activos están incompletos. No hay nada que desactivar.\n');
      process.exit(0);
    }

    console.log(`\n🔴 Gastos one_time COMPLETAMENTE PAGADOS (a desactivar): ${toDeactivate.length}\n`);
    
    toDeactivate.forEach((expense, idx) => {
      const totalAmount = parseFloat(expense.totalAmount);
      const paidAmount = parseFloat(expense.paidAmount || 0);
      const percentage = ((paidAmount / totalAmount) * 100).toFixed(1);
      
      console.log(`${String(idx + 1).padStart(2)}. ${expense.name}`);
      console.log(`    • Monto: $${totalAmount.toFixed(2)}`);
      console.log(`    • Pagado: $${paidAmount.toFixed(2)} (${percentage}%)`);
      console.log(`    • Próx. Vencimiento: ${expense.nextDueDate || 'N/A'}\n`);
    });

    console.log('=' .repeat(80));
    console.log(`\n⚠️  Se desactivarán ${toDeactivate.length} gasto(s).\n`);

    // Confirmar
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('¿Proceder con la desactivación? (s/n): ', async (answer) => {
      if (answer.toLowerCase() !== 's') {
        console.log('\n❌ Operación cancelada.\n');
        rl.close();
        process.exit(0);
      }

      console.log('\n⏳ Desactivando gastos...\n');

      let successCount = 0;
      let errorCount = 0;

      for (const expense of toDeactivate) {
        try {
          await FixedExpense.update(
            { isActive: false },
            { where: { idFixedExpense: expense.idFixedExpense } }
          );
          console.log(`✅ ${expense.name}`);
          successCount++;
        } catch (error) {
          console.error(`❌ ${expense.name}: ${error.message}`);
          errorCount++;
        }
      }

      console.log('\n' + '=' .repeat(80));
      console.log(`\n✅ Proceso completado`);
      console.log(`   • Desactivados: ${successCount}`);
      console.log(`   • Errores: ${errorCount}\n`);

      rl.close();
      await conn.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deactivateCompletedOneTimeExpenses();
