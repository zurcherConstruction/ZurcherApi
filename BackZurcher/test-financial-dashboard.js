const { conn } = require('./src/data');
const { Budget, FinalInvoice, Expense, FixedExpensePayment, SupplierInvoice } = require('./src/data');
const { Op } = require('sequelize');

/**
 * Script de prueba para verificar datos del Dashboard Financiero
 * Noviembre 2025
 */

async function testFinancialDashboard() {
  try {
    await conn.authenticate();
    console.log('✅ Conexión establecida\n');

    // Filtro para Noviembre 2025
    const month = 11;
    const year = 2025;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);

    console.log('📅 PERIODO: Noviembre 2025');
    console.log(`   Desde: ${firstDay.toISOString()}`);
    console.log(`   Hasta: ${lastDay.toISOString()}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('💰 INGRESOS');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Initial Payments
    const budgetsWithPayment = await Budget.findAll({
      where: {
        initialPayment: { [Op.gt]: 0 },
        createdAt: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      attributes: ['idBudget', 'invoiceNumber', 'initialPayment', 'paymentProofMethod', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📝 Initial Payments (${budgetsWithPayment.length} registros):`);
    let totalInitial = 0;
    budgetsWithPayment.forEach(b => {
      const amount = parseFloat(b.initialPayment);
      totalInitial += amount;
      console.log(`   Budget #${b.invoiceNumber}: $${amount.toFixed(2)} - ${b.paymentProofMethod || 'N/A'} - ${b.createdAt.toISOString().split('T')[0]}`);
    });
    console.log(`   ✅ TOTAL INITIAL PAYMENTS: $${totalInitial.toFixed(2)}\n`);

    // 2. Final Payments
    const finalPayments = await FinalInvoice.findAll({
      where: {
        [Op.or]: [
          { status: 'paid' },
          { totalAmountPaid: { [Op.gt]: 0 } }
        ],
        createdAt: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      attributes: ['id', 'totalAmountPaid', 'paymentDate', 'paymentNotes', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📝 Final Payments (${finalPayments.length} registros):`);
    let totalFinal = 0;
    finalPayments.forEach(inv => {
      const amount = parseFloat(inv.totalAmountPaid || 0);
      totalFinal += amount;
      console.log(`   Invoice #${inv.id}: $${amount.toFixed(2)} - ${inv.paymentNotes || 'N/A'} - ${inv.paymentDate || inv.createdAt.toISOString().split('T')[0]} - Status: ${inv.status}`);
    });
    console.log(`   ✅ TOTAL FINAL PAYMENTS: $${totalFinal.toFixed(2)}\n`);

    const totalIngresos = totalInitial + totalFinal;
    console.log(`💰 TOTAL INGRESOS: $${totalIngresos.toFixed(2)}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('💸 EGRESOS');
    console.log('═══════════════════════════════════════════════════════\n');

    // 3. Gastos regulares
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.like]: '2025-11%'
        }
      },
      attributes: ['idExpense', 'date', 'amount', 'typeExpense', 'paymentMethod'],
      order: [['date', 'DESC']]
    });

    console.log(`📝 Gastos Regulares (${expenses.length} registros):`);
    let totalExpenses = 0;
    const expensesByMethod = {};
    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount);
      totalExpenses += amount;
      const method = exp.paymentMethod || 'No especificado';
      expensesByMethod[method] = (expensesByMethod[method] || 0) + amount;
      console.log(`   ${exp.date}: $${amount.toFixed(2)} - ${exp.typeExpense} - ${method}`);
    });
    console.log(`   ✅ TOTAL GASTOS REGULARES: $${totalExpenses.toFixed(2)}`);
    console.log(`   📊 Por método de pago:`);
    Object.entries(expensesByMethod).forEach(([method, amount]) => {
      console.log(`      ${method}: $${amount.toFixed(2)}`);
    });
    console.log();

    // 4. Gastos Fijos
    const fixedExpenses = await FixedExpensePayment.findAll({
      where: {
        createdAt: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      attributes: ['idPayment', 'amount', 'paymentMethod', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📝 Gastos Fijos (${fixedExpenses.length} registros):`);
    let totalFixed = 0;
    fixedExpenses.forEach(fe => {
      const amount = parseFloat(fe.amount);
      totalFixed += amount;
      console.log(`   ${fe.createdAt.toISOString().split('T')[0]}: $${amount.toFixed(2)} - ${fe.paymentMethod || 'N/A'}`);
    });
    console.log(`   ✅ TOTAL GASTOS FIJOS: $${totalFixed.toFixed(2)}\n`);

    // 5. Facturas de Proveedores
    const supplierInvoices = await SupplierInvoice.findAll({
      where: {
        paymentStatus: { [Op.in]: ['paid', 'partial'] },
        createdAt: {
          [Op.between]: [firstDay, lastDay]
        }
      },
      attributes: ['idSupplierInvoice', 'invoiceNumber', 'vendor', 'paidAmount', 'paymentMethod', 'paymentDate', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📝 Facturas Proveedores (${supplierInvoices.length} registros):`);
    let totalSupplier = 0;
    supplierInvoices.forEach(si => {
      const amount = parseFloat(si.paidAmount || 0);
      totalSupplier += amount;
      console.log(`   ${si.vendor} - Invoice #${si.invoiceNumber}: $${amount.toFixed(2)} - ${si.paymentMethod || 'N/A'}`);
    });
    console.log(`   ✅ TOTAL PROVEEDORES: $${totalSupplier.toFixed(2)}\n`);

    // 6. Comisiones
    const commissions = await Budget.findAll({
      where: {
        commissionPaid: true,
        commissionAmount: { [Op.gt]: 0 },
        commissionPaidDate: {
          [Op.like]: '2025-11%'
        }
      },
      attributes: ['idBudget', 'invoiceNumber', 'commissionAmount', 'commissionPaidDate'],
      order: [['commissionPaidDate', 'DESC']]
    });

    console.log(`📝 Comisiones Pagadas (${commissions.length} registros):`);
    let totalCommissions = 0;
    commissions.forEach(c => {
      const amount = parseFloat(c.commissionAmount);
      totalCommissions += amount;
      console.log(`   Budget #${c.invoiceNumber}: $${amount.toFixed(2)} - ${c.commissionPaidDate}`);
    });
    console.log(`   ✅ TOTAL COMISIONES: $${totalCommissions.toFixed(2)}\n`);

    const totalEgresos = totalExpenses + totalFixed + totalSupplier + totalCommissions;
    console.log(`💸 TOTAL EGRESOS: $${totalEgresos.toFixed(2)}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💰 Total Ingresos:        $${totalIngresos.toFixed(2)}`);
    console.log(`💸 Total Egresos:         $${totalEgresos.toFixed(2)}`);
    console.log(`📊 Balance Neto:          $${(totalIngresos - totalEgresos).toFixed(2)}`);
    console.log(`📈 Ratio (Ingresos/Egresos): ${totalEgresos > 0 ? ((totalIngresos / totalEgresos) * 100).toFixed(2) + '%' : '∞'}`);
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testFinancialDashboard();
