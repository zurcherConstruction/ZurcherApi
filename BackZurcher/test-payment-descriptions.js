const { SupplierInvoice, Work, Expense } = require('./src/data');
const { Op } = require('sequelize');

async function checkData() {
  try {
    await SupplierInvoice.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Obtener invoices pendientes
    const invoices = await SupplierInvoice.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log('📋 INVOICES PENDIENTES:');
    if (invoices.length === 0) {
      console.log('  ❌ No hay invoices pendientes');
    } else {
      invoices.forEach(inv => {
        console.log(`  - ID: ${inv.idSupplierInvoice}`);
        console.log(`    Vendor: ${inv.vendor}`);
        console.log(`    Invoice #: ${inv.invoiceNumber}`);
        console.log(`    Total: $${inv.totalAmount}`);
        console.log('');
      });
    }

    // Obtener works disponibles
    const works = await Work.findAll({
      where: { status: { [Op.ne]: 'Completado' } },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log('🏗️ WORKS DISPONIBLES:');
    if (works.length === 0) {
      console.log('  ❌ No hay works disponibles');
    } else {
      works.forEach(w => {
        console.log(`  - ID: ${w.idWork}`);
        console.log(`    Address: ${w.propertyAddress}`);
        console.log(`    Status: ${w.status}`);
        console.log('');
      });
    }

    // Obtener expenses no pagados recientes
    const expenses = await Expense.findAll({
      where: { paymentStatus: 'unpaid' },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log('💰 EXPENSES NO PAGADOS RECIENTES:');
    if (expenses.length === 0) {
      console.log('  ❌ No hay expenses sin pagar');
    } else {
      expenses.forEach(exp => {
        console.log(`  - ID: ${exp.idExpense}`);
        console.log(`    Type: ${exp.typeExpense}`);
        console.log(`    Amount: $${exp.amount}`);
        console.log(`    Notes: ${exp.notes || 'Sin notas'}`);
        console.log('');
      });
    }

    await SupplierInvoice.sequelize.close();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
