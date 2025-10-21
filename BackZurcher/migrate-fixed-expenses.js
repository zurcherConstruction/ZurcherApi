/**
 * Script: Migrar sistema completo de supplier invoices + fixed expenses
 * 
 * 1. Ejecuta migraciones para agregar paymentStatus a FixedExpenses
 * 2. Ejecuta migración para agregar relatedFixedExpenseId a SupplierInvoiceItems
 * 3. Actualiza todos los FixedExpenses existentes a 'unpaid'
 */

const { sequelize, FixedExpense } = require('./src/data');

async function migrateFixedExpenses() {
  console.log('\n🚀 Iniciando migración completa...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Ejecutar migraciones
    console.log('📦 Ejecutando migraciones...\n');
    
    const migration1 = require('./migrations/add-payment-status-to-fixed-expenses');
    await migration1.up(sequelize.getQueryInterface());
    console.log('✅ Migración 1: paymentStatus agregado a FixedExpenses\n');

    const migration2 = require('./migrations/add-related-fixed-expense-to-items');
    await migration2.up(sequelize.getQueryInterface());
    console.log('✅ Migración 2: relatedFixedExpenseId agregado a SupplierInvoiceItems\n');

    // 2. Contar FixedExpenses existentes
    const totalFixed = await FixedExpense.count();
    console.log(`📊 Total de FixedExpenses encontrados: ${totalFixed}\n`);

    if (totalFixed > 0) {
      // 3. Actualizar todos a 'unpaid'
      const [updated] = await FixedExpense.update(
        { paymentStatus: 'unpaid' },
        {
          where: {
            paymentStatus: null // Solo actualizar los que no tienen status
          }
        }
      );

      console.log(`✅ Actualizados ${updated} FixedExpenses a estado 'unpaid'\n`);

      // 4. Verificar estado final
      const byStatus = await sequelize.query(`
        SELECT "paymentStatus", COUNT(*) as count
        FROM "FixedExpenses"
        GROUP BY "paymentStatus"
        ORDER BY count DESC;
      `, { type: sequelize.QueryTypes.SELECT });

      console.log('📊 FixedExpenses por estado de pago:');
      byStatus.forEach(row => {
        console.log(`   ${row.paymentStatus || 'NULL'}: ${row.count}`);
      });
      console.log('');

      // 5. Mostrar primeros 3 Fixed Expenses
      const sample = await FixedExpense.findAll({
        limit: 3,
        order: [['createdAt', 'DESC']],
        attributes: ['idFixedExpense', 'name', 'amount', 'frequency', 'category', 'paymentStatus', 'vendor']
      });

      console.log('📋 Primeros 3 FixedExpenses:');
      sample.forEach(fe => {
        console.log(`   - [${fe.paymentStatus}] $${fe.amount} - ${fe.name} - ${fe.category} (${fe.frequency})`);
      });
      console.log('');
    }

    console.log('✅ Migración completada exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

migrateFixedExpenses();
