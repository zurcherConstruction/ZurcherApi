require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function verifyUpdate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar Incomes
    const [incomes] = await sequelize.query(`
      SELECT "paymentMethod", COUNT(*) as count 
      FROM "Incomes" 
      WHERE "paymentMethod" IN ('Capital Proyectos Septic', 'Proyecto Septic BOFA')
      GROUP BY "paymentMethod"
    `);
    console.log('📊 Incomes:');
    incomes.forEach(row => {
      console.log(`   ${row.paymentMethod}: ${row.count} registros`);
    });

    // Verificar Expenses
    const [expenses] = await sequelize.query(`
      SELECT "paymentMethod", COUNT(*) as count 
      FROM "Expenses" 
      WHERE "paymentMethod" IN ('Capital Proyectos Septic', 'Proyecto Septic BOFA')
      GROUP BY "paymentMethod"
    `);
    console.log('\n📊 Expenses:');
    expenses.forEach(row => {
      console.log(`   ${row.paymentMethod}: ${row.count} registros`);
    });

    // Verificar FixedExpenses
    const [fixed] = await sequelize.query(`
      SELECT "paymentMethod", COUNT(*) as count 
      FROM "FixedExpenses" 
      WHERE "paymentMethod" IN ('Capital Proyectos Septic', 'Proyecto Septic BOFA')
      GROUP BY "paymentMethod"
    `);
    console.log('\n📊 FixedExpenses:');
    fixed.forEach(row => {
      console.log(`   ${row.paymentMethod}: ${row.count} registros`);
    });

    // Verificar FixedExpensePayments
    const [fixedPayments] = await sequelize.query(`
      SELECT "paymentMethod", COUNT(*) as count 
      FROM "FixedExpensePayments" 
      WHERE "paymentMethod" IN ('Capital Proyectos Septic', 'Proyecto Septic BOFA')
      GROUP BY "paymentMethod"
    `);
    console.log('\n📊 FixedExpensePayments:');
    fixedPayments.forEach(row => {
      console.log(`   ${row.paymentMethod}: ${row.count} registros`);
    });

    // Verificar SupplierInvoices
    const [invoices] = await sequelize.query(`
      SELECT "paymentMethod", COUNT(*) as count 
      FROM "SupplierInvoices" 
      WHERE "paymentMethod" IN ('Capital Proyectos Septic', 'Proyecto Septic BOFA')
      GROUP BY "paymentMethod"
    `);
    console.log('\n📊 SupplierInvoices:');
    invoices.forEach(row => {
      console.log(`   ${row.paymentMethod}: ${row.count} registros`);
    });

    // Verificar BankTransactions
    const [transactions] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "BankTransactions" 
      WHERE description LIKE '%Capital Proyectos Septic%' 
         OR notes LIKE '%Capital Proyectos Septic%'
    `);
    console.log('\n📊 BankTransactions con "Capital Proyectos Septic":');
    console.log(`   ${transactions[0].count} registros`);

    const [transactionsNew] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "BankTransactions" 
      WHERE description LIKE '%Proyecto Septic BOFA%' 
         OR notes LIKE '%Proyecto Septic BOFA%'
    `);
    console.log('📊 BankTransactions con "Proyecto Septic BOFA":');
    console.log(`   ${transactionsNew[0].count} registros`);

    console.log('\n✅ Verificación completada');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyUpdate();
