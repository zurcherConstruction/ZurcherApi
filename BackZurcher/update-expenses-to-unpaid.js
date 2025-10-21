/**
 * Script: Actualizar todos los expenses existentes a estado 'unpaid'
 */

const { Expense, sequelize } = require('./src/data');

async function updateExistingExpenses() {
  console.log('\n🔄 Actualizando expenses existentes...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Actualizar todos los expenses que no tengan paymentStatus o que esté en NULL
    const [updated] = await sequelize.query(`
      UPDATE "Expenses"
      SET "paymentStatus" = 'unpaid'
      WHERE "paymentStatus" IS NULL;
    `);

    console.log(`✅ Actualiz ados ${updated} expenses a estado 'unpaid' (que tenían NULL)\n`);

    // También actualizar todos los que puedan tener valores no válidos
    // y forzar todos a 'unpaid' si no están pagados
    const result = await Expense.update(
      { paymentStatus: 'unpaid' },
      {
        where: {
          paymentStatus: null
        }
      }
    );

    console.log(`✅ Resultado del update con Sequelize: ${result[0]} filas actualizadas\n`);

    // Verificar el estado actual
    const byStatus = await sequelize.query(`
      SELECT "paymentStatus", COUNT(*) as count
      FROM "Expenses"
      GROUP BY "paymentStatus"
      ORDER BY count DESC;
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📊 Estado final de expenses por paymentStatus:');
    byStatus.forEach(row => {
      console.log(`   ${row.paymentStatus}: ${row.count}`);
    });

    console.log('\n✅ Actualización completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

updateExistingExpenses();
