require('dotenv').config();
const { Expense, FixedExpense, FixedExpensePayment } = require('./src/data');
const { Op } = require('sequelize');

async function findDuplicationsData() {
  try {
    console.log('📊 Base de datos:', process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'LOCAL (Desarrollo)');
    console.log('🔍 Buscando datos de duplicaciones...\n');

    // 1️⃣ Buscar datos recientes en Expenses
    console.log('📅 Buscando gastos de los últimos días de noviembre y primeros de diciembre:');
    const recentExpenses = await Expense.findAll({
      where: {
        date: {
          [Op.between]: ['2025-11-28', '2025-12-05']
        }
      },
      attributes: ['idExpense', 'amount', 'date', 'typeExpense', 'notes', 'paymentMethod', 'paymentStatus', 'vendor'],
      order: [['date', 'DESC'], ['amount', 'DESC']],
      limit: 20
    });

    console.log(`💰 Gastos encontrados: ${recentExpenses.length}`);
    recentExpenses.forEach(expense => {
      console.log(`  - ${expense.date}: $${expense.amount} (${expense.typeExpense}) - ${expense.notes || 'Sin notas'}`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // 2️⃣ Buscar datos recientes en FixedExpensePayments
    console.log('📅 Buscando pagos de gastos fijos de los últimos días:');
    const recentPayments = await FixedExpensePayment.findAll({
      where: {
        paymentDate: {
          [Op.between]: ['2025-11-28', '2025-12-05']
        }
      },
      include: [{
        model: FixedExpense,
        as: 'fixedExpense',
        attributes: ['idFixedExpense', 'name', 'totalAmount']
      }],
      attributes: ['idPayment', 'amount', 'paymentDate', 'paymentMethod', 'notes', 'fixedExpenseId'],
      order: [['paymentDate', 'DESC'], ['amount', 'DESC']],
      limit: 20
    });

    console.log(`🏠 Pagos de gastos fijos encontrados: ${recentPayments.length}`);
    recentPayments.forEach(payment => {
      console.log(`  - ${payment.paymentDate}: $${payment.amount} - ${payment.fixedExpense?.name || 'Sin nombre'} (${payment.notes || 'Sin notas'})`);
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // 3️⃣ Buscar específicamente los montos que mencionaste
    console.log('🔍 Buscando específicamente los montos $450, $240, $1000 en noviembre-diciembre:');
    const targetAmounts = [450.00, 240.00, 1000.00];

    for (const amount of targetAmounts) {
      console.log(`\n💰 Buscando monto: $${amount}`);
      
      // Buscar en gastos
      const expensesWithAmount = await Expense.findAll({
        where: {
          amount: amount,
          date: {
            [Op.between]: ['2025-11-01', '2025-12-31']
          }
        },
        attributes: ['idExpense', 'amount', 'date', 'typeExpense', 'notes', 'paymentMethod', 'relatedFixedExpenseId'],
        order: [['date', 'DESC']]
      });

      // Buscar en pagos de gastos fijos
      const paymentsWithAmount = await FixedExpensePayment.findAll({
        where: {
          amount: amount,
          paymentDate: {
            [Op.between]: ['2025-11-01', '2025-12-31']
          }
        },
        include: [{
          model: FixedExpense,
          as: 'fixedExpense',
          attributes: ['idFixedExpense', 'name']
        }],
        attributes: ['idPayment', 'amount', 'paymentDate', 'notes', 'fixedExpenseId'],
        order: [['paymentDate', 'DESC']]
      });

      console.log(`  📄 Gastos generales: ${expensesWithAmount.length}`);
      expensesWithAmount.forEach(exp => {
        console.log(`    - ${exp.date}: $${exp.amount} (${exp.typeExpense}) - ${exp.notes || 'Sin notas'}`);
        if (exp.relatedFixedExpenseId) {
          console.log(`      ⚠️  Tiene relatedFixedExpenseId: ${exp.relatedFixedExpenseId}`);
        }
      });

      console.log(`  🏠 Pagos de gastos fijos: ${paymentsWithAmount.length}`);
      paymentsWithAmount.forEach(pay => {
        console.log(`    - ${pay.paymentDate}: $${pay.amount} - ${pay.fixedExpense?.name || 'Sin nombre'} (${pay.notes || 'Sin notas'})`);
      });

      if (expensesWithAmount.length > 0 && paymentsWithAmount.length > 0) {
        console.log(`    ⚠️  POSIBLE DUPLICACIÓN DETECTADA para $${amount}!`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✅ Búsqueda completada. Los datos se muestran arriba.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

findDuplicationsData();