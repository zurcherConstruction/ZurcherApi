#!/usr/bin/env node

/**
 * 🔧 HERRAMIENTA DE CORRECCIÓN DE GASTOS FIJOS
 * Analiza y corrige problemas de cálculos y períodos
 */

const { sequelize, FixedExpense, FixedExpensePayment } = require('./src/data');
const { Op } = require('sequelize');

async function fixedExpensesAnalysis() {
  try {
    await sequelize.authenticate();
    console.log('\n🔧 ANÁLISIS Y CORRECCIÓN DE GASTOS FIJOS');
    console.log('='.repeat(100));

    // Obtener todos los gastos fijos con pagos
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

    const issues = {
      wrongPaidAmount: [],
      missingPeriod: [],
      missingStaffId: [],
      noPeriodNeeded: []
    };

    // Analizar cada gasto
    fixedExpenses.forEach((expense, index) => {
      const payments = expense.payments || [];
      const totalAmount = parseFloat(expense.totalAmount) || 0;
      const paidAmount = parseFloat(expense.paidAmount) || 0;
      
      // Calcular suma real de pagos
      const realPaidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      
      // Verificar si hay discrepancia
      const discrepancy = Math.abs(realPaidAmount - paidAmount) > 0.01;

      console.log(`\n${index + 1}. ${expense.name}`);
      console.log('-'.repeat(100));
      console.log(`   Frecuencia: ${expense.frequency}`);
      console.log(`   Total: $${totalAmount.toFixed(2)} | PaidAmount BD: $${paidAmount.toFixed(2)} | Real: $${realPaidAmount.toFixed(2)}`);
      console.log(`   StaffID: ${expense.staffId ? '✅' : '❌'} | Creador: ${expense.createdByStaffId ? 'Sí' : 'No'}`);
      
      if (discrepancy) {
        console.log(`   ⚠️  DISCREPANCIA: paidAmount ($${paidAmount}) ≠ suma real ($${realPaidAmount})`);
        issues.wrongPaidAmount.push({
          name: expense.name,
          expected: realPaidAmount,
          current: paidAmount,
          id: expense.idFixedExpense
        });
      }

      // Verificar si necesita período
      if (expense.frequency === 'one_time') {
        console.log(`   ℹ️  one_time: NO necesita período`);
        issues.noPeriodNeeded.push(expense.name);
      } else {
        // Verificar si tiene período
        const hasPeriod = payments.length > 0 && payments.some(p => p.periodStart || p.periodEnd || p.periodDueDate);
        if (!hasPeriod && payments.length > 0) {
          console.log(`   ❌ RECURRENTE sin período`);
          issues.missingPeriod.push(expense.name);
        }
      }

      // Verificar StaffID
      if (!expense.staffId && expense.frequency !== 'one_time') {
        console.log(`   ❌ Sin StaffID (necesita ingreso manual)`);
        issues.missingStaffId.push({
          name: expense.name,
          id: expense.idFixedExpense,
          frequency: expense.frequency
        });
      }

      if (payments.length > 0) {
        console.log(`\n   📝 Pagos (${payments.length}):`);
        payments.forEach((p, idx) => {
          const period = (p.periodStart || p.periodEnd || p.periodDueDate) ? 
            `[${p.periodStart || '-'} a ${p.periodEnd || '-'}]` : 
            '[Sin período]';
          console.log(`      ${idx + 1}. ${p.paymentDate}: $${parseFloat(p.amount).toFixed(2)} ${period}`);
        });
      }
    });

    // RESUMEN DE PROBLEMAS
    console.log(`\n${'='.repeat(100)}`);
    console.log('🔍 RESUMEN DE PROBLEMAS');
    console.log('='.repeat(100));

    if (issues.wrongPaidAmount.length > 0) {
      console.log(`\n❌ CÁLCULOS INCORRECTOS (${issues.wrongPaidAmount.length}):`);
      issues.wrongPaidAmount.forEach(item => {
        console.log(`   • ${item.name}`);
        console.log(`     BD: $${item.current.toFixed(2)} → Debería ser: $${item.expected.toFixed(2)}`);
      });
    } else {
      console.log(`\n✅ Todos los cálculos de paidAmount son correctos`);
    }

    if (issues.missingPeriod.length > 0) {
      console.log(`\n⚠️  GASTOS RECURRENTES SIN PERÍODO (${issues.missingPeriod.length}):`);
      issues.missingPeriod.forEach(name => console.log(`   • ${name}`));
    } else {
      console.log(`\n✅ Todos los gastos recurrentes tienen período`);
    }

    if (issues.missingStaffId.length > 0) {
      console.log(`\n⚠️  SIN STAFFID - INGRESO MANUAL NECESARIO (${issues.missingStaffId.length}):`);
      issues.missingStaffId.forEach(item => {
        console.log(`   • ${item.name} (${item.frequency})`);
      });
    } else {
      console.log(`\n✅ Todos los gastos tienen StaffID`);
    }

    console.log(`\n📌 GASTOS ONE-TIME (no necesitan período): ${issues.noPeriodNeeded.length}`);

    // RECOMENDACIONES
    console.log(`\n${'='.repeat(100)}`);
    console.log('📋 RECOMENDACIONES');
    console.log('='.repeat(100));
    console.log(`
1. GASTOS CON CÁLCULOS INCORRECTOS:
   ${issues.wrongPaidAmount.length > 0 
     ? 'Necesitan corregir paidAmount en la BD' 
     : 'Todos OK'}

2. GASTOS SIN PERÍODO:
   ${issues.missingPeriod.length > 0 
     ? 'Necesitan agregar período a los pagos (periodStart/periodEnd)' 
     : 'Todos OK'}

3. GASTOS SIN STAFFID:
   ${issues.missingStaffId.length > 0 
     ? `Estos ${issues.missingStaffId.length} gastos necesitan StaffID ingresado manualmente` 
     : 'Todos OK'}

4. GASTOS ONE-TIME:
   No necesitan período (frecuencia única)
    `);

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

fixedExpensesAnalysis();
