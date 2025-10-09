const { conn } = require('./src/data');

async function cleanupFixedExpensesEnums() {
  try {
    await conn.authenticate();
    console.log('✅ Conexión establecida');

    // Eliminar tabla si existe
    console.log('📝 Eliminando tabla FixedExpenses...');
    await conn.query('DROP TABLE IF EXISTS "FixedExpenses" CASCADE;');
    console.log('✅ Tabla FixedExpenses eliminada');

    // Eliminar ENUMs
    console.log('📝 Eliminando ENUMs residuales...');
    
    const enums = [
      'enum_FixedExpenses_frequency',
      'enum_FixedExpenses_paymentMethod',
      'enum_FixedExpenses_category'
    ];

    for (const enumName of enums) {
      try {
        await conn.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE;`);
        console.log(`✅ ENUM ${enumName} eliminado`);
      } catch (error) {
        console.log(`ℹ️  ENUM ${enumName} no existía`);
      }
    }

    console.log('\n✅ Limpieza completada. Ahora puedes ejecutar la migración.');
    
    await conn.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupFixedExpensesEnums();
