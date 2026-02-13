const { sequelize } = require('./src/data');

async function listAllTables() {
  try {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    console.log(`📊 Base de datos: ${isDevelopment ? 'LOCAL (Desarrollo)' : 'PRODUCCIÓN'}`);
    console.log('🔍 Listando todas las tablas en la base de datos...\n');

    const [results] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('📋 Tablas encontradas:');
    results.forEach((row, index) => {
      console.log(`${index + 1}. ${row.tablename}`);
    });

    console.log(`\n✅ Total: ${results.length} tablas`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAllTables();
