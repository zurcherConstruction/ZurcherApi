/**
 * 🔍 Debug Script: Investigar inconsistencias en FixedExpenses
 * 
 * Analiza por qué algunos gastos fijos no aparecen como pagados
 */

const { FixedExpense, FixedExpensePayment, Expense } = require('./src/data');
const { Op } = require('sequelize');

async function debugFixedExpenses() {
  try {
    console.log('🔗 Conectando a base de datos...\n');

    const currentMonth = 12;
    const currentYear = 2025;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🔍 ANÁLISIS DETALLADO DE GASTOS FIJOS - DICIEMBRE 2025');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`📅 Rango: ${monthStart} a ${monthEnd}\n`);

    // 1. Obtener TODOS los gastos fijos activos
    const allFixedExpenses = await FixedExpense.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    console.log(`📋 Total gastos fijos activos: ${allFixedExpenses.length}\n`);

    // 2. Para cada gasto fijo, analizar sus pagos
    for (const expense of allFixedExpenses) {
      console.log(`\n┌─────────────────────────────────────────────────────────────────────────┐`);
      console.log(`│ 💰 ${expense.name.padEnd(65)} │`);
      console.log(`└─────────────────────────────────────────────────────────────────────────┘`);
      
      console.log(`   📊 Monto total: $${parseFloat(expense.totalAmount || 0).toFixed(2)}`);
      console.log(`   📊 Monto pagado: $${parseFloat(expense.paidAmount || 0).toFixed(2)}`);
      console.log(`   📊 Categoría: ${expense.category}`);
      console.log(`   📊 Frecuencia: ${expense.frequency}`);
      console.log(`   📊 Activo: ${expense.isActive ? 'Sí' : 'No'}`);
      
      // Obtener TODOS los pagos de este gasto fijo
      const allPayments = await FixedExpensePayment.findAll({
        where: { fixedExpenseId: expense.idFixedExpense },
        order: [['paymentDate', 'DESC']],
        include: [
          {
            model: Expense,
            as: 'generatedExpense',
            attributes: ['idExpense', 'date', 'amount', 'typeExpense'],
            required: false
          }
        ]
      });

      console.log(`   📋 Total de pagos registrados: ${allPayments.length}`);

      if (allPayments.length > 0) {
        console.log('   \n   📅 HISTORIAL DE PAGOS:');
        
        let totalPagado = 0;
        let pagosDiciembre = 0;
        
        allPayments.forEach((payment, index) => {
          const paymentDate = new Date(payment.paymentDate);
          const amount = parseFloat(payment.amount || 0);
          const isDecember = paymentDate.getMonth() === 11 && paymentDate.getFullYear() === 2025;
          
          totalPagado += amount;
          if (isDecember) pagosDiciembre += amount;
          
          console.log(`     ${index + 1}. 📅 ${paymentDate.toLocaleDateString()} - $${amount.toFixed(2)} ${isDecember ? '✅ (Diciembre)' : '❌ (Otro mes)'}`);
          
          if (payment.notes) {
            console.log(`        💬 Notas: ${payment.notes}`);
          }
          
          if (payment.generatedExpense) {
            console.log(`        🔗 Expense generado: ${payment.generatedExpense.idExpense} ($${parseFloat(payment.generatedExpense.amount).toFixed(2)})`);
          }
        });
        
        console.log(`   \n   💰 RESUMEN:`);
        console.log(`     - Total pagado (histórico): $${totalPagado.toFixed(2)}`);
        console.log(`     - Pagado en diciembre: $${pagosDiciembre.toFixed(2)}`);
        console.log(`     - Registrado en modelo: $${parseFloat(expense.paidAmount || 0).toFixed(2)}`);
        
        // Verificar discrepancias
        const discrepancia = Math.abs(totalPagado - parseFloat(expense.paidAmount || 0));
        if (discrepancia > 0.01) {
          console.log(`     ⚠️  DISCREPANCIA: Diferencia de $${discrepancia.toFixed(2)} entre pagos y modelo`);
        }
        
        // Status para diciembre
        const shouldAppearPaid = pagosDiciembre > 0;
        console.log(`     📊 ¿Debería aparecer pagado en diciembre? ${shouldAppearPaid ? '✅ SÍ' : '❌ NO'}`);
        
      } else {
        console.log('     ❌ No hay pagos registrados');
      }
    }

    // 3. Buscar pagos huérfanos (sin FixedExpense padre)
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICACIÓN DE INTEGRIDAD');
    console.log('═══════════════════════════════════════════════════════════════════════════');

    const allPayments = await FixedExpensePayment.findAll({
      include: [
        {
          model: FixedExpense,
          as: 'fixedExpense',
          required: false
        }
      ]
    });

    const orphanPayments = allPayments.filter(p => !p.fixedExpense);
    
    console.log(`\n📊 Total pagos: ${allPayments.length}`);
    console.log(`📊 Pagos huérfanos: ${orphanPayments.length}`);

    if (orphanPayments.length > 0) {
      console.log('\n⚠️  PAGOS HUÉRFANOS (sin FixedExpense padre):');
      orphanPayments.forEach(payment => {
        console.log(`   - ID: ${payment.idPayment} | Fecha: ${payment.paymentDate} | Monto: $${payment.amount}`);
      });
    }

    // 4. Verificar Expenses tipo "Gasto Fijo" vs FixedExpensePayments
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🔍 EXPENSES TIPO "Gasto Fijo" VS FIXED EXPENSE PAYMENTS');
    console.log('═══════════════════════════════════════════════════════════════════════════');

    const gastoFijoExpenses = await Expense.findAll({
      where: { 
        typeExpense: 'Gasto Fijo',
        date: { [Op.between]: [monthStart, monthEnd] }
      },
      order: [['date', 'DESC']]
    });

    const fixedExpensePaymentsDic = await FixedExpensePayment.findAll({
      where: {
        paymentDate: { [Op.between]: [monthStart, monthEnd] }
      },
      include: [
        {
          model: Expense,
          as: 'generatedExpense',
          required: false
        }
      ]
    });

    console.log(`\n📊 Expenses tipo "Gasto Fijo" en diciembre: ${gastoFijoExpenses.length}`);
    console.log(`📊 FixedExpensePayments en diciembre: ${fixedExpensePaymentsDic.length}`);

    const expensesLinked = fixedExpensePaymentsDic.filter(p => p.generatedExpense).length;
    const expensesUnlinked = fixedExpensePaymentsDic.filter(p => !p.generatedExpense).length;

    console.log(`📊 Payments con Expense vinculado: ${expensesLinked}`);
    console.log(`📊 Payments sin Expense vinculado: ${expensesUnlinked}`);

    if (expensesUnlinked > 0) {
      console.log('\n⚠️  PAYMENTS SIN EXPENSE VINCULADO:');
      fixedExpensePaymentsDic
        .filter(p => !p.generatedExpense)
        .forEach(payment => {
          console.log(`   - ${payment.paymentDate} | $${payment.amount} | ${payment.notes || 'Sin notas'}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ Análisis completado');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  debugFixedExpenses()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = debugFixedExpenses;