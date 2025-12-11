/**
 * 📊 Dashboard de Resumen de Gastos Fijos Mensuales
 * 
 * Genera un resumen visual con:
 * - Total gastos fijos mensuales
 * - Total pagado vs pendiente  
 * - Estadísticas por categoría
 * - Próximos vencimientos
 * 
 * Uso: node fixed-expenses-monthly-summary.js
 */

const { FixedExpense, FixedExpensePayment, Staff, Expense, BankTransaction } = require('./src/data');
const { Op } = require('sequelize');

async function getFixedExpensesMonthlySummary() {
  try {
    console.log('🔗 Conectando a base de datos...');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                 📊 DASHBOARD GASTOS FIJOS MENSUALES                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log(`📅 Mes: ${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}`);
    console.log(`📆 Fecha: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 OBTENER DATOS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const activeFixedExpenses = await FixedExpense.findAll({
      where: {
        isActive: true
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
          attributes: ['idPayment', 'amount', 'paymentDate', 'notes'],
          required: false
        }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔢 CALCULAR TOTALES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    let totalCommitmentMensual = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    const categorySummary = {};
    const paymentStatusCounts = {
      paid: 0,
      partial: 0,
      unpaid: 0
    };

    activeFixedExpenses.forEach(expense => {
      const totalAmount = parseFloat(expense.totalAmount || 0);
      const paidAmount = parseFloat(expense.paidAmount || 0);
      const remainingAmount = totalAmount - paidAmount;
      
      // Solo contar gastos mensuales para el commitment mensual
      if (expense.frequency === 'monthly') {
        totalCommitmentMensual += totalAmount;
      }
      
      totalPagado += paidAmount;
      totalPendiente += remainingAmount;
      
      // Estadísticas por categoría
      if (!categorySummary[expense.category]) {
        categorySummary[expense.category] = {
          count: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0
        };
      }
      
      categorySummary[expense.category].count++;
      categorySummary[expense.category].totalAmount += totalAmount;
      categorySummary[expense.category].paidAmount += paidAmount;
      categorySummary[expense.category].pendingAmount += remainingAmount;
      
      // Estado de pago
      if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatusCounts.paid++;
      } else if (paidAmount > 0) {
        paymentStatusCounts.partial++;
      } else {
        paymentStatusCounts.unpaid++;
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 RESUMEN PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│                         💰 RESUMEN PRINCIPAL                            │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');
    console.log(`│ 📋 Total Gastos Fijos Activos:       ${String(activeFixedExpenses.length).padStart(15)} │`);
    console.log(`│ 💳 Commitment Mensual:                $${totalCommitmentMensual.toFixed(2).padStart(14)} │`);
    console.log(`│ 💚 Total Pagado:                      $${totalPagado.toFixed(2).padStart(14)} │`);
    console.log(`│ 🔴 Total Pendiente:                   $${totalPendiente.toFixed(2).padStart(14)} │`);
    console.log('├─────────────────────────────────────────────────────────────────────────┤');
    
    const percentage = totalPagado + totalPendiente > 0 ? (totalPagado / (totalPagado + totalPendiente) * 100) : 0;
    console.log(`│ 📊 Porcentaje Pagado:                 ${percentage.toFixed(1).padStart(13)}% │`);
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 ESTADOS DE PAGO
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│                        📈 ESTADO DE PAGOS                               │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');
    console.log(`│ ✅ Completamente Pagados:             ${String(paymentStatusCounts.paid).padStart(15)} │`);
    console.log(`│ 🟡 Parcialmente Pagados:              ${String(paymentStatusCounts.partial).padStart(15)} │`);
    console.log(`│ 🔴 Sin Pagar:                         ${String(paymentStatusCounts.unpaid).padStart(15)} │`);
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 RESUMEN POR CATEGORÍA
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n┌─────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│                           📂 RESUMEN POR CATEGORÍA                                   │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
    console.log('│ Categoría             │ Cant │ Total       │ Pagado      │ Pendiente   │ % Pago │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
    
    Object.keys(categorySummary)
      .sort((a, b) => categorySummary[b].totalAmount - categorySummary[a].totalAmount)
      .forEach(category => {
        const data = categorySummary[category];
        const categoryName = category.substring(0, 19).padEnd(19);
        const count = String(data.count).padStart(4);
        const total = `$${data.totalAmount.toFixed(2)}`.padStart(11);
        const paid = `$${data.paidAmount.toFixed(2)}`.padStart(11);
        const pending = `$${data.pendingAmount.toFixed(2)}`.padStart(11);
        const pct = data.totalAmount > 0 ? ((data.paidAmount / data.totalAmount) * 100) : 0;
        const percentage = `${pct.toFixed(0)}%`.padStart(6);
        
        console.log(`│ ${categoryName} │ ${count} │ ${total} │ ${paid} │ ${pending} │ ${percentage} │`);
      });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────────┘');

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔔 PRÓXIMOS VENCIMIENTOS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const upcomingExpenses = activeFixedExpenses
      .filter(exp => {
        if (!exp.nextDueDate) return false;
        const dueDate = new Date(exp.nextDueDate);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7; // Próximos 7 días
      })
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

    console.log('\n┌─────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│                        🔔 PRÓXIMOS VENCIMIENTOS (7 DÍAS)                            │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
    
    if (upcomingExpenses.length === 0) {
      console.log('│                           ✅ No hay vencimientos próximos                           │');
    } else {
      console.log('│ Gasto Fijo                    │ Vencimiento │ Monto       │ Estado     │ Días    │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────┤');
      
      upcomingExpenses.forEach(expense => {
        const name = expense.name.substring(0, 28).padEnd(28);
        const dueDate = new Date(expense.nextDueDate).toLocaleDateString();
        const amount = `$${parseFloat(expense.totalAmount || 0).toFixed(2)}`.padStart(11);
        
        const paidAmount = parseFloat(expense.paidAmount || 0);
        const totalAmount = parseFloat(expense.totalAmount || 0);
        let status;
        if (paidAmount >= totalAmount && totalAmount > 0) {
          status = '✅ Pagado';
        } else if (paidAmount > 0) {
          status = '🟡 Parcial';
        } else {
          status = '🔴 Pendiente';
        }
        status = status.padEnd(9);
        
        const daysUntilDue = Math.ceil((new Date(expense.nextDueDate) - now) / (1000 * 60 * 60 * 24));
        const days = `${daysUntilDue}d`.padStart(7);
        
        console.log(`│ ${name} │ ${dueDate.padEnd(11)} │ ${amount} │ ${status} │ ${days} │`);
      });
    }
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────────┘');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⚠️  ALERTAS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                        ⚠️  ALERTAS Y NOTIFICACIONES                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    let hasAlerts = false;

    if (paymentStatusCounts.unpaid > 0) {
      console.log(`🔴 ACCIÓN REQUERIDA: ${paymentStatusCounts.unpaid} gastos fijos sin pagar`);
      hasAlerts = true;
    }

    if (upcomingExpenses.length > 0) {
      const unpaidUpcoming = upcomingExpenses.filter(exp => {
        const paidAmount = parseFloat(exp.paidAmount || 0);
        const totalAmount = parseFloat(exp.totalAmount || 0);
        return paidAmount < totalAmount;
      });
      
      if (unpaidUpcoming.length > 0) {
        console.log(`⏰ VENCIMIENTOS: ${unpaidUpcoming.length} gastos vencen en los próximos 7 días`);
        hasAlerts = true;
      }
    }

    const highCommitmentCategories = Object.keys(categorySummary)
      .filter(cat => categorySummary[cat].totalAmount > totalCommitmentMensual * 0.3);
    
    if (highCommitmentCategories.length > 0) {
      console.log(`💰 ALTO IMPACTO: Categoría "${highCommitmentCategories[0]}" representa >30% del commitment`);
      hasAlerts = true;
    }

    if (!hasAlerts) {
      console.log('✅ Todo está bajo control - No hay alertas críticas');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ Dashboard generado exitosamente');
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error generando dashboard:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  getFixedExpensesMonthlySummary()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = getFixedExpensesMonthlySummary;