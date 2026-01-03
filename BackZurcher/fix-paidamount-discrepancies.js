#!/usr/bin/env node

/**
 * 🔧 CORRECTOR DE PAIDAMOUNT EN GASTOS FIJOS
 * Recalcula paidAmount basado en la suma real de pagos
 */

const { sequelize, FixedExpense, FixedExpensePayment } = require('./src/data');

async function fixPaidAmounts() {
  try {
    await sequelize.authenticate();
    console.log('\n🔧 CORRECTOR DE PAIDAMOUNT');
    console.log('='.repeat(100));

    // Gastos que tienen discrepancia
    const gastosFix = [
      { name: 'Bono Willy Diciembre', id: '158215d5-3736-4396-b3fe-315bbef6161a' },
      { name: 'Bono Yani', id: '3c824141-7c21-46c6-b0cf-4cf1a7acf57f' },
      { name: 'Payroll + Bono Gaby', id: '24b49197-db27-4c37-a9d0-37027a15c88a' },
      { name: 'PAYROLL YANINA', id: '5b5e9f3d-3e6b-400c-8fd1-02f79f6f86f3' }
    ];

    for (const gasto of gastosFix) {
      const expense = await FixedExpense.findByPk(gasto.id, {
        include: [
          {
            model: FixedExpensePayment,
            as: 'payments',
            required: false
          }
        ]
      });

      if (!expense) {
        console.log(`\n❌ ${gasto.name}: No encontrado`);
        continue;
      }

      const payments = expense.payments || [];
      const realPaidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const currentPaidAmount = parseFloat(expense.paidAmount) || 0;

      console.log(`\n✏️  ${gasto.name}`);
      console.log(`   Antes: $${currentPaidAmount.toFixed(2)}`);
      console.log(`   Ahora: $${realPaidAmount.toFixed(2)} (${payments.length} pagos)`);

      // Actualizar si hay diferencia
      if (Math.abs(realPaidAmount - currentPaidAmount) > 0.01) {
        const totalAmount = parseFloat(expense.totalAmount) || 0;
        const newStatus = realPaidAmount >= totalAmount ? 'paid' : (realPaidAmount > 0 ? 'partial' : 'unpaid');

        await expense.update({
          paidAmount: realPaidAmount,
          paymentStatus: newStatus
        });

        console.log(`   ✅ Actualizado a $${realPaidAmount.toFixed(2)} con status: ${newStatus}`);
      } else {
        console.log(`   ℹ️  Ya estaba correcto`);
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ CORRECCIÓN COMPLETADA');
    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

fixPaidAmounts();
