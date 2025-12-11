/**
 * 🔍 Verificador de Integración Bancaria para Gastos Fijos
 * 
 * Verifica si al pagar gastos fijos se genera:
 * - ✅ Expense correcto
 * - ✅ BankTransaction correspondiente
 * - ✅ Relaciones correctas
 * 
 * Uso: node verify-fixed-expenses-banking-integration.js
 */

const { FixedExpense, FixedExpensePayment, Expense, BankTransaction, BankAccount } = require('./src/data');
const { Op } = require('sequelize');

async function verifyFixedExpensesBankingIntegration() {
  try {
    console.log('🔗 Conectando a base de datos...');
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║           🔍 VERIFICACIÓN INTEGRACIÓN BANCARIA - GASTOS FIJOS        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log(`📅 Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 1️⃣ VERIFICAR EXPENSES GENERADOS DESDE FIXED EXPENSES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│                   1️⃣  EXPENSES DE GASTOS FIJOS                         │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // Buscar Expenses que fueron generados desde FixedExpenses
    const fixedExpenseExpenses = await Expense.findAll({
      where: {
        relatedFixedExpenseId: { [Op.ne]: null }
      },
      include: [
        {
          model: FixedExpense,
          as: 'relatedFixedExpense',
          attributes: ['idFixedExpense', 'name', 'category'],
          required: false
        }
      ],
      order: [['date', 'DESC']],
      limit: 20
    });

    console.log(`📊 Total Expenses generados desde FixedExpenses: ${fixedExpenseExpenses.length}\n`);

    if (fixedExpenseExpenses.length > 0) {
      console.log('┌─────────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Fecha      │ Gasto Fijo                  │ Monto       │ Método Pago          │ Estado │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
      
      fixedExpenseExpenses.slice(0, 10).forEach(expense => {
        const date = expense.date || 'N/A';
        const name = (expense.relatedFixedExpense?.name || 'SIN RELACIÓN').substring(0, 26).padEnd(26);
        const amount = `$${parseFloat(expense.amount || 0).toFixed(2)}`.padStart(11);
        const method = (expense.paymentMethod || 'N/A').substring(0, 18).padEnd(18);
        const verified = expense.verified ? '✅' : '❌';
        
        console.log(`│ ${date.padEnd(10)} │ ${name} │ ${amount} │ ${method} │ ${verified}    │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────────────────┘');
    } else {
      console.log('⚠️  No se encontraron Expenses generados desde FixedExpenses');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 2️⃣ VERIFICAR TRANSACCIONES BANCARIAS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│                 2️⃣  TRANSACCIONES BANCARIAS                            │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // Verificar si existe relación entre Expense y BankTransaction
    const bankTransactions = await BankTransaction.findAll({
      where: {
        description: { [Op.like]: '%Gasto Fijo%' }
      },
      include: [
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['accountName', 'accountType'],
          required: false
        }
      ],
      order: [['date', 'DESC']],
      limit: 10
    });

    console.log(`📊 Transacciones bancarias relacionadas a gastos fijos: ${bankTransactions.length}\n`);

    if (bankTransactions.length > 0) {
      console.log('┌─────────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Fecha      │ Cuenta                   │ Tipo        │ Monto       │ Descripción        │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
      
      bankTransactions.forEach(transaction => {
        const date = transaction.date || 'N/A';
        const account = (transaction.bankAccount?.accountName || 'N/A').substring(0, 23).padEnd(23);
        const type = transaction.transactionType.padEnd(11);
        const amount = `$${parseFloat(transaction.amount || 0).toFixed(2)}`.padStart(11);
        const desc = (transaction.description || '').substring(0, 16).padEnd(16);
        
        console.log(`│ ${date.padEnd(10)} │ ${account} │ ${type} │ ${amount} │ ${desc}   │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────────────────┘');
    } else {
      console.log('⚠️  No se encontraron transacciones bancarias específicas de gastos fijos');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 3️⃣ VERIFICAR INTEGRIDAD DE LA RELACIÓN
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│                  3️⃣  VERIFICACIÓN DE INTEGRIDAD                       │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // Verificar expenses sin relación a FixedExpense pero de tipo "Gasto Fijo"
    const orphanedFixedExpenses = await Expense.findAll({
      where: {
        typeExpense: 'Gasto Fijo',
        relatedFixedExpenseId: null
      }
    });

    // Verificar FixedExpenses pagados sin Expense asociado  
    const fixedExpensesPaid = await FixedExpense.findAll({
      where: {
        paidAmount: { [Op.gt]: 0 }
      }
    });

    const fixedExpensesWithoutExpense = [];
    for (const fe of fixedExpensesPaid) {
      const hasExpense = await Expense.findOne({
        where: { relatedFixedExpenseId: fe.idFixedExpense }
      });
      if (!hasExpense) {
        fixedExpensesWithoutExpense.push(fe);
      }
    }

    console.log('📊 Verificaciones de integridad:\n');
    console.log(`🔍 Expenses "Gasto Fijo" sin relación: ${orphanedFixedExpenses.length}`);
    console.log(`🔍 FixedExpenses pagados sin Expense: ${fixedExpensesWithoutExpense.length}`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 4️⃣ ANÁLISIS DE FLUJO DE PAGO
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│                   4️⃣  ANÁLISIS DE FLUJO DE PAGO                       │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // Analizar el flujo: FixedExpense -> Expense -> BankTransaction
    let correctFlowCount = 0;
    let incompleteFlowCount = 0;

    console.log('\n🔄 Analizando flujo de pagos recientes:\n');

    for (const expense of fixedExpenseExpenses.slice(0, 5)) {
      console.log(`📋 Expense: ${expense.relatedFixedExpense?.name || 'Sin nombre'}`);
      console.log(`   💰 Monto: $${expense.amount}`);
      console.log(`   📅 Fecha: ${expense.date}`);
      console.log(`   💳 Método: ${expense.paymentMethod}`);
      
      // Buscar BankTransaction correspondiente
      const relatedBankTransaction = await BankTransaction.findOne({
        where: {
          amount: expense.amount,
          date: expense.date,
          transactionType: 'withdrawal'
        }
      });

      if (relatedBankTransaction) {
        console.log(`   ✅ BankTransaction encontrada: ${relatedBankTransaction.description}`);
        correctFlowCount++;
      } else {
        console.log(`   ❌ BankTransaction NO encontrada`);
        incompleteFlowCount++;
      }
      console.log('');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                        📊 RESUMEN DE VERIFICACIÓN                    ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    console.log('🔧 COMPONENTES DEL SISTEMA:');
    console.log(`   📦 FixedExpenses con pagos: ${fixedExpensesPaid.length}`);
    console.log(`   📦 Expenses de gastos fijos: ${fixedExpenseExpenses.length}`);
    console.log(`   📦 BankTransactions relacionadas: ${bankTransactions.length}`);
    
    console.log('\n✅ FLUJOS COMPLETOS:');
    console.log(`   🔗 FixedExpense → Expense → BankTransaction: ${correctFlowCount}`);
    
    console.log('\n⚠️  PROBLEMAS DETECTADOS:');
    console.log(`   🔴 Expenses huérfanos: ${orphanedFixedExpenses.length}`);
    console.log(`   🔴 FixedExpenses sin Expense: ${fixedExpensesWithoutExpense.length}`);
    console.log(`   🔴 Flujos incompletos: ${incompleteFlowCount}`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 CONCLUSIONES Y RECOMENDACIONES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🎯 CONCLUSIONES Y RECOMENDACIONES                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    if (fixedExpenseExpenses.length > 0) {
      console.log('✅ POSITIVO: Se están generando Expenses desde FixedExpenses');
    } else {
      console.log('🔴 PROBLEMA: No se están generando Expenses desde FixedExpenses');
    }

    if (bankTransactions.length === 0) {
      console.log('⚠️  FALTA: Integración automática con BankTransactions');
      console.log('   💡 RECOMENDACIÓN: Implementar creación automática de BankTransaction');
      console.log('      al generar Expense desde FixedExpense');
    } else {
      console.log('✅ POSITIVO: Existen registros de transacciones bancarias');
    }

    if (correctFlowCount < fixedExpenseExpenses.length / 2) {
      console.log('⚠️  MEJORA: El flujo completo no funciona en todos los casos');
      console.log('   💡 RECOMENDACIÓN: Agregar trigger automático para crear BankTransaction');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ Verificación completada');
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyFixedExpensesBankingIntegration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = verifyFixedExpensesBankingIntegration;