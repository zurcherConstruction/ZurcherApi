/**
 * Script: Actualizar expenses de AMEX existentes a estado 'unpaid'
 * 
 * Los cargos de tarjeta de crédito AMEX deben estar en 'unpaid' hasta que se paguen
 * mediante el sistema de pagos FIFO de la tarjeta.
 * 
 * Este script:
 * 1. Busca todos los Expenses con paymentMethod = 'AMEX'
 * 2. Que tengan paymentStatus = 'paid' o 'paid_via_invoice'
 * 3. Los actualiza a 'unpaid' con paidAmount = 0
 * 
 * IMPORTANTE: Solo ejecutar ANTES de empezar a usar el sistema de pagos AMEX
 */

const { Expense, sequelize } = require('./src/data');

async function fixAmexExpenses() {
  console.log('\n🔄 Actualizando expenses de AMEX a unpaid...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Primero, ver cuántos hay
    const amexExpenses = await Expense.findAll({
      where: {
        paymentMethod: 'AMEX',
        paymentStatus: ['paid', 'paid_via_invoice']
      },
      attributes: ['idExpense', 'date', 'vendor', 'amount', 'paymentStatus', 'paidAmount'],
      order: [['date', 'DESC']]
    });

    console.log(`📊 Encontrados ${amexExpenses.length} expenses de AMEX que necesitan actualización:\n`);
    
    amexExpenses.forEach((expense, idx) => {
      console.log(`   ${idx + 1}. ${expense.date} | ${expense.vendor} | $${expense.amount} | Estado: ${expense.paymentStatus}`);
    });

    if (amexExpenses.length === 0) {
      console.log('\n✅ No hay expenses de AMEX para actualizar\n');
      process.exit(0);
    }

    console.log(`\n⚠️  Se actualizarán ${amexExpenses.length} expenses de AMEX a 'unpaid'\n`);

    // Actualizar usando SQL directo
    const [result] = await sequelize.query(`
      UPDATE "Expenses"
      SET 
        "paymentStatus" = 'unpaid',
        "paidAmount" = 0
      WHERE "paymentMethod" = 'AMEX'
        AND "paymentStatus" IN ('paid', 'paid_via_invoice')
      RETURNING "idExpense", "date", "vendor", "amount";
    `);

    console.log(`✅ Actualizados ${result.length} expenses de AMEX\n`);

    // Mostrar resumen final
    const summary = await sequelize.query(`
      SELECT 
        "paymentStatus",
        COUNT(*) as count,
        SUM("amount") as total,
        SUM("paidAmount") as totalPaid
      FROM "Expenses"
      WHERE "paymentMethod" = 'AMEX'
      GROUP BY "paymentStatus"
      ORDER BY count DESC;
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📊 Estado final de expenses AMEX por paymentStatus:');
    summary.forEach(row => {
      console.log(`   ${row.paymentStatus}: ${row.count} expenses | Total: $${parseFloat(row.total).toFixed(2)} | Pagado: $${parseFloat(row.totalpaid || 0).toFixed(2)}`);
    });

    // Calcular balance pendiente de AMEX
    const [balanceResult] = await sequelize.query(`
      SELECT 
        SUM("amount" - COALESCE("paidAmount", 0)) as pendingBalance
      FROM "Expenses"
      WHERE "paymentMethod" = 'AMEX'
        AND "paymentStatus" IN ('unpaid', 'partial');
    `);

    const pendingBalance = balanceResult[0]?.pendingbalance || 0;
    console.log(`\n💳 Balance pendiente de AMEX: $${parseFloat(pendingBalance).toFixed(2)}\n`);

    console.log('✅ Actualización completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

fixAmexExpenses();
