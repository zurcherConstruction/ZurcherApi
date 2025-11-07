const { SupplierInvoiceExpense, Expense } = require('./src/data');
const { Op } = require('sequelize');

async function cleanDuplicateLinks() {
  try {
    await SupplierInvoiceExpense.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Encontrar expenses que están vinculados múltiples veces
    const allLinks = await SupplierInvoiceExpense.findAll({
      attributes: ['expenseId', 'supplierInvoiceId', 'idSupplierInvoiceExpense', 'createdAt'],
      order: [['expenseId', 'ASC'], ['createdAt', 'ASC']]
    });

    console.log(`📊 Total de vinculaciones: ${allLinks.length}`);
    console.log('');

    // Agrupar por expenseId
    const grouped = {};
    allLinks.forEach(link => {
      if (!grouped[link.expenseId]) {
        grouped[link.expenseId] = [];
      }
      grouped[link.expenseId].push(link);
    });

    // Encontrar duplicados
    const duplicates = Object.entries(grouped).filter(([_, links]) => links.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No hay vinculaciones duplicadas');
      await SupplierInvoiceExpense.sequelize.close();
      return;
    }

    console.log(`⚠️  Encontrados ${duplicates.length} expenses vinculados múltiples veces:\n`);

    for (const [expenseId, links] of duplicates) {
      const expense = await Expense.findByPk(expenseId, {
        attributes: ['idExpense', 'typeExpense', 'amount', 'paymentStatus']
      });

      console.log(`📌 Expense: ${expense.typeExpense} - $${expense.amount}`);
      console.log(`   ID: ${expenseId.substring(0, 20)}...`);
      console.log(`   Vinculado ${links.length} veces:`);

      links.forEach((link, index) => {
        const invoiceId = link.supplierInvoiceId.substring(0, 20);
        console.log(`      ${index + 1}. Invoice: ${invoiceId}... (${link.createdAt.toISOString().split('T')[0]})`);
      });

      // Mantener solo el primer link (el más antiguo)
      const toKeep = links[0];
      const toDelete = links.slice(1);

      console.log(`   ✅ Manteniendo: ${toKeep.idSupplierInvoiceExpense.substring(0, 20)}...`);
      console.log(`   🗑️  Eliminando ${toDelete.length} duplicado(s):`);

      for (const link of toDelete) {
        await SupplierInvoiceExpense.destroy({
          where: { idSupplierInvoiceExpense: link.idSupplierInvoiceExpense }
        });
        console.log(`      ❌ Eliminado: ${link.idSupplierInvoiceExpense.substring(0, 20)}...`);
      }

      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log(`   • Expenses duplicados limpiados: ${duplicates.length}`);
    console.log(`   • Vinculaciones eliminadas: ${duplicates.reduce((sum, [_, links]) => sum + (links.length - 1), 0)}`);

    await SupplierInvoiceExpense.sequelize.close();
    console.log('\n✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanDuplicateLinks();
