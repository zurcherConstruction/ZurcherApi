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

async function checkBalance() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Ver todos los Expenses con Chase Credit Card
    console.log('📊 EXPENSES con Chase Credit Card:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const [expenses] = await sequelize.query(`
      SELECT 
        "idExpense",
        date,
        amount,
        "paidAmount",
        "paymentStatus",
        vendor,
        notes,
        "typeExpense"
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      ORDER BY date DESC;
    `);

    let totalExpenses = 0;
    let totalPaid = 0;
    let totalPending = 0;

    expenses.forEach((exp, idx) => {
      const amount = parseFloat(exp.amount);
      const paidAmount = parseFloat(exp.paidAmount || 0);
      const pending = amount - paidAmount;
      
      totalExpenses += amount;
      totalPaid += paidAmount;
      totalPending += pending;

      console.log(`${idx + 1}. ${exp.date}`);
      console.log(`   Vendor: ${exp.vendor || exp.typeExpense}`);
      console.log(`   Notes: ${exp.notes || 'N/A'}`);
      console.log(`   Amount: $${amount.toFixed(2)}`);
      console.log(`   Paid: $${paidAmount.toFixed(2)}`);
      console.log(`   Pending: $${pending.toFixed(2)}`);
      console.log(`   Status: ${exp.paymentStatus}`);
      console.log('');
    });

    console.log('───────────────────────────────────────────────────────────────');
    console.log(`Total Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`Total Paid: $${totalPaid.toFixed(2)}`);
    console.log(`Total Pending: $${totalPending.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 2. Ver SupplierInvoices con isCreditCard
    console.log('💳 SUPPLIER INVOICES (Pagos e Intereses):');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const [invoices] = await sequelize.query(`
      SELECT 
        "idSupplierInvoice",
        "invoiceNumber",
        "transactionType",
        "issueDate",
        "totalAmount",
        "balanceAfter",
        "paymentMethod",
        notes
      FROM "SupplierInvoices"
      WHERE "isCreditCard" = true
      ORDER BY "issueDate" DESC;
    `);

    let totalPayments = 0;
    let totalInterests = 0;

    invoices.forEach((inv, idx) => {
      const amount = parseFloat(inv.totalAmount);
      
      if (inv.transactionType === 'payment') {
        totalPayments += amount;
      } else if (inv.transactionType === 'interest') {
        totalInterests += amount;
      }

      console.log(`${idx + 1}. ${inv.issueDate} - ${inv.transactionType.toUpperCase()}`);
      console.log(`   Invoice: ${inv.invoiceNumber}`);
      console.log(`   Amount: $${amount.toFixed(2)}`);
      console.log(`   Balance After: $${parseFloat(inv.balanceAfter || 0).toFixed(2)}`);
      console.log(`   Payment Method: ${inv.paymentMethod || 'N/A'}`);
      console.log(`   Notes: ${inv.notes || 'N/A'}`);
      console.log('');
    });

    console.log('───────────────────────────────────────────────────────────────');
    console.log(`Total Payments: $${totalPayments.toFixed(2)}`);
    console.log(`Total Interests: $${totalInterests.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 3. Cálculo del balance
    console.log('🧮 CÁLCULO DEL BALANCE:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const calculatedBalance = totalExpenses + totalInterests - totalPayments;
    
    console.log(`Total Expenses (cargos):     $${totalExpenses.toFixed(2)}`);
    console.log(`+ Total Interests:            $${totalInterests.toFixed(2)}`);
    console.log(`- Total Payments:             $${totalPayments.toFixed(2)}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`= Balance Calculado:          $${calculatedBalance.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('💡 VERIFICACIÓN:');
    console.log(`   Total Pending en Expenses: $${totalPending.toFixed(2)}`);
    console.log(`   ¿Coincide con balance?     ${totalPending === calculatedBalance ? '✅ SÍ' : '❌ NO'}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkBalance();
