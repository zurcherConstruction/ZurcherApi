/**
 * 🔍 AUDIT: Revisar todos los gastos fijos y sus pagos
 * Muestra: Gasto → Período actual → Pagos registrados → Período de cada pago
 */

const { Sequelize, Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { FixedExpense, FixedExpensePayment, Staff, conn } = require('./src/data');

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const main = async () => {
  try {
    console.log('\n========================================');
    console.log('🔍 AUDITORÍA DE GASTOS FIJOS');
    console.log('========================================\n');

    // 1. Obtener todos los gastos fijos activos
    const expenses = await FixedExpense.findAll({
      where: { isActive: true },
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [
        [Sequelize.literal(`CASE WHEN category = 'Salarios' THEN 0 ELSE 1 END`), 'ASC'],
        ['category', 'ASC'],
        ['name', 'ASC']
      ]
    });

    console.log(`✅ Total de gastos fijos activos: ${expenses.length}\n`);

    for (const expense of expenses) {
      console.log('─'.repeat(80));
      console.log(`📋 ${expense.name}`);
      console.log('─'.repeat(80));
      
      // Info básica
      console.log(`  Categoría:     ${expense.category}`);
      console.log(`  Monto Total:   ${formatCurrency(expense.totalAmount)}`);
      console.log(`  Monto Pagado:  ${formatCurrency(expense.paidAmount)}`);
      console.log(`  Frecuencia:    ${expense.frequency}`);
      console.log(`  Estado:        ${expense.paymentStatus}`);
      
      // Info de período
      console.log(`\n  📅 PERÍODO ACTUAL:`);
      console.log(`     Fecha Inicio:    ${formatDate(expense.startDate)}`);
      console.log(`     Próx. Vencimiento: ${formatDate(expense.nextDueDate)}`);
      
      if (expense.staffId) {
        // Si tiene staffId asignado, traer el nombre del staff
        const staffMember = await Staff.findByPk(expense.staffId, {
          attributes: ['id', 'name']
        });
        console.log(`     Empleado:      ${staffMember?.name || expense.staffId}`);
      }
      
      // Obtener pagos de este gasto
      const payments = await FixedExpensePayment.findAll({
        where: { fixedExpenseId: expense.idFixedExpense },
        order: [['createdAt', 'ASC']]
      });

      if (payments.length === 0) {
        console.log(`\n  💳 Pagos: NINGUNO`);
      } else {
        console.log(`\n  💳 HISTORIAL DE PAGOS (${payments.length} registros):`);
        
        payments.forEach((payment, idx) => {
          console.log(`\n     Pago #${idx + 1}:`);
          console.log(`       Monto:         ${formatCurrency(payment.amount)}`);
          console.log(`       Fecha Pago:    ${formatDate(payment.paymentDate || payment.createdAt)}`);
          console.log(`       Período:       ${formatDate(payment.periodStart)} → ${formatDate(payment.periodEnd)}`);
          console.log(`       Vencimiento:   ${formatDate(payment.periodDueDate)}`);
          console.log(`       Método:        ${payment.paymentMethod || 'N/A'}`);
          console.log(`       Referencia:    ${payment.referenceNumber || 'N/A'}`);
        });
      }
      
      // Cálculo de deuda
      const remaining = parseFloat(expense.totalAmount) - parseFloat(expense.paidAmount);
      const percentPaid = ((parseFloat(expense.paidAmount) / parseFloat(expense.totalAmount)) * 100).toFixed(1);
      
      console.log(`\n  📊 RESUMEN:`);
      console.log(`     Pagado:        ${percentPaid}%`);
      console.log(`     Falta Pagar:   ${formatCurrency(remaining)}`);
      console.log('\n');
    }

    console.log('========================================');
    console.log('📊 RESUMEN GENERAL');
    console.log('========================================\n');

    // Estadísticas
    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
    const totalPaid = expenses.reduce((sum, e) => sum + parseFloat(e.paidAmount), 0);
    const totalRemaining = totalAmount - totalPaid;
    const totalPayments = await FixedExpensePayment.count();

    console.log(`  Gastos Fijos Activos:     ${expenses.length}`);
    console.log(`  Monto Total:              ${formatCurrency(totalAmount)}`);
    console.log(`  Total Pagado:             ${formatCurrency(totalPaid)}`);
    console.log(`  Falta Pagar:              ${formatCurrency(totalRemaining)}`);
    console.log(`  % Pagado Global:          ${((totalPaid / totalAmount) * 100).toFixed(1)}%`);
    console.log(`  Total de Pagos Registrados: ${totalPayments}`);

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await conn.close();
    process.exit(0);
  }
};

main();
