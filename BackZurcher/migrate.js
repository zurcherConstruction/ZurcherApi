const { Sequelize } = require('sequelize');
const { conn } = require('./src/data/index');

async function runMigration() {
  const migrationName = process.argv[2] || 'add-budget-workflow-fields';
  
  console.log(`\n🚀 Iniciando migración: ${migrationName}...\n`);
  
  try {
    await conn.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida\n');
    
    let migrationScript;
    try {
      migrationScript = require(`./migrations/${migrationName}`);
    } catch (error) {
      console.error(`❌ No se encontró la migración: ./migrations/${migrationName}.js`);
      console.log('\n📋 Migraciones disponibles:');
      console.log('   - add-budget-workflow-fields');
      console.log('   - add-legacy-fields');
      console.log('   - add-external-referral-fields  🆕 NEW!');
      process.exit(1);
    }
    
    console.log('⚙️  Ejecutando migración...\n');
    await migrationScript.up(conn.getQueryInterface(), Sequelize);
    
    console.log('\n✅ Migración completada exitosamente!\n');
    
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await conn.close();
    console.log('🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
