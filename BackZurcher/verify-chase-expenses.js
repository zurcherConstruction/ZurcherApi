const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_DEPLOY, {
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

async function verifyExpenses() {
  try {
    console.log('🔍 VERIFICACIÓN DE EXPENSES CON CHASE CREDIT CARD');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Obtener TODOS los expenses con Chase Credit Card
    const [expenses] = await sequelize.query(`
      SELECT 
        "idExpense",
        date,
        amount,
        "paidAmount",
        (amount - "paidAmount") as pending,
        "paymentStatus",
        vendor,
        notes,
        "typeExpense"
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      ORDER BY date DESC;
    `);

    console.log(`📊 Total: ${expenses.length} expenses\n`);

    // Clasificar expenses
    const suspiciousPayments = [];
    const byStatus = {
      unpaid: [],
      partial: [],
      paid: [],
      paid_via_invoice: []
    };

    expenses.forEach(exp => {
      const status = exp.paymentstatus;
      const notes = (exp.notes || '').toLowerCase();
      const vendor = (exp.vendor || '').toLowerCase();
      
      // Detectar expenses que parecen PAGOS
      const looksLikePayment = 
        notes.includes('pago') || 
        notes.includes('payment') ||
        notes.includes('abono') ||
        vendor.includes('pago');

      if (looksLikePayment) {
        suspiciousPayments.push(exp);
      }

      if (byStatus[status]) {
        byStatus[status].push(exp);
      }
    });

    // Mostrar estadísticas
    console.log('📋 ESTADÍSTICAS POR ESTADO:');
    console.log('───────────────────────────────────────────────────────────────');
    Object.keys(byStatus).forEach(status => {
      const list = byStatus[status];
      const total = list.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const pending = list.reduce((sum, e) => sum + parseFloat(e.pending), 0);
      console.log(`${status}: ${list.length} expenses`);
      console.log(`   Total: $${total.toFixed(2)}`);
      console.log(`   Pendiente: $${pending.toFixed(2)}`);
      console.log('');
    });

    // Mostrar expenses SOSPECHOSOS (parecen pagos pero están como expenses)
    if (suspiciousPayments.length > 0) {
      console.log('⚠️  EXPENSES SOSPECHOSOS (parecen PAGOS):');
      console.log('═══════════════════════════════════════════════════════════════');
      suspiciousPayments.forEach((exp, idx) => {
        console.log(`\n${idx + 1}. ${exp.date} - $${parseFloat(exp.amount).toFixed(2)}`);
        console.log(`   ID: ${exp.idexpense}`);
        console.log(`   Vendor: ${exp.vendor || 'Sin vendor'}`);
        console.log(`   Notes: ${exp.notes || 'Sin notas'}`);
        console.log(`   Status: ${exp.paymentstatus}`);
        console.log(`   Paid: $${parseFloat(exp.paidamount || 0).toFixed(2)}`);
        console.log(`   Pending: $${parseFloat(exp.pending).toFixed(2)}`);
        console.log(`   Type: ${exp.typeexpense}`);
      });
      console.log('\n───────────────────────────────────────────────────────────────');
      console.log(`Total sospechosos: ${suspiciousPayments.length}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
    }

    // Verificar inconsistencias de paidAmount
    console.log('🔍 VERIFICANDO INCONSISTENCIAS:');
    console.log('───────────────────────────────────────────────────────────────');
    
    const inconsistencies = expenses.filter(exp => {
      const status = exp.paymentstatus;
      const paidAmount = parseFloat(exp.paidamount || 0);
      const amount = parseFloat(exp.amount);
      
      if (status === 'paid' && paidAmount !== amount) return true;
      if (status === 'paid_via_invoice' && paidAmount !== amount) return true;
      if (status === 'unpaid' && paidAmount !== 0) return true;
      if (status === 'partial' && (paidAmount === 0 || paidAmount >= amount)) return true;
      
      return false;
    });

    if (inconsistencies.length > 0) {
      console.log(`⚠️  ${inconsistencies.length} expense(s) con inconsistencias:\n`);
      inconsistencies.forEach((exp, idx) => {
        console.log(`${idx + 1}. ${exp.date} - ${exp.idexpense}`);
        console.log(`   Amount: $${parseFloat(exp.amount).toFixed(2)}`);
        console.log(`   Paid: $${parseFloat(exp.paidamount || 0).toFixed(2)}`);
        console.log(`   Status: ${exp.paymentstatus} ⚠️`);
        console.log('');
      });
    } else {
      console.log('✅ No se encontraron inconsistencias de paidAmount\n');
    }

    // Balance total
    const totalPending = expenses.reduce((sum, e) => sum + parseFloat(e.pending), 0);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`💰 Balance Total Pendiente: $${totalPending.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Recomendaciones
    if (suspiciousPayments.length > 0) {
      console.log('💡 RECOMENDACIONES:');
      console.log('───────────────────────────────────────────────────────────────');
      console.log(`1. Revisar los ${suspiciousPayments.length} expense(s) sospechoso(s)`);
      console.log('2. Si son PAGOS, deberían ser SupplierInvoices con transactionType="payment"');
      console.log('3. Ejecutar script de corrección para migrarlos');
      console.log('═══════════════════════════════════════════════════════════════\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyExpenses();
