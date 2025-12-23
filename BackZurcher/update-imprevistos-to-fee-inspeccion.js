const { Expense, Receipt, SupplierInvoiceItem, sequelize } = require('./src/data');

/**
 * Script para actualizar el nombre de 'Imprevistos' a 'Fee de Inspección'
 * en todos los registros existentes de la base de datos
 */

async function updateImprevistosToFeeInspeccion() {
  try {
    console.log('🔄 === ACTUALIZACIÓN DE IMPREVISTOS A FEE DE INSPECCIÓN ===\n');
    
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Actualizar tabla Expenses
    console.log('1. 📋 Actualizando tabla Expenses...');
    const expensesUpdated = await Expense.update(
      { typeExpense: 'Fee de Inspección' },
      { where: { typeExpense: 'Imprevistos' } }
    );
    console.log(`   ✅ Expenses actualizados: ${expensesUpdated[0]} registros\n`);

    // 2. Actualizar tabla Receipts
    console.log('2. 🧾 Actualizando tabla Receipts...');
    const receiptsUpdated = await Receipt.update(
      { type: 'Fee de Inspección' },
      { where: { type: 'Imprevistos' } }
    );
    console.log(`   ✅ Receipts actualizados: ${receiptsUpdated[0]} registros\n`);

    // 3. Actualizar tabla SupplierInvoiceItems
    console.log('3. 📦 Actualizando tabla SupplierInvoiceItems...');
    const supplierItemsUpdated = await SupplierInvoiceItem.update(
      { category: 'Fee de Inspección' },
      { where: { category: 'Imprevistos' } }
    );
    console.log(`   ✅ SupplierInvoiceItems actualizados: ${supplierItemsUpdated[0]} registros\n`);

    // 4. Verificar las actualizaciones
    console.log('4. 🔍 Verificando actualizaciones...');
    
    const expensesCount = await Expense.count({ where: { typeExpense: 'Fee de Inspección' } });
    const receiptsCount = await Receipt.count({ where: { type: 'Fee de Inspección' } });
    const supplierItemsCount = await SupplierInvoiceItem.count({ where: { category: 'Fee de Inspección' } });

    console.log(`   📊 Expenses con 'Fee de Inspección': ${expensesCount}`);
    console.log(`   📊 Receipts con 'Fee de Inspección': ${receiptsCount}`);
    console.log(`   📊 SupplierInvoiceItems con 'Fee de Inspección': ${supplierItemsCount}\n`);

    // 5. Verificar que no queden registros con 'Imprevistos'
    const remainingExpenses = await Expense.count({ where: { typeExpense: 'Imprevistos' } });
    const remainingReceipts = await Receipt.count({ where: { type: 'Imprevistos' } });
    const remainingSupplierItems = await SupplierInvoiceItem.count({ where: { category: 'Imprevistos' } });

    if (remainingExpenses === 0 && remainingReceipts === 0 && remainingSupplierItems === 0) {
      console.log('🎉 === ACTUALIZACIÓN COMPLETADA EXITOSAMENTE ===');
      console.log('✅ Todos los registros con "Imprevistos" han sido actualizados');
      console.log('✅ Ahora todos usan "Fee de Inspección"');
      console.log('');
      console.log('📝 RESUMEN:');
      console.log(`   • ${expensesUpdated[0]} Expenses actualizados`);
      console.log(`   • ${receiptsUpdated[0]} Receipts actualizados`);
      console.log(`   • ${supplierItemsUpdated[0]} SupplierInvoiceItems actualizados`);
      console.log('');
      console.log('🔄 Reinicia tu aplicación para ver los cambios en el frontend');
    } else {
      console.log('⚠️  ADVERTENCIA: Aún quedan registros con "Imprevistos":');
      console.log(`   • Expenses: ${remainingExpenses}`);
      console.log(`   • Receipts: ${remainingReceipts}`);
      console.log(`   • SupplierInvoiceItems: ${remainingSupplierItems}`);
    }

  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    try {
      await sequelize.close();
      console.log('🔒 Conexión cerrada');
    } catch (error) {
      console.error('Error cerrando conexión:', error.message);
    }
  }
}

// Ejecutar la actualización
updateImprevistosToFeeInspeccion();