require('dotenv').config();
const { sequelize, Expense, SupplierInvoice, SupplierInvoiceExpense } = require('./src/models');

async function verifyNoDuplicates() {
  try {
    console.log('\n🔍 VERIFICANDO DUPLICACIÓN DE GASTOS\n');
    console.log('='.repeat(60));

    // 1. Verificar el expense que acabas de vincular
    const expenseId = '44c4f505-da90-4ee0-a4dc-661c1a1a7205';
    
    const expense = await Expense.findByPk(expenseId, {
      include: [{
        model: SupplierInvoice,
        as: 'linkedInvoices',
        through: { attributes: ['createdAt'] }
      }]
    });

    if (!expense) {
      console.log('❌ No se encontró el expense');
      return;
    }

    console.log('\n📋 EXPENSE:', {
      id: expense.idExpense,
      amount: expense.amountTotal,
      description: expense.description,
      paymentStatus: expense.paymentStatus,
      invoicesVinculados: expense.linkedInvoices?.length || 0
    });

    if (expense.linkedInvoices && expense.linkedInvoices.length > 0) {
      console.log('\n🔗 Invoices vinculados a este expense:');
      expense.linkedInvoices.forEach(inv => {
        console.log(`  - Invoice #${inv.invoiceNumber} (${inv.totalAmount}) - Vinculado: ${inv.SupplierInvoiceExpense?.createdAt}`);
      });
    }

    // 2. Verificar el invoice
    const invoiceId = 'c3776739-a0d1-4163-b4d6-7fc98344dea0';
    
    const invoice = await SupplierInvoice.findByPk(invoiceId, {
      include: [{
        model: Expense,
        as: 'linkedExpenses',
        through: { attributes: ['createdAt'] }
      }]
    });

    console.log('\n📄 INVOICE:', {
      id: invoice.idSupplierInvoice,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      paymentStatus: invoice.paymentStatus,
      expensesVinculados: invoice.linkedExpenses?.length || 0
    });

    if (invoice.linkedExpenses && invoice.linkedExpenses.length > 0) {
      console.log('\n💰 Expenses vinculados a este invoice:');
      invoice.linkedExpenses.forEach(exp => {
        console.log(`  - Expense ${exp.idExpense} ($${exp.amountTotal}) - ${exp.description}`);
      });
    }

    // 3. Verificar tabla intermedia
    const links = await SupplierInvoiceExpense.findAll({
      where: {
        idSupplierInvoice: invoiceId
      }
    });

    console.log('\n🔗 TABLA INTERMEDIA (SupplierInvoiceExpenses):');
    console.log(`  Total de vínculos: ${links.length}`);
    links.forEach(link => {
      console.log(`  - Expense: ${link.idExpense}`);
    });

    // 4. Verificar que NO hay expenses duplicados con mismo monto y descripción
    const duplicates = await Expense.findAll({
      attributes: ['description', 'amountTotal', [sequelize.fn('COUNT', sequelize.col('idExpense')), 'count']],
      where: {
        amountTotal: expense.amountTotal,
        description: expense.description
      },
      group: ['description', 'amountTotal'],
      having: sequelize.where(sequelize.fn('COUNT', sequelize.col('idExpense')), '>', 1)
    });

    console.log('\n⚠️  VERIFICACIÓN DE DUPLICADOS:');
    if (duplicates.length > 0) {
      console.log('❌ SE ENCONTRARON GASTOS DUPLICADOS:');
      duplicates.forEach(dup => {
        console.log(`  - "${dup.description}" $${dup.amountTotal} (${dup.dataValues.count} veces)`);
      });
    } else {
      console.log('✅ NO hay gastos duplicados con la misma descripción y monto');
    }

    // 5. Verificar balance total
    const totalExpenses = await Expense.sum('amountTotal', {
      where: {
        description: expense.description
      }
    });

    console.log('\n💵 BALANCE:');
    console.log(`  Total en Expenses con descripción "${expense.description}": $${totalExpenses}`);
    console.log(`  Invoice total: $${invoice.totalAmount}`);
    console.log(`  Expense vinculado: $${expense.amountTotal}`);
    
    if (totalExpenses === expense.amountTotal) {
      console.log('  ✅ El balance es correcto - NO hay duplicación');
    } else {
      console.log('  ⚠️  Revisar: el total de expenses no coincide con el expense vinculado');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyNoDuplicates();
