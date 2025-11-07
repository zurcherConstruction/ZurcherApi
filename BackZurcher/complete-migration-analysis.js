/**
 * SCRIPT COMPLETO DE MIGRACIÓN Y ADAPTACIÓN
 * 
 * PARTE 1: Ejecutar migraciones en producción
 * PARTE 2: Analizar cuentas por pagar existentes
 * PARTE 3: Generar plan de adaptación
 */

const { SupplierInvoice, SupplierInvoiceItem, SupplierInvoiceWork, Expense, Work, sequelize } = require('./src/data');
const { Op } = require('sequelize');

async function completeMigrationProcess() {
  try {
    await sequelize.authenticate();
    const dbName = process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'LOCAL';
    console.log(`✅ Conectado a base de datos: ${dbName}\n`);

    console.log('═'.repeat(80));
    console.log('🔍 PARTE 1: VERIFICACIÓN PRE-MIGRACIÓN');
    console.log('═'.repeat(80));
    console.log('');

    // 1. Verificar si ya existe la tabla SupplierInvoiceExpenses
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'SupplierInvoiceExpenses'
      );
    `);

    console.log('📋 Estado de la base de datos:');
    console.log(`   Tabla SupplierInvoiceExpenses: ${tableExists[0].exists ? '✅ YA EXISTE' : '❌ NO EXISTE (necesita migración)'}`);
    console.log('');

    // 2. Verificar columnas en SupplierInvoices
    const [receiptUrlExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'SupplierInvoices' AND column_name = 'receiptUrl'
      );
    `);

    console.log(`   Columna receiptUrl: ${receiptUrlExists[0].exists ? '✅ YA EXISTE' : '❌ NO EXISTE (necesita migración)'}`);
    console.log('');

    if (!tableExists[0].exists || !receiptUrlExists[0].exists) {
      console.log('⚠️  MIGRACIÓN NECESARIA');
      console.log('');
      console.log('Por favor ejecuta estos comandos en tu base de datos de producción:');
      console.log('');
      console.log('1. Conectarse a Railway/PostgreSQL:');
      console.log('   railway connect');
      console.log('');
      console.log('2. Ejecutar el archivo de migración:');
      console.log('   \\i migrations/create-supplier-invoice-expenses-prod.sql');
      console.log('');
      console.log('O copia y pega el contenido del archivo directamente en el cliente SQL.');
      console.log('');
      console.log('Después de ejecutar la migración, vuelve a correr este script.');
      console.log('');
      await sequelize.close();
      return;
    }

    console.log('✅ Todas las migraciones ya están aplicadas');
    console.log('');

    // PARTE 2: Análisis de datos existentes
    console.log('═'.repeat(80));
    console.log('📊 PARTE 2: ANÁLISIS DE CUENTAS POR PAGAR EXISTENTES');
    console.log('═'.repeat(80));
    console.log('');

    // Total de invoices
    const totalInvoices = await SupplierInvoice.count();
    const pendingInvoices = await SupplierInvoice.count({ where: { status: 'pending' } });
    const paidInvoices = await SupplierInvoice.count({ where: { status: 'paid' } });

    console.log('📋 SUPPLIER INVOICES:');
    console.log(`   Total: ${totalInvoices}`);
    console.log(`   • Pending: ${pendingInvoices}`);
    console.log(`   • Paid: ${paidInvoices}`);
    console.log('');

    // Verificar si existen las tablas del modelo antiguo
    const [itemsTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'SupplierInvoiceItems'
      );
    `);

    let invoicesWithItems = [];
    
    if (itemsTableExists[0].exists) {
      // Invoices con items (modelo antiguo)
      invoicesWithItems = await sequelize.query(`
        SELECT 
          si."idSupplierInvoice",
          si."invoiceNumber",
          si.vendor,
          si."totalAmount",
          si.status,
          si."createdAt",
          COUNT(sii."idSupplierInvoiceItem") as items_count,
          COALESCE(SUM(sii.quantity * sii.price), 0) as items_total
        FROM "SupplierInvoices" si
        LEFT JOIN "SupplierInvoiceItems" sii ON sii."supplierInvoiceId" = si."idSupplierInvoice"
        GROUP BY si."idSupplierInvoice"
        HAVING COUNT(sii."idSupplierInvoiceItem") > 0
        ORDER BY si."createdAt" DESC
      `, { type: sequelize.QueryTypes.SELECT });
    }

    console.log('🔧 INVOICES CON ITEMS (modelo antiguo):');
    if (invoicesWithItems.length === 0) {
      console.log('   ✅ No hay invoices con items - puedes usar el nuevo sistema directamente');
    } else {
      console.log(`   ⚠️  Encontrados ${invoicesWithItems.length} invoices con items detallados:`);
      console.log('');
      
      invoicesWithItems.forEach((inv, index) => {
        if (index < 5) { // Mostrar solo primeros 5
          console.log(`   ${index + 1}. Invoice #${inv.invoiceNumber || 'Sin número'}`);
          console.log(`      Vendor: ${inv.vendor}`);
          console.log(`      Total en invoice: $${parseFloat(inv.totalAmount).toFixed(2)}`);
          console.log(`      Items: ${inv.items_count} (suma: $${parseFloat(inv.items_total).toFixed(2)})`);
          console.log(`      Status: ${inv.status}`);
          console.log(`      Fecha: ${new Date(inv.createdAt).toISOString().split('T')[0]}`);
          console.log('');
        }
      });

      if (invoicesWithItems.length > 5) {
        console.log(`   ... y ${invoicesWithItems.length - 5} más`);
        console.log('');
      }
    }

    // Verificar si existe la tabla de works
    const [worksTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'SupplierInvoiceWorks'
      );
    `);

    let invoicesWithWorks = [];
    
    if (worksTableExists[0].exists) {
      // Invoices con works vinculados (modelo antiguo)
      invoicesWithWorks = await sequelize.query(`
        SELECT 
          si."idSupplierInvoice",
          si."invoiceNumber",
          si.vendor,
          si."totalAmount",
          si.status,
          COUNT(siw."idSupplierInvoiceWork") as works_count,
          COALESCE(SUM(siw."amountAllocated"), 0) as works_total
        FROM "SupplierInvoices" si
        LEFT JOIN "SupplierInvoiceWorks" siw ON siw."supplierInvoiceId" = si."idSupplierInvoice"
        GROUP BY si."idSupplierInvoice"
        HAVING COUNT(siw."idSupplierInvoiceWork") > 0
        ORDER BY si."createdAt" DESC
      `, { type: sequelize.QueryTypes.SELECT });
    }

    console.log('🏗️  INVOICES CON WORKS VINCULADOS (modelo antiguo):');
    if (invoicesWithWorks.length === 0) {
      console.log('   ✅ No hay invoices con works - sistema limpio');
    } else {
      console.log(`   ⚠️  Encontrados ${invoicesWithWorks.length} invoices con works:`);
      console.log('');

      invoicesWithWorks.forEach((inv, index) => {
        if (index < 5) {
          console.log(`   ${index + 1}. Invoice #${inv.invoiceNumber || 'Sin número'}`);
          console.log(`      Vendor: ${inv.vendor}`);
          console.log(`      Total: $${parseFloat(inv.totalAmount).toFixed(2)}`);
          console.log(`      Works: ${inv.works_count} (asignado: $${parseFloat(inv.works_total).toFixed(2)})`);
          console.log(`      Status: ${inv.status}`);
          console.log('');
        }
      });

      if (invoicesWithWorks.length > 5) {
        console.log(`   ... y ${invoicesWithWorks.length - 5} más`);
        console.log('');
      }
    }

    // PARTE 3: Plan de adaptación
    console.log('═'.repeat(80));
    console.log('📝 PARTE 3: PLAN DE ADAPTACIÓN');
    console.log('═'.repeat(80));
    console.log('');

    const needsAdaptation = invoicesWithItems.length > 0 || invoicesWithWorks.length > 0;

    if (!needsAdaptation) {
      console.log('✅ NO SE REQUIERE ADAPTACIÓN');
      console.log('');
      console.log('   Tu sistema NO tiene cuentas por pagar con el modelo antiguo.');
      console.log('   Puedes comenzar a usar el nuevo sistema inmediatamente.');
      console.log('');
      console.log('   Próximos pasos:');
      console.log('   1. Deploy del código nuevo');
      console.log('   2. Crear invoices usando el formulario simplificado');
      console.log('   3. Pagar usando las 3 opciones disponibles');
    } else {
      console.log('⚠️  SE REQUIERE ADAPTACIÓN');
      console.log('');
      console.log('   Resumen de invoices a revisar:');
      console.log(`   • ${invoicesWithItems.length} invoices con items detallados`);
      console.log(`   • ${invoicesWithWorks.length} invoices con works vinculados`);
      console.log('');
      console.log('   OPCIONES DE ADAPTACIÓN:');
      console.log('');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   OPCIÓN A: MANTENER COMO HISTÓRICO (RECOMENDADA)');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('   ✅ Ventajas:');
      console.log('      • No requiere trabajo manual');
      console.log('      • No hay riesgo de perder información');
      console.log('      • Los invoices antiguos siguen siendo consultables');
      console.log('');
      console.log('   ⚙️  Cómo funciona:');
      console.log('      • Invoices antiguos se mantienen sin cambios');
      console.log('      • Nuevos invoices usan el sistema simplificado');
      console.log('      • Ambos modelos coexisten (código ya preparado)');
      console.log('');
      console.log('   📋 Acción requerida:');
      console.log('      • Ninguna - solo deploy del código');
      console.log('');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   OPCIÓN B: RE-CREAR INVOICES IMPORTANTES');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('   ⚙️  Para cada invoice importante pendiente:');
      console.log('      1. Crear nuevo invoice simple (vendor + total + receipt)');
      console.log('      2. Vincular expenses existentes o crear nuevos');
      console.log('      3. Marcar invoice antiguo como pagado o eliminarlo');
      console.log('');
      console.log('   📋 Acción requerida:');
      console.log('      • Trabajo manual por cada invoice PENDING importante');
      console.log('      • Invoices PAID pueden dejarse como histórico');
      console.log('');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   OPCIÓN C: MIGRACIÓN AUTOMÁTICA (AVANZADA)');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('   ⚠️  Solo si tienes MUCHOS invoices pendientes');
      console.log('');
      console.log('   ⚙️  Script automático que:');
      console.log('      • Crea expense único por invoice con items');
      console.log('      • Convierte works vinculados en expenses');
      console.log('      • Migra a la nueva estructura');
      console.log('');
      console.log('   📋 Acción requerida:');
      console.log('      • Escribir script personalizado de migración');
      console.log('      • ⚠️ REQUIERE testing exhaustivo antes de ejecutar');
      console.log('');
    }

    // Estadísticas de expenses
    console.log('═'.repeat(80));
    console.log('💰 ESTADÍSTICAS DE EXPENSES');
    console.log('═'.repeat(80));
    console.log('');

    const totalExpenses = await Expense.count();
    const unpaidExpenses = await Expense.count({ where: { paymentStatus: 'unpaid' } });
    const paidExpenses = await Expense.count({ where: { paymentStatus: 'paid' } });
    const paidViaInvoice = await Expense.count({ where: { paymentStatus: 'paid_via_invoice' } });

    console.log(`   Total expenses: ${totalExpenses}`);
    console.log(`   • Unpaid: ${unpaidExpenses} (${(unpaidExpenses/totalExpenses*100).toFixed(1)}%)`);
    console.log(`   • Paid: ${paidExpenses} (${(paidExpenses/totalExpenses*100).toFixed(1)}%)`);
    console.log(`   • Paid via Invoice: ${paidViaInvoice} (${(paidViaInvoice/totalExpenses*100).toFixed(1)}%)`);
    console.log('');

    console.log(`   📌 Expenses disponibles para vincular: ${unpaidExpenses} (sin contar los ya vinculados)`);
    console.log('');

    // Resumen final
    console.log('═'.repeat(80));
    console.log('✅ RESUMEN Y RECOMENDACIÓN');
    console.log('═'.repeat(80));
    console.log('');

    if (!needsAdaptation) {
      console.log('🎉 Tu sistema está LISTO para el nuevo modelo!');
      console.log('');
      console.log('Puedes hacer el deployment inmediatamente:');
      console.log('1. git push origin yani62');
      console.log('2. Merge a main');
      console.log('3. Railway hará deploy automático');
      console.log('4. Comenzar a usar el nuevo sistema');
    } else {
      console.log('💡 RECOMENDACIÓN: OPCIÓN A (Mantener como histórico)');
      console.log('');
      console.log('Razones:');
      console.log(`• ${invoicesWithItems.length + invoicesWithWorks.length} invoices con modelo antiguo`);
      console.log('• El código nuevo soporta AMBOS modelos');
      console.log('• No hay riesgo de pérdida de datos');
      console.log('• Los invoices antiguos permanecen consultables');
      console.log('• Nuevos invoices usan automáticamente el modelo simplificado');
      console.log('');
      console.log('Solo necesitas:');
      console.log('1. Hacer deploy del código');
      console.log('2. Empezar a crear nuevos invoices con el sistema simplificado');
      console.log('3. Los antiguos seguirán funcionando para consulta');
      console.log('');
      console.log(`Si hay invoices PENDING importantes (${invoicesWithItems.filter(i => i.status === 'pending').length + invoicesWithWorks.filter(i => i.status === 'pending').length}), considera re-crearlos manualmente.`);
    }

    console.log('');
    await sequelize.close();
    console.log('✅ Análisis completado - Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
completeMigrationProcess();
