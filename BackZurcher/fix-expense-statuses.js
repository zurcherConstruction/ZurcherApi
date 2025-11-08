const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_DEPLOY, {
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

async function fixExpenseStatuses() {
  try {
    console.log('🔧 CORRECCIÓN DE ESTADOS DE EXPENSES CHASE CC');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Contar expenses por estado actual
    const [statusCounts] = await sequelize.query(`
      SELECT 
        "paymentStatus",
        COUNT(*) as count,
        SUM(amount) as total
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      GROUP BY "paymentStatus";
    `);

    console.log('📊 Estados actuales:');
    statusCounts.forEach(s => {
      console.log(`   ${s.paymentStatus || 'NULL/undefined'}: ${s.count} ($${parseFloat(s.total).toFixed(2)})`);
    });
    console.log('');

    // Actualizar TODOS los expenses con Chase CC a unpaid y paidAmount = 0
    console.log('🔄 Actualizando todos los expenses a unpaid...\n');
    
    const [result] = await sequelize.query(`
      UPDATE "Expenses"
      SET 
        "paymentStatus" = 'unpaid',
        "paidAmount" = 0,
        "paidDate" = NULL
      WHERE "paymentMethod" = 'Chase Credit Card'
      RETURNING "idExpense";
    `);

    console.log(`✅ ${result.length} expense(s) actualizados\n`);

    // Verificar resultado
    const [verification] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount,
        SUM("paidAmount") as total_paid
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      AND "paymentStatus" = 'unpaid';
    `);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ RESULTADO:');
    console.log(`   Total expenses: ${verification[0].total}`);
    console.log(`   Todos con status: unpaid`);
    console.log(`   Balance pendiente: $${parseFloat(verification[0].total_amount).toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

fixExpenseStatuses();
