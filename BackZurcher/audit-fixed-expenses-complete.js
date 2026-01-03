#!/usr/bin/env node

/**
 * 📊 AUDITORÍA COMPLETA DE GASTOS FIJOS
 * Muestra todos los gastos fijos con sus pagos y datos faltantes
 */

const { sequelize, FixedExpense, FixedExpensePayment, Staff } = require('./src/data');

async function auditFixedExpenses() {
  try {
    await sequelize.authenticate();
    console.log('\n📊 AUDITORÍA COMPLETA DE GASTOS FIJOS');
    console.log('='.repeat(100));

    // Obtener todos los gastos fijos con sus pagos (sin incluir Staff por ahora)
    const fixedExpenses = await FixedExpense.findAll({
      include: [
        {
          model: FixedExpensePayment,
          as: 'payments',
          required: false,
          order: [['paymentDate', 'DESC']]
        }
      ],
      order: [['name', 'ASC']]
    });

    console.log(`\n📋 Total de gastos fijos: ${fixedExpenses.length}\n`);

    // Variables de control
    let totalExpenses = 0;
    let totalPaid = 0;
    let totalPending = 0;
    const missingData = {
      staffId: [],
      periodFields: [],
      noPayments: []
    };

    // Procesar cada gasto
    fixedExpenses.forEach((expense, index) => {
      const payments = expense.payments || [];
      const amountPaid = parseFloat(expense.paidAmount) || 0;
      const totalAmount = parseFloat(expense.totalAmount) || 0;
      const pending = totalAmount - amountPaid;

      totalExpenses += totalAmount;
      totalPaid += amountPaid;
      totalPending += pending;

      // Verificar datos faltantes
      const missing = [];
      if (!expense.staffId) {
        missing.push('❌ Sin staffId');
        missingData.staffId.push(expense.name);
      }
      
      let hasPeriodData = false;
      if (payments.length > 0) {
        hasPeriodData = payments.some(p => p.periodStart || p.periodEnd || p.periodDueDate);
      }
      if (!hasPeriodData && payments.length > 0) {
        missing.push('❌ Sin períodos en pagos');
        missingData.periodFields.push(expense.name);
      }
      
      if (payments.length === 0) {
        missing.push('⚠️  Sin pagos');
        missingData.noPayments.push(expense.name);
      }

      // Header del gasto
      console.log(`\n${index + 1}. ${expense.name}`);
      console.log('-'.repeat(100));

      // Info principal
      console.log(`   ID: ${expense.idFixedExpense.substring(0, 8)}...`);
      console.log(`   Descripción: ${expense.description || 'N/A'}`);
      console.log(`   Categoría: ${expense.category} | Frecuencia: ${expense.frequency}`);
      console.log(`   StaffID Asignado: ${expense.staffId ? '✅ ' + expense.staffId.substring(0, 8) : '❌ FALTA'}`);
      console.log(`   Creador: ${expense.createdByStaffId ? expense.createdByStaffId.substring(0, 8) : 'N/A'}`);

      // Finanzas
      console.log(`\n   💰 FINANZAS:`);
      const percentPaid = totalAmount > 0 ? ((amountPaid / totalAmount) * 100).toFixed(2) : 0;
      console.log(`      Total a pagar: $${totalAmount.toFixed(2)}`);
      console.log(`      Pagado: $${amountPaid.toFixed(2)} (${percentPaid}%)`);
      console.log(`      Pendiente: ${pending > 0 ? `$${pending.toFixed(2)}` : '$0.00'}`);

      // Pagos
      if (payments.length > 0) {
        console.log(`\n   📝 PAGOS (${payments.length}):`);
        payments.forEach((payment, idx) => {
          const periodStart = payment.periodStart || '❌';
          const periodEnd = payment.periodEnd || '❌';
          const periodDue = payment.periodDueDate || '❌';
          const status = payment.status || 'N/A';
          
          console.log(`      ${idx + 1}. Fecha: ${payment.paymentDate} | Monto: $${parseFloat(payment.amount).toFixed(2)} | Status: ${status}`);
          console.log(`         Período: Inicio=${periodStart} | Fin=${periodEnd} | Vencimiento=${periodDue}`);
        });
      } else {
        console.log(`\n   ⚠️  SIN PAGOS REGISTRADOS`);
      }

      // Mostrar datos faltantes
      if (missing.length > 0) {
        console.log(`\n   ⚠️  DATOS FALTANTES:`);
        missing.forEach(item => console.log(`      ${item}`));
      } else {
        console.log(`\n   ✅ DATOS COMPLETOS`);
      }
    });

    // RESUMEN GENERAL
    console.log(`\n${'='.repeat(100)}`);
    console.log('📊 RESUMEN GENERAL');
    console.log('='.repeat(100));
    console.log(`\n   Total de Gastos Fijos: ${fixedExpenses.length}`);
    console.log(`   Monto Total a Gastar: $${totalExpenses.toFixed(2)}`);
    console.log(`   Monto Total Pagado: $${totalPaid.toFixed(2)}`);
    console.log(`   Monto Pendiente: $${totalPending.toFixed(2)}`);
    console.log(`   Porcentaje Pagado: ${totalExpenses > 0 ? ((totalPaid / totalExpenses) * 100).toFixed(2) : 0}%`);

    // ALERTAS DE DATOS FALTANTES
    console.log(`\n${'='.repeat(100)}`);
    console.log('⚠️  DATOS FALTANTES POR COMPLETAR');
    console.log('='.repeat(100));

    if (missingData.staffId.length > 0) {
      console.log(`\n❌ SIN STAFFID (${missingData.staffId.length}):`);
      missingData.staffId.forEach(name => console.log(`   • ${name}`));
    }

    if (missingData.periodFields.length > 0) {
      console.log(`\n❌ SIN PERÍODOS DE PAGO (${missingData.periodFields.length}):`);
      missingData.periodFields.forEach(name => console.log(`   • ${name}`));
    }

    if (missingData.noPayments.length > 0) {
      console.log(`\n⚠️  SIN PAGOS REGISTRADOS (${missingData.noPayments.length}):`);
      missingData.noPayments.forEach(name => console.log(`   • ${name}`));
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error en auditoría:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

auditFixedExpenses();
