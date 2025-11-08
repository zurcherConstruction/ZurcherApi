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
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function fixPaidAmounts() {
  try {
    console.log('🚀 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    console.log('🔄 Actualizando paidAmount para expenses pagados...');
    const [result, meta] = await sequelize.query(`
      UPDATE "Expenses"
      SET "paidAmount" = amount
      WHERE "paymentStatus" IN ('paid', 'paid_via_invoice') 
      AND ("paidAmount" IS NULL OR "paidAmount" = 0);
    `);
    
    console.log(`✅ ${meta.rowCount} registros actualizados\n`);

    // Verificar
    console.log('🔍 Verificando registros actualizados...');
    const [expenses] = await sequelize.query(`
      SELECT "idExpense", amount, "paymentStatus", "paidAmount", "paymentMethod"
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      ORDER BY "paymentStatus"
      LIMIT 10;
    `);

    if (expenses.length > 0) {
      console.log(`✅ ${expenses.length} registros con Chase Credit Card:`);
      expenses.forEach((exp, idx) => {
        console.log(`   ${idx + 1}. Status: ${exp.paymentStatus}, Amount: $${exp.amount}, Paid: $${exp.paidAmount || 0}`);
      });
    }

    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

fixPaidAmounts();
