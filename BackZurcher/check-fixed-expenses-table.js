const { conn } = require('./src/data');

async function checkFixedExpensesTable() {
  try {
    await conn.authenticate();
    console.log('✅ Conexión establecida');

    // Verificar si la tabla existe
    const [results] = await conn.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'FixedExpenses'
      ORDER BY ordinal_position;
    `);

    if (results.length > 0) {
      console.log('\n📋 Tabla FixedExpenses EXISTE con las siguientes columnas:');
      results.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
      });
    } else {
      console.log('\n❌ La tabla FixedExpenses NO existe');
    }

    await conn.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFixedExpensesTable();
