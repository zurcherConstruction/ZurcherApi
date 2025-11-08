const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function testFIFO() {
  try {
    console.log('🧪 TEST DE SISTEMA FIFO - CHASE CREDIT CARD');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    await sequelize.authenticate();

    // 1. Ver estado ANTES
    console.log('📊 ESTADO ANTES DEL TEST:');
    console.log('───────────────────────────────────────────────────────────────');
    
    const [beforeExpenses] = await sequelize.query(`
      SELECT 
        "idExpense",
        date,
        amount,
        "paidAmount",
        (amount - "paidAmount") as pending,
        "paymentStatus",
        vendor,
        LEFT(notes, 30) as notes
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      ORDER BY date ASC
      LIMIT 5;
    `);

    console.log('\n5 Expenses más antiguos con Chase Credit Card:');
    beforeExpenses.forEach((exp, idx) => {
      console.log(`\n${idx + 1}. ${exp.date} - ${exp.vendor || 'Sin vendor'}`);
      console.log(`   Amount: $${parseFloat(exp.amount).toFixed(2)}`);
      console.log(`   Paid: $${parseFloat(exp.paidamount || 0).toFixed(2)}`);
      console.log(`   Pending: $${parseFloat(exp.pending || 0).toFixed(2)}`);
      console.log(`   Status: ${exp.paymentstatus}`);
      if (exp.notes) console.log(`   Notes: ${exp.notes}`);
    });

    // Calcular balance total
    const [balance] = await sequelize.query(`
      SELECT 
        SUM(amount - "paidAmount") as current_balance
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card';
    `);

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log(`Balance Total ANTES: $${parseFloat(balance[0].current_balance || 0).toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 2. Simular endpoint de pago
    console.log('💳 SIMULANDO PAGO DE $500 (vía endpoint)...\n');
    
    const axios = require('axios');
    
    // Necesitas el token de autenticación
    console.log('⚠️  Para probar el endpoint completo, necesitas:');
    console.log('   1. Backend corriendo (npm run dev)');
    console.log('   2. Token de autenticación');
    console.log('   3. Ejecutar este comando:\n');
    console.log('curl -X POST "http://localhost:3001/supplier-invoices/credit-card/transaction" \\');
    console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"transactionType":"payment","description":"Test FIFO","amount":500,"paymentMethod":"Chase Bank","date":"2025-11-08"}\'');
    console.log('\n');

    // 3. Mostrar lógica FIFO esperada
    console.log('📋 LÓGICA FIFO ESPERADA ($500 de pago):');
    console.log('───────────────────────────────────────────────────────────────\n');
    
    let remainingPayment = 500;
    let expenseIndex = 0;
    const fifoSteps = [];

    for (const exp of beforeExpenses) {
      if (remainingPayment <= 0) break;
      
      const pending = parseFloat(exp.pending);
      if (pending <= 0) continue;

      const toApply = Math.min(remainingPayment, pending);
      const newPaidAmount = parseFloat(exp.paidamount) + toApply;
      const newPending = pending - toApply;
      const newStatus = newPending === 0 ? 'paid' : 'partial';

      fifoSteps.push({
        expense: exp,
        toApply,
        newPaidAmount,
        newPending,
        newStatus
      });

      remainingPayment -= toApply;
      expenseIndex++;
    }

    fifoSteps.forEach((step, idx) => {
      console.log(`${idx + 1}. Expense ${step.expense.date} (${step.expense.vendor || 'Sin vendor'})`);
      console.log(`   Aplicar: $${step.toApply.toFixed(2)}`);
      console.log(`   Paid Amount: $${parseFloat(step.expense.paidamount).toFixed(2)} → $${step.newPaidAmount.toFixed(2)}`);
      console.log(`   Pending: $${parseFloat(step.expense.pending).toFixed(2)} → $${step.newPending.toFixed(2)}`);
      console.log(`   Status: ${step.expense.paymentstatus} → ${step.newStatus}`);
      console.log('');
    });

    const newBalance = parseFloat(balance[0].current_balance) - (500 - remainingPayment);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`Balance Total DESPUÉS: $${newBalance.toFixed(2)}`);
    console.log(`Pago aplicado: $${(500 - remainingPayment).toFixed(2)}`);
    if (remainingPayment > 0) {
      console.log(`⚠️  Sobrante: $${remainingPayment.toFixed(2)} (no hay más expenses pendientes)`);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('✅ Simulación completa');
    console.log('\n💡 Para probar en REAL:');
    console.log('   1. Asegúrate que el backend esté corriendo');
    console.log('   2. Usa el frontend (tab Chase Credit Card)');
    console.log('   3. Crea un pago de $500');
    console.log('   4. Verifica que se aplicó FIFO correctamente\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testFIFO();
