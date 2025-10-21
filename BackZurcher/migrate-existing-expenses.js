/**
 * Script de migración de datos: Actualizar expenses existentes
 * 
 * Este script actualiza todos los Expenses que ya existen en la base de datos
 * para que tengan los nuevos campos de paymentStatus configurados correctamente.
 */

const { Expense, sequelize } = require('./src/data');

async function migrateExistingExpenses() {
  console.log('\n🔄 Iniciando migración de Expenses existentes...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Contar expenses existentes
    const totalExpenses = await Expense.count();
    console.log(`📊 Total de expenses en el sistema: ${totalExpenses}\n`);

    if (totalExpenses === 0) {
      console.log('ℹ️  No hay expenses para migrar\n');
      return;
    }

    // 2. Verificar cuántos ya tienen paymentStatus configurado
    const expensesWithStatus = await Expense.count({
      where: {
        paymentStatus: ['unpaid', 'paid', 'paid_via_invoice']
      }
    });

    console.log(`✅ Expenses con paymentStatus: ${expensesWithStatus}`);
    console.log(`⚠️  Expenses sin paymentStatus: ${totalExpenses - expensesWithStatus}\n`);

    // 3. Obtener todos los expenses que necesitan actualización
    const expensesToUpdate = await Expense.findAll({
      where: {
        paymentStatus: null
      }
    });

    if (expensesToUpdate.length === 0) {
      console.log('✅ Todos los expenses ya tienen paymentStatus configurado\n');
      return;
    }

    console.log(`🔧 Actualizando ${expensesToUpdate.length} expenses...\n`);

    // 4. Estrategia de migración:
    // - Si tiene paymentMethod y paymentDetails → marcar como 'paid'
    // - Si NO tiene paymentMethod → marcar como 'unpaid'
    
    let updatedCount = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (const expense of expensesToUpdate) {
      let newStatus = 'unpaid'; // Por defecto
      let paidDate = null;

      // Si tiene método de pago, asumimos que fue pagado
      if (expense.paymentMethod) {
        newStatus = 'paid';
        paidDate = expense.date; // Usar la fecha del expense como fecha de pago
        paidCount++;
      } else {
        unpaidCount++;
      }

      await expense.update({
        paymentStatus: newStatus,
        paidDate: paidDate,
        supplierInvoiceItemId: null
      });

      updatedCount++;

      // Mostrar progreso cada 10 registros
      if (updatedCount % 10 === 0) {
        console.log(`   Procesados: ${updatedCount}/${expensesToUpdate.length}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📊 Resumen:`);
    console.log(`   Total actualizado: ${updatedCount}`);
    console.log(`   Marcados como 'paid': ${paidCount}`);
    console.log(`   Marcados como 'unpaid': ${unpaidCount}`);
    console.log('\n💡 Estrategia aplicada:');
    console.log('   - Expenses CON paymentMethod → paid');
    console.log('   - Expenses SIN paymentMethod → unpaid');
    console.log('\n✅ Todos los expenses ahora tienen paymentStatus\n');

  } catch (error) {
    console.error('\n❌ Error en la migración:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  migrateExistingExpenses();
}

module.exports = { migrateExistingExpenses };
