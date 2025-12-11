/**
 * 📊 Script de Verificación de Finanzas del Mes Actual
 * 
 * ✅ Verifica:
 * - FixedExpenses (gastos fijos) activos
 * - Expenses del mes actual
 * - Income del mes actual
 * - Balance y resumen
 * 
 * Uso: node verify-monthly-finances.js
 */

const { FixedExpense, FixedExpensePayment, Expense, Income, Staff, Work, Budget } = require('./src/data');
const { Op } = require('sequelize');

async function verifyMonthlyFinances() {
  try {
    console.log('🔗 Conectando a base de datos...');
    
    // Obtener fecha actual
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = new Date(currentYear, currentMonth, 0); // Último día del mes
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 REPORTE FINANCIERO MENSUAL                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log(`📅 Período: ${monthStart} a ${monthEndStr}`);
    console.log(`📆 Fecha de reporte: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\n`);

    // ════════════════════════════════════════════════════════════════════════════════
    // 💰 GASTOS FIJOS (FIXED EXPENSES)
    // ════════════════════════════════════════════════════════════════════════════════
    
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                         💰 GASTOS FIJOS                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    const activeFixedExpenses = await FixedExpense.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { endDate: null }, // Sin fecha de fin
          { endDate: { [Op.gte]: monthStart } } // O que termine después del inicio del mes
        ]
      },
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: FixedExpensePayment,
          as: 'payments',
          where: {
            paymentDate: {
              [Op.between]: [monthStart, monthEndStr]
            }
          },
          required: false,
          attributes: ['idPayment', 'amount', 'paymentDate', 'notes']
        }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    let totalFixedExpensesAmount = 0;
    let totalFixedExpensesPaid = 0;

    console.log(`\n📋 Total de gastos fijos activos: ${activeFixedExpenses.length}`);
    
    if (activeFixedExpenses.length > 0) {
      console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Gasto Fijo                    │ Categoría       │ Monto    │ Pagado    │');
      console.log('├─────────────────────────────────────────────────────────────────────────┤');
      
      activeFixedExpenses.forEach(expense => {
        const monthlyAmount = parseFloat(expense.totalAmount || 0);
        const paidThisMonth = expense.payments?.reduce((sum, payment) => 
          sum + parseFloat(payment.amount || 0), 0) || 0;
        
        totalFixedExpensesAmount += monthlyAmount;
        totalFixedExpensesPaid += paidThisMonth;
        
        const name = expense.name.substring(0, 28).padEnd(28);
        const category = expense.category.substring(0, 13).padEnd(13);
        const amount = `$${monthlyAmount.toFixed(2)}`.padStart(8);
        const paid = `$${paidThisMonth.toFixed(2)}`.padStart(8);
        
        console.log(`│ ${name} │ ${category}   │ ${amount} │ ${paid} │`);
        
        // Mostrar detalles de pagos si los hay
        if (expense.payments && expense.payments.length > 0) {
          expense.payments.forEach(payment => {
            const paymentDate = new Date(payment.paymentDate).toLocaleDateString();
            const paymentAmount = `$${parseFloat(payment.amount).toFixed(2)}`;
            console.log(`│   └─ Pago: ${paymentDate} - ${paymentAmount}${payment.notes ? ` (${payment.notes})` : ''}`);
          });
        }
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────┘');
    } else {
      console.log('   ⚠️  No hay gastos fijos activos');
    }

    // ════════════════════════════════════════════════════════════════════════════════
    // 💸 EXPENSES DEL MES
    // ════════════════════════════════════════════════════════════════════════════════
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                           💸 GASTOS DEL MES                           ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    const monthlyExpenses = await Expense.findAll({
      where: {
        date: {
          [Op.between]: [monthStart, monthEndStr]
        }
      },
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Work,
          as: 'work',
          attributes: ['idWork', 'propertyAddress'],
          required: false
        }
      ],
      order: [['date', 'DESC'], ['typeExpense', 'ASC']]
    });

    // Agrupar expenses por tipo
    const expensesByType = {};
    let totalExpensesAmount = 0;

    monthlyExpenses.forEach(expense => {
      const type = expense.typeExpense;
      const amount = parseFloat(expense.amount || 0);
      
      if (!expensesByType[type]) {
        expensesByType[type] = {
          count: 0,
          total: 0,
          items: []
        };
      }
      
      expensesByType[type].count++;
      expensesByType[type].total += amount;
      expensesByType[type].items.push(expense);
      
      totalExpensesAmount += amount;
    });

    console.log(`\n📋 Total de gastos del mes: ${monthlyExpenses.length}`);
    console.log(`💰 Monto total de gastos: $${totalExpensesAmount.toFixed(2)}`);

    if (Object.keys(expensesByType).length > 0) {
      console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Tipo de Gasto                 │ Cantidad │ Monto Total  │ Promedio    │');
      console.log('├─────────────────────────────────────────────────────────────────────────┤');
      
      Object.keys(expensesByType)
        .sort((a, b) => expensesByType[b].total - expensesByType[a].total) // Ordenar por monto
        .forEach(type => {
          const data = expensesByType[type];
          const typeName = type.substring(0, 28).padEnd(28);
          const count = String(data.count).padStart(6);
          const total = `$${data.total.toFixed(2)}`.padStart(10);
          const average = `$${(data.total / data.count).toFixed(2)}`.padStart(9);
          
          console.log(`│ ${typeName} │ ${count}   │ ${total}   │ ${average}   │`);
        });
      
      console.log('└─────────────────────────────────────────────────────────────────────────┘');
    }

    // ════════════════════════════════════════════════════════════════════════════════
    // 💚 INCOME DEL MES
    // ════════════════════════════════════════════════════════════════════════════════
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                          💚 INGRESOS DEL MES                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    const monthlyIncomes = await Income.findAll({
      where: {
        date: {
          [Op.between]: [monthStart, monthEndStr]
        }
      },
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Work,
          as: 'work',
          attributes: ['idWork', 'propertyAddress'],
          required: false,
          include: [
            {
              model: Budget,
              as: 'budget',
              attributes: ['idBudget', 'invoiceNumber'],
              required: false
            }
          ]
        }
      ],
      order: [['date', 'DESC'], ['typeIncome', 'ASC']]
    });

    // Agrupar income por tipo
    const incomesByType = {};
    let totalIncomesAmount = 0;

    monthlyIncomes.forEach(income => {
      const type = income.typeIncome;
      const amount = parseFloat(income.amount || 0);
      
      if (!incomesByType[type]) {
        incomesByType[type] = {
          count: 0,
          total: 0,
          items: []
        };
      }
      
      incomesByType[type].count++;
      incomesByType[type].total += amount;
      incomesByType[type].items.push(income);
      
      totalIncomesAmount += amount;
    });

    console.log(`\n📋 Total de ingresos del mes: ${monthlyIncomes.length}`);
    console.log(`💰 Monto total de ingresos: $${totalIncomesAmount.toFixed(2)}`);

    if (Object.keys(incomesByType).length > 0) {
      console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Tipo de Ingreso               │ Cantidad │ Monto Total  │ Promedio    │');
      console.log('├─────────────────────────────────────────────────────────────────────────┤');
      
      Object.keys(incomesByType)
        .sort((a, b) => incomesByType[b].total - incomesByType[a].total) // Ordenar por monto
        .forEach(type => {
          const data = incomesByType[type];
          const typeName = type.substring(0, 28).padEnd(28);
          const count = String(data.count).padStart(6);
          const total = `$${data.total.toFixed(2)}`.padStart(10);
          const average = `$${(data.total / data.count).toFixed(2)}`.padStart(9);
          
          console.log(`│ ${typeName} │ ${count}   │ ${total}   │ ${average}   │`);
        });
      
      console.log('└─────────────────────────────────────────────────────────────────────────┘');
    }

    // ════════════════════════════════════════════════════════════════════════════════
    // 📊 RESUMEN Y BALANCE
    // ════════════════════════════════════════════════════════════════════════════════
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                        📊 RESUMEN FINANCIERO                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    const totalExpenses = totalFixedExpensesPaid + totalExpensesAmount;
    const netIncome = totalIncomesAmount - totalExpenses;
    const fixedExpensesUnpaid = totalFixedExpensesAmount - totalFixedExpensesPaid;

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│                      💰 BALANCE MENSUAL                      │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ 💚 Total Ingresos:           $${totalIncomesAmount.toFixed(2).padStart(12)} │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ 💸 Gastos Variables:         $${totalExpensesAmount.toFixed(2).padStart(12)} │`);
    console.log(`│ 🏠 Gastos Fijos Pagados:     $${totalFixedExpensesPaid.toFixed(2).padStart(12)} │`);
    console.log(`│ 💰 Total Gastos:             $${totalExpenses.toFixed(2).padStart(12)} │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    
    if (netIncome >= 0) {
      console.log(`│ ✅ Balance Neto:             $${netIncome.toFixed(2).padStart(12)} │`);
    } else {
      console.log(`│ ⚠️  Balance Neto:            $${netIncome.toFixed(2).padStart(12)} │`);
    }
    
    console.log('└─────────────────────────────────────────────────────────────┘');

    // Alertas y recomendaciones
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                      ⚠️  ALERTAS Y OBSERVACIONES                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    let hasAlerts = false;

    if (fixedExpensesUnpaid > 0) {
      console.log(`🔴 PENDIENTE: $${fixedExpensesUnpaid.toFixed(2)} en gastos fijos sin pagar este mes`);
      hasAlerts = true;
    }

    if (netIncome < 0) {
      console.log(`🔴 DÉFICIT: Balance negativo de $${Math.abs(netIncome).toFixed(2)}`);
      hasAlerts = true;
    }

    if (totalIncomesAmount === 0) {
      console.log('🟡 ADVERTENCIA: No hay ingresos registrados este mes');
      hasAlerts = true;
    }

    if (activeFixedExpenses.length === 0) {
      console.log('🟡 ADVERTENCIA: No hay gastos fijos configurados');
      hasAlerts = true;
    }

    // Verificaciones de integridad
    const expensesWithoutWork = monthlyExpenses.filter(e => !e.work && e.typeExpense !== 'Gastos Generales');
    if (expensesWithoutWork.length > 0) {
      console.log(`🟡 INTEGRIDAD: ${expensesWithoutWork.length} gastos sin Work asociado`);
      hasAlerts = true;
    }

    const incomesWithoutWork = monthlyIncomes.filter(i => !i.work);
    if (incomesWithoutWork.length > 0) {
      console.log(`🟡 INTEGRIDAD: ${incomesWithoutWork.length} ingresos sin Work asociado`);
      hasAlerts = true;
    }

    if (!hasAlerts) {
      console.log('✅ No hay alertas - Todo parece estar en orden');
    }

    // Estadísticas adicionales
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                       📈 ESTADÍSTICAS ADICIONALES                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Promedio de ingreso por transacción: $${monthlyIncomes.length > 0 ? (totalIncomesAmount / monthlyIncomes.length).toFixed(2) : '0.00'}`);
    console.log(`📊 Promedio de gasto por transacción: $${monthlyExpenses.length > 0 ? (totalExpensesAmount / monthlyExpenses.length).toFixed(2) : '0.00'}`);
    console.log(`📊 Ratio Ingresos/Gastos: ${totalExpenses > 0 ? (totalIncomesAmount / totalExpenses).toFixed(2) : 'N/A'}`);
    console.log(`📊 Gastos fijos como % del total: ${totalExpenses > 0 ? ((totalFixedExpensesPaid / totalExpenses) * 100).toFixed(1) : '0.0'}%`);

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ Reporte financiero completado exitosamente');
    console.log(`📅 Generado: ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error al generar reporte financiero:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyMonthlyFinances()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = verifyMonthlyFinances;