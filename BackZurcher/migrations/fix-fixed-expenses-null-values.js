/**
 * Migración: Limpiar tabla FixedExpenses incompleta
 * 
 * Problema: La tabla tiene registros pero le faltan columnas (category, frequency, paymentMethod)
 * 
 * Solución: Vaciar la tabla para que Sequelize la recree correctamente
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Limpiando tabla FixedExpenses incompleta...\n');

    try {
      // 1. Verificar si la tabla existe
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses';
      `);

      if (tables.length === 0) {
        console.log('✅ La tabla FixedExpenses no existe. No se requiere limpieza.');
        return;
      }

      console.log('📊 La tabla FixedExpenses existe');

      // 2. Verificar columnas existentes
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses'
        ORDER BY column_name;
      `);

      console.log('� Columnas actuales:');
      columns.forEach(col => console.log(`   - ${col.column_name}`));

      const columnNames = columns.map(c => c.column_name);
      const hasCategoryColumn = columnNames.includes('category');
      const hasFrequencyColumn = columnNames.includes('frequency');
      const hasPaymentMethodColumn = columnNames.includes('paymentMethod');

      // 3. Si faltan columnas críticas, vaciar la tabla
      if (!hasCategoryColumn || !hasFrequencyColumn || !hasPaymentMethodColumn) {
        console.log('\n⚠️  Faltan columnas críticas. Vaciando la tabla...');
        console.log(`   - category: ${hasCategoryColumn ? '✅' : '❌'}`);
        console.log(`   - frequency: ${hasFrequencyColumn ? '✅' : '❌'}`);
        console.log(`   - paymentMethod: ${hasPaymentMethodColumn ? '✅' : '❌'}`);

        // Contar registros antes de eliminar
        const [beforeCount] = await queryInterface.sequelize.query(`
          SELECT COUNT(*) as count FROM "FixedExpenses";
        `);
        console.log(`\n🗑️  Eliminando ${beforeCount[0].count} registros incompletos...`);

        // Vaciar la tabla
        await queryInterface.sequelize.query(`
          TRUNCATE TABLE "FixedExpenses" CASCADE;
        `);

        console.log('✅ Tabla vaciada. Sequelize la recreará correctamente al iniciar.');
      } else {
        console.log('\n✅ La tabla tiene todas las columnas necesarias.');
      }

      console.log('\n✅ Migración completada');

    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No hay rollback - los datos eliminados no se pueden recuperar
    console.log('⚠️  No hay rollback disponible para esta migración');
  }
};
