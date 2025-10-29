require('dotenv').config();
const { sequelize } = require('./src/data');

async function dropTables() {
  try {
    console.log('🗑️ Eliminando tablas WorkNotes y WorkStateHistories...');
    
    await sequelize.query('DROP TABLE IF EXISTS "WorkNotes" CASCADE;');
    console.log('✅ Tabla WorkNotes eliminada');
    
    await sequelize.query('DROP TABLE IF EXISTS "WorkStateHistories" CASCADE;');
    console.log('✅ Tabla WorkStateHistories eliminada');
    
    console.log('✅ Listo! Ahora puedes reiniciar el servidor con DB_SYNC_ALTER=true');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropTables();
