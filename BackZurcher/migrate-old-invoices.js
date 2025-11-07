/**
 * MIGRACIÓN: Convertir invoices del modelo antiguo al nuevo
 * 
 * Este script:
 * 1. Encuentra invoices con SupplierInvoiceItems o SupplierInvoiceWorks
 * 2. Crea expenses correspondientes
 * 3. Los vincula usando SupplierInvoiceExpenses
 * 4. Mantiene el modelo antiguo intacto (para historial)
 */

const { sequelize, SupplierInvoice, SupplierInvoiceItem, SupplierInvoiceWork, Expense, Work } = require('./src/data');

async function migrateOldInvoices() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    const dbName = process.env.NODE_ENV === 'production' ? '🔴 PRODUCCIÓN' : '🟢 LOCAL';
    console.log(`Conectado a: ${dbName}\n`);

    console.log('═'.repeat(80));
    console.log('🔄 MIGRACIÓN DE INVOICES ANTIGUOS AL NUEVO SISTEMA');
    console.log('═'.repeat(80));
    console.log('');

    // 1. Encontrar invoices con items
    const [invoicesWithItems] = await sequelize.query(`
      SELECT DISTINCT
        si."idSupplierInvoice",
        si."invoiceNumber",
        si.vendor,
        si."totalAmount",
        si.status,
        si."issueDate",
        si."paymentStatus"
      FROM "SupplierInvoices" si
      INNER JOIN "SupplierInvoiceItems" sii ON sii."supplierInvoiceId" = si."idSupplierInvoice"
    `);

    console.log(`📦 Invoices con Items: ${invoicesWithItems.length}`);
    console.log('');

    let itemsMigrated = 0;

    for (const invoice of invoicesWithItems) {
      console.log(`Procesando Invoice #${invoice.invoiceNumber} (${invoice.vendor})...`);
      
      // Obtener los items
      const [items] = await sequelize.query(`
        SELECT * FROM "SupplierInvoiceItems" 
        WHERE "supplierInvoiceId" = :invoiceId
      `, {
        replacements: { invoiceId: invoice.idSupplierInvoice }
      });

      console.log(`   Items encontrados: ${items.length}`);

      // Verificar si ya tiene expense vinculado
      const [existingLink] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM "SupplierInvoiceExpenses"
        WHERE "supplierInvoiceId" = :invoiceId
      `, {
        replacements: { invoiceId: invoice.idSupplierInvoice }
      });

      if (existingLink[0].count > 0) {
        console.log(`   ⏭️  Ya tiene ${existingLink[0].count} expense(s) vinculado(s) - omitiendo`);
        console.log('');
        continue;
      }

      // Crear UN expense consolidado por todos los items
      const totalFromItems = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return sum + (qty * price);
      }, 0);
      
      const itemsDescription = items.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return `${qty}x ${item.description} @ $${price.toFixed(2)}`;
      }).join('; ');

      const expenseNotes = `${invoice.vendor} - Invoice #${invoice.invoiceNumber}\nItems: ${itemsDescription}`;

      const newExpense = await Expense.create({
        amount: totalFromItems,
        date: invoice.issueDate || new Date(),
        category: 'materials',
        typeExpense: 'Materiales',
        paymentStatus: invoice.paymentStatus === 'paid' ? 'paid_via_invoice' : 'unpaid',
        paymentMethod: 'Cheque',
        notes: expenseNotes,
        expenseDate: invoice.issueDate || new Date(),
        paidDate: invoice.paymentStatus === 'paid' ? new Date() : null
      }, { transaction });

      // Vincular expense al invoice
      await sequelize.query(`
        INSERT INTO "SupplierInvoiceExpenses" ("idSupplierInvoiceExpense", "supplierInvoiceId", "expenseId", "amountApplied", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), :invoiceId, :expenseId, :amount, NOW(), NOW())
      `, {
        replacements: {
          invoiceId: invoice.idSupplierInvoice,
          expenseId: newExpense.idExpense,
          amount: totalFromItems
        },
        transaction
      });

      console.log(`   ✅ Expense creado: $${totalFromItems.toFixed(2)} (${newExpense.idExpense.substring(0, 8)}...)`);
      console.log(`   🔗 Vinculado al invoice`);
      console.log('');

      itemsMigrated++;
    }

    // 2. Encontrar invoices con works
    const [invoicesWithWorks] = await sequelize.query(`
      SELECT DISTINCT
        si."idSupplierInvoice",
        si."invoiceNumber",
        si.vendor,
        si."totalAmount",
        si.status,
        si."issueDate",
        si."paymentStatus"
      FROM "SupplierInvoices" si
      INNER JOIN "SupplierInvoiceWorks" siw ON siw."supplierInvoiceId" = si."idSupplierInvoice"
    `);

    console.log(`🏗️  Invoices con Works: ${invoicesWithWorks.length}`);
    console.log('');

    let worksMigrated = 0;

    for (const invoice of invoicesWithWorks) {
      console.log(`Procesando Invoice #${invoice.invoiceNumber} (${invoice.vendor})...`);
      
      // Obtener los works vinculados
      const [works] = await sequelize.query(`
        SELECT siw.*
        FROM "SupplierInvoiceWorks" siw
        WHERE siw."supplierInvoiceId" = :invoiceId
      `, {
        replacements: { invoiceId: invoice.idSupplierInvoice }
      });

      console.log(`   Works encontrados: ${works.length}`);

      // Verificar si ya tiene expenses vinculados
      const [existingLink] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM "SupplierInvoiceExpenses"
        WHERE "supplierInvoiceId" = :invoiceId
      `, {
        replacements: { invoiceId: invoice.idSupplierInvoice }
      });

      if (existingLink[0].count > 0) {
        console.log(`   ⏭️  Ya tiene ${existingLink[0].count} expense(s) vinculado(s) - omitiendo`);
        console.log('');
        continue;
      }

      // Crear un expense POR CADA work
      for (const work of works) {
        const workDesc = work.workId ? `Work ${work.workId.substring(0, 8)}...` : 'Work';
        const expenseNotes = `${invoice.vendor} - Invoice #${invoice.invoiceNumber} - ${workDesc}`;

        const newExpense = await Expense.create({
          amount: parseFloat(work.amountAllocated),
          date: invoice.issueDate || new Date(),
          category: 'labor',
          typeExpense: 'Workers',
          paymentStatus: invoice.paymentStatus === 'paid' ? 'paid_via_invoice' : 'unpaid',
          paymentMethod: 'Cheque',
          notes: expenseNotes,
          expenseDate: invoice.issueDate || new Date(),
          paidDate: invoice.paymentStatus === 'paid' ? new Date() : null,
          idWork: work.workId
        }, { transaction });

        // Vincular expense al invoice
        await sequelize.query(`
          INSERT INTO "SupplierInvoiceExpenses" ("idSupplierInvoiceExpense", "supplierInvoiceId", "expenseId", "amountApplied", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), :invoiceId, :expenseId, :amount, NOW(), NOW())
        `, {
          replacements: {
            invoiceId: invoice.idSupplierInvoice,
            expenseId: newExpense.idExpense,
            amount: parseFloat(work.amountAllocated)
          },
          transaction
        });

        console.log(`   ✅ Expense creado: $${parseFloat(work.amountAllocated).toFixed(2)} - ${workDesc.substring(0, 40)}...`);
      }

      console.log(`   🔗 ${works.length} expense(s) vinculados al invoice`);
      console.log('');

      worksMigrated++;
    }

    // COMMIT de la transacción
    await transaction.commit();

    console.log('═'.repeat(80));
    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log('═'.repeat(80));
    console.log('');
    console.log(`📦 Invoices con items migrados: ${itemsMigrated}`);
    console.log(`🏗️  Invoices con works migrados: ${worksMigrated}`);
    console.log(`📊 Total invoices procesados: ${itemsMigrated + worksMigrated}`);
    console.log('');
    console.log('🔍 Verificación:');
    
    const [finalCounts] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT sie."supplierInvoiceId") as invoices_with_links,
        COUNT(sie."idSupplierInvoiceExpense") as total_links,
        COUNT(DISTINCT sie."expenseId") as unique_expenses
      FROM "SupplierInvoiceExpenses" sie;
    `);

    console.log(`   • Invoices con vínculos: ${finalCounts[0].invoices_with_links}`);
    console.log(`   • Total de vínculos: ${finalCounts[0].total_links}`);
    console.log(`   • Expenses únicos: ${finalCounts[0].unique_expenses}`);
    console.log('');

    console.log('📌 IMPORTANTE:');
    console.log('   • Las tablas antiguas (SupplierInvoiceItems/Works) NO se eliminaron');
    console.log('   • Permanecen para historial y referencia');
    console.log('   • El código soporta AMBOS modelos simultáneamente');
    console.log('   • Nuevos invoices usarán automáticamente el modelo simplificado');
    console.log('');

    await sequelize.close();

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error durante la migración:', error.message);
    console.error(error);
    console.log('');
    console.log('🔄 Transacción revertida - ningún cambio fue aplicado');
    process.exit(1);
  }
}

// Ejecutar
console.log('⚠️  ADVERTENCIA: Este script modificará la base de datos');
console.log('   Asegúrate de tener un backup antes de continuar en producción');
console.log('');

migrateOldInvoices();
