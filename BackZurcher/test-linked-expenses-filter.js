const { Expense, SupplierInvoiceExpense } = require('./src/data');
const { Op } = require('sequelize');

async function testLinkedExpensesFilter() {
  try {
    await Expense.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Contar expenses no pagados TOTALES
    const totalUnpaid = await Expense.count({
      where: { paymentStatus: 'unpaid' }
    });

    console.log('📊 ESTADÍSTICAS:');
    console.log(`   Total expenses no pagados: ${totalUnpaid}`);

    // 2. Contar expenses vinculados a invoices
    const linkedExpenses = await SupplierInvoiceExpense.findAll({
      attributes: ['expenseId'],
      raw: true
    });

    console.log(`   Expenses vinculados a invoices: ${linkedExpenses.length}`);

    // 3. Contar expenses no pagados QUE NO están vinculados
    const linkedIds = linkedExpenses.map(item => item.expenseId);
    
    const where = { paymentStatus: 'unpaid' };
    if (linkedIds.length > 0) {
      where.idExpense = { [Op.notIn]: linkedIds };
    }

    const availableUnpaid = await Expense.count({ where });

    console.log(`   Expenses disponibles para vincular: ${availableUnpaid}`);
    console.log('');

    // 4. Mostrar algunos expenses vinculados (para verificar)
    if (linkedExpenses.length > 0) {
      console.log('🔗 EXPENSES VINCULADOS (primeros 5):');
      const linkedDetails = await Expense.findAll({
        where: {
          idExpense: { [Op.in]: linkedIds.slice(0, 5) }
        },
        attributes: ['idExpense', 'typeExpense', 'amount', 'paymentStatus'],
        limit: 5
      });

      linkedDetails.forEach(exp => {
        console.log(`   - ${exp.idExpense.substring(0, 8)}... | ${exp.typeExpense} | $${exp.amount} | ${exp.paymentStatus}`);
      });
      console.log('');
    }

    // 5. Mostrar algunos expenses disponibles
    if (availableUnpaid > 0) {
      console.log('✅ EXPENSES DISPONIBLES PARA VINCULAR (primeros 5):');
      const availableDetails = await Expense.findAll({
        where,
        attributes: ['idExpense', 'typeExpense', 'amount', 'paymentStatus'],
        limit: 5,
        order: [['date', 'DESC']]
      });

      availableDetails.forEach(exp => {
        console.log(`   - ${exp.idExpense.substring(0, 8)}... | ${exp.typeExpense} | $${exp.amount} | ${exp.paymentStatus}`);
      });
      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('✅ VERIFICACIÓN COMPLETA');
    console.log('');
    console.log('📝 RESUMEN:');
    console.log(`   • Total expenses no pagados: ${totalUnpaid}`);
    console.log(`   • Ya vinculados a invoices: ${linkedExpenses.length}`);
    console.log(`   • Disponibles para vincular: ${availableUnpaid}`);
    console.log(`   • Fórmula: ${totalUnpaid} - ${linkedExpenses.length} = ${availableUnpaid}`);
    console.log('');

    if (availableUnpaid === totalUnpaid - linkedExpenses.length) {
      console.log('✅ El filtro funciona correctamente!');
    } else {
      console.log('❌ PROBLEMA: Los números no cuadran');
    }

    await Expense.sequelize.close();
    console.log('\n✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testLinkedExpensesFilter();
