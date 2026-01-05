const { FixedExpense, FixedExpensePayment } = require('./src/data');
const { Sequelize } = require('sequelize');

require('dotenv').config();

async function diagnose() {
  try {
    console.log('\n🔍 DIAGNÓSTICO DE PAYROLL GABY\n');
    console.log('=' .repeat(100));

    // Buscar PAYROLL GABY
    const payrollGaby = await FixedExpense.findOne({
      where: { name: 'PAYROLL GABY' }
    });

    if (!payrollGaby) {
      console.error('❌ PAYROLL GABY no encontrado');
      process.exit(1);
    }

    console.log(`✅ PAYROLL GABY encontrado: ${payrollGaby.idFixedExpense}\n`);

    // 1. Ver TODOS los pagos sin filtro
    console.log('📋 TODOS LOS PAGOS EN BD (sin filtro):');
    const allPayments = await FixedExpensePayment.findAll({
      where: { fixedExpenseId: payrollGaby.idFixedExpense },
      raw: true,
      attributes: [
        'idPayment',
        'paymentDate',
        'amount',
        'paymentMethod',
        'periodStart',
        'periodEnd',
        'periodDueDate',
        'notes',
        'createdAt',
        'updatedAt'
      ]
    });

    console.log(`Total de pagos: ${allPayments.length}\n`);
    allPayments.forEach((p, i) => {
      console.log(`[${i + 1}] ID: ${p.idPayment}`);
      console.log(`    Fecha pago: ${p.paymentDate}`);
      console.log(`    Monto: $${p.amount}`);
      console.log(`    Método: ${p.paymentMethod}`);
      console.log(`    Período: ${p.periodStart} a ${p.periodEnd}`);
      console.log(`    Vencimiento: ${p.periodDueDate}`);
      console.log(`    Notas: ${p.notes}`);
      console.log(`    Creado: ${p.createdAt}`);
      console.log(`    Actualizado: ${p.updatedAt}\n`);
    });

    // 2. Buscar específicamente el pago de 2025-12-16 a 2025-12-31
    console.log('=' .repeat(100));
    console.log('🔎 Buscando pagos para período 2025-12-16 a 2025-12-31:\n');

    const targetPayment = await FixedExpensePayment.findOne({
      where: {
        fixedExpenseId: payrollGaby.idFixedExpense,
        periodStart: '2025-12-16',
        periodEnd: '2025-12-31'
      },
      raw: true
    });

    if (targetPayment) {
      console.log('✅ ENCONTRADO PAGO:');
      console.log(JSON.stringify(targetPayment, null, 2));
    } else {
      console.log('❌ NO ENCONTRADO pago para ese período');
    }

    // 3. Ver query raw de SQL para asegurarse
    console.log('\n' + '=' .repeat(100));
    console.log('🔧 Ejecutando query SQL directa:\n');

    const sequelize = FixedExpensePayment.sequelize;
    const sqlResult = await sequelize.query(
      `SELECT * FROM "FixedExpensePayments" 
       WHERE "fixedExpenseId" = :fixedExpenseId 
       AND "periodStart" = '2025-12-16' 
       AND "periodEnd" = '2025-12-31'`,
      {
        replacements: { fixedExpenseId: payrollGaby.idFixedExpense },
        type: Sequelize.QueryTypes.SELECT,
        raw: true
      }
    );

    console.log(`Resultados de query SQL: ${sqlResult.length} registros`);
    if (sqlResult.length > 0) {
      console.log(JSON.stringify(sqlResult, null, 2));
    }

    // 4. Ver estado del gasto fijo
    console.log('\n' + '=' .repeat(100));
    console.log('📊 Estado de PAYROLL GABY:\n');
    console.log(`Total Amount: $${payrollGaby.totalAmount}`);
    console.log(`Paid Amount: $${payrollGaby.paidAmount}`);
    console.log(`Payment Status: ${payrollGaby.paymentStatus}`);
    console.log(`Start Date: ${payrollGaby.startDate}`);
    console.log(`Frequency: ${payrollGaby.frequency}\n`);

    console.log('=' .repeat(100));

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnose();
