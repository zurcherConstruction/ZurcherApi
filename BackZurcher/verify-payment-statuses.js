const { Expense, SupplierInvoiceExpense, FixedExpensePayment } = require('./src/data');
const { Op } = require('sequelize');

async function verifyPaymentStatuses() {
  try {
    await Expense.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    console.log('═'.repeat(80));
    console.log('📊 VERIFICACIÓN DE ESTADOS DE PAGO DE EXPENSES');
    console.log('═'.repeat(80));
    console.log('');

    // 1. Total de expenses por estado
    const totalExpenses = await Expense.count();
    const unpaidCount = await Expense.count({ where: { paymentStatus: 'unpaid' } });
    const paidCount = await Expense.count({ where: { paymentStatus: 'paid' } });
    const paidViaInvoiceCount = await Expense.count({ where: { paymentStatus: 'paid_via_invoice' } });

    console.log('📈 RESUMEN GENERAL:');
    console.log(`   Total expenses: ${totalExpenses}`);
    console.log(`   • Unpaid: ${unpaidCount} (${(unpaidCount/totalExpenses*100).toFixed(1)}%)`);
    console.log(`   • Paid: ${paidCount} (${(paidCount/totalExpenses*100).toFixed(1)}%)`);
    console.log(`   • Paid via Invoice: ${paidViaInvoiceCount} (${(paidViaInvoiceCount/totalExpenses*100).toFixed(1)}%)`);
    console.log('');

    // 2. Expenses vinculados a invoices
    const linkedToInvoices = await SupplierInvoiceExpense.count();
    console.log('🔗 EXPENSES VINCULADOS A INVOICES:');
    console.log(`   Total vinculaciones: ${linkedToInvoices}`);
    
    // Verificar si TODOS los vinculados están marcados como paid o paid_via_invoice
    const linkedExpenseIds = await SupplierInvoiceExpense.findAll({
      attributes: ['expenseId'],
      raw: true
    });
    const linkedIds = linkedExpenseIds.map(item => item.expenseId);

    if (linkedIds.length > 0) {
      const linkedUnpaid = await Expense.count({
        where: {
          idExpense: { [Op.in]: linkedIds },
          paymentStatus: 'unpaid'
        }
      });

      const linkedPaid = await Expense.count({
        where: {
          idExpense: { [Op.in]: linkedIds },
          paymentStatus: { [Op.in]: ['paid', 'paid_via_invoice'] }
        }
      });

      console.log(`   • Vinculados y PAGADOS: ${linkedPaid}`);
      console.log(`   • Vinculados pero AÚN UNPAID: ${linkedUnpaid} ${linkedUnpaid > 0 ? '❌ PROBLEMA!' : '✅'}`);

      if (linkedUnpaid > 0) {
        console.log('');
        console.log('   ⚠️ EXPENSES VINCULADOS A INVOICES PERO AÚN MARCADOS COMO UNPAID:');
        const problematic = await Expense.findAll({
          where: {
            idExpense: { [Op.in]: linkedIds },
            paymentStatus: 'unpaid'
          },
          attributes: ['idExpense', 'typeExpense', 'amount', 'date', 'paymentStatus'],
          limit: 10
        });

        problematic.forEach(exp => {
          console.log(`      - ${exp.idExpense.substring(0, 8)}... | ${exp.typeExpense} | $${exp.amount} | ${exp.date} | ${exp.paymentStatus}`);
        });
      }
    }
    console.log('');

    // 3. Expenses de gastos fijos (si existen pagos parciales)
    try {
      const fixedExpensePayments = await FixedExpensePayment.count();
      if (fixedExpensePayments > 0) {
        console.log('💳 EXPENSES DE GASTOS FIJOS:');
        console.log(`   Total pagos parciales registrados: ${fixedExpensePayments}`);
        
        // Estos expenses deben estar marcados como paid
        const fixedExpenseIds = await FixedExpensePayment.findAll({
          attributes: ['expenseId'],
          raw: true
        });
        const fixedIds = [...new Set(fixedExpenseIds.map(item => item.expenseId))];

        if (fixedIds.length > 0) {
          const fixedUnpaid = await Expense.count({
            where: {
              idExpense: { [Op.in]: fixedIds },
              paymentStatus: 'unpaid'
            }
          });

          const fixedPaid = await Expense.count({
            where: {
              idExpense: { [Op.in]: fixedIds },
              paymentStatus: 'paid'
            }
          });

          console.log(`   • Pagados: ${fixedPaid}`);
          console.log(`   • Aún unpaid: ${fixedUnpaid} ${fixedUnpaid > 0 ? '❌ PROBLEMA!' : '✅'}`);
        }
        console.log('');
      }
    } catch (e) {
      // Tabla de fixed expenses puede no existir
    }

    // 4. Verificar expenses creados recientemente (últimas 24 horas)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentExpenses = await Expense.findAll({
      where: {
        createdAt: { [Op.gte]: yesterday }
      },
      attributes: ['idExpense', 'typeExpense', 'amount', 'paymentStatus', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    if (recentExpenses.length > 0) {
      console.log('🆕 EXPENSES CREADOS RECIENTEMENTE (últimas 24h):');
      recentExpenses.forEach(exp => {
        const statusIcon = exp.paymentStatus === 'paid' || exp.paymentStatus === 'paid_via_invoice' ? '✅' : '⏳';
        console.log(`   ${statusIcon} ${exp.typeExpense} | $${exp.amount} | ${exp.paymentStatus} | ${exp.createdAt.toISOString().split('T')[0]}`);
      });
      console.log('');
    }

    // 5. Recomendaciones
    console.log('═'.repeat(80));
    console.log('💡 ANÁLISIS Y RECOMENDACIONES:');
    console.log('═'.repeat(80));
    console.log('');
    
    console.log('📝 LÓGICA CORRECTA DE ESTADOS:');
    console.log('');
    console.log('   1. Expense creado manualmente (desde Summary):');
    console.log('      Estado inicial: UNPAID ⏳');
    console.log('      Después de pagar: PAID ✅');
    console.log('');
    console.log('   2. Expense creado desde Invoice (create_with_works o create_general):');
    console.log('      Estado inicial: PAID ✅ (porque se paga en el mismo momento)');
    console.log('');
    console.log('   3. Expense existente vinculado a Invoice (link_existing):');
    console.log('      Estado inicial: UNPAID ⏳');
    console.log('      Después de vincular: PAID_VIA_INVOICE ✅');
    console.log('');
    console.log('   4. Expense de gasto fijo (cuando se paga parcialmente):');
    console.log('      Estado inicial: UNPAID ⏳');
    console.log('      Después de pagar: PAID ✅');
    console.log('');

    if (linkedUnpaid > 0) {
      console.log('⚠️  PROBLEMAS DETECTADOS:');
      console.log(`   • ${linkedUnpaid} expenses están vinculados a invoices pero marcados como UNPAID`);
      console.log('   • Esto puede causar duplicación en reportes de gastos pendientes');
      console.log('   • SOLUCIÓN: Revisar el código de vinculación (link_existing)');
      console.log('');
    }

    await Expense.sequelize.close();
    console.log('✅ Análisis completado');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyPaymentStatuses();
