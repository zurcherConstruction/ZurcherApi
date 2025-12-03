const {Expense, SupplierInvoiceExpense, BankTransaction, sequelize} = require('./src/data');
const {Op} = require('sequelize');

(async () => {
  try {
    console.log('=== VERIFICACIÓN DE ESTADO PARA MIGRACIÓN ===\n');
    
    // 1. Verificar foreign key constraint actual
    console.log('1. VERIFICANDO FOREIGN KEY CONSTRAINT...');
    const [fkInfo] = await sequelize.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'Expenses'
        AND kcu.column_name = 'supplierInvoiceItemId';
    `);
    
    if (fkInfo.length > 0) {
      console.log(`✅ Constraint encontrado: ${fkInfo[0].constraint_name}`);
      console.log(`   Apunta a: ${fkInfo[0].foreign_table_name}.${fkInfo[0].foreign_column_name}\n`);
    } else {
      console.log('⚠️ No se encontró constraint para supplierInvoiceItemId\n');
    }
    
    // 2. Contar Expenses vinculados a proveedores
    console.log('2. EXPENSES VINCULADOS A SUPPLIER INVOICES...');
    const linkedExpenses = await SupplierInvoiceExpense.count();
    console.log(`   Total de links en SupplierInvoiceExpense: ${linkedExpenses}`);
    
    const expensesWithItemId = await Expense.count({
      where: { supplierInvoiceItemId: { [Op.not]: null } }
    });
    console.log(`   Expenses con supplierInvoiceItemId: ${expensesWithItemId}`);
    console.log(`   Expenses SIN vincular: ${linkedExpenses - expensesWithItemId}\n`);
    
    // 3. Verificar Expenses creados desde pagos de proveedores en diciembre
    console.log('3. EXPENSES DE PAGOS A PROVEEDORES (DICIEMBRE)...');
    const decemberExpenses = await Expense.findAll({
      where: {
        date: { [Op.gte]: '2025-12-01' },
        paymentStatus: 'paid'
      },
      attributes: ['idExpense', 'amount', 'paymentMethod', 'supplierInvoiceItemId', 'date']
    });
    
    const withInvoice = decemberExpenses.filter(e => e.supplierInvoiceItemId);
    const withoutInvoice = decemberExpenses.filter(e => !e.supplierInvoiceItemId);
    
    console.log(`   Total Expenses pagados en diciembre: ${decemberExpenses.length}`);
    console.log(`   - Con supplierInvoiceItemId: ${withInvoice.length}`);
    console.log(`   - Sin supplierInvoiceItemId: ${withoutInvoice.length}\n`);
    
    // 4. Verificar BankTransactions de pagos en efectivo/cuentas bancarias
    console.log('4. BANK TRANSACTIONS (DICIEMBRE)...');
    const bankTxs = await BankTransaction.findAll({
      where: {
        date: { [Op.gte]: '2025-12-01' },
        category: { [Op.in]: ['expense', 'fixed_expense'] }
      }
    });
    console.log(`   Total BankTransactions de gastos: ${bankTxs.length}\n`);
    
    // 5. Resumen de migraciones necesarias
    console.log('=== MIGRACIONES NECESARIAS ===\n');
    
    const needsFkMigration = fkInfo.length > 0 && fkInfo[0].foreign_table_name === 'SupplierInvoiceItems';
    const needsLinkMigration = (linkedExpenses - expensesWithItemId) > 0;
    
    if (needsFkMigration) {
      console.log('✅ 1. Migrar foreign key constraint');
      console.log('   - Ejecutar: migrate-supplier-invoice-fk.js');
    } else {
      console.log('⏭️  1. Foreign key ya apunta a SupplierInvoices (OK)');
    }
    
    if (needsLinkMigration) {
      console.log(`\n✅ 2. Vincular ${linkedExpenses - expensesWithItemId} expenses a sus invoices`);
      console.log('   - Ejecutar: update-supplier-expense-links.js');
    } else {
      console.log('\n⏭️  2. Todos los expenses ya están vinculados (OK)');
    }
    
    console.log('\n=== RECOMENDACIÓN ===');
    if (needsFkMigration || needsLinkMigration) {
      console.log('⚠️ Se requieren migraciones antes de deployar');
      console.log('\nPASOS:');
      console.log('1. Hacer backup de producción');
      console.log('2. Ejecutar migraciones en orden');
      console.log('3. Verificar con check-supplier-payment-double-count.js');
      console.log('4. Deployar código nuevo');
    } else {
      console.log('✅ No se requieren migraciones, puede deployar directamente');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
