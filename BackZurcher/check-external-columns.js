const { sequelize } = require('./src/data');

(async () => {
  try {
    console.log('🔍 Verificando columnas de referidos externos en Budgets...\n');

    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Budgets'
        AND (column_name LIKE '%external%' OR column_name = 'customCommissionAmount')
      ORDER BY column_name;
    `);

    if (results.length === 0) {
      console.log('❌ No se encontraron columnas de referidos externos');
    } else {
      console.log('✅ Columnas encontradas:');
      console.table(results);
    }

    // Check leadSource ENUM values
    console.log('\n🔍 Verificando valores ENUM de leadSource...\n');
    const [enumValues] = await sequelize.query(`
      SELECT enumlabel AS lead_source_value
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'enum_Budgets_leadSource'
      ORDER BY enumlabel;
    `);

    console.log('✅ Valores de leadSource ENUM:');
    enumValues.forEach(row => console.log('  -', row.lead_source_value));

    await sequelize.close();
    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
