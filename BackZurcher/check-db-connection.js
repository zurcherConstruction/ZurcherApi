const { sequelize } = require('./src/data');

(async () => {
  try {
    console.log('🔍 Información de la conexión de base de datos:\n');
    
    const config = sequelize.config;
    console.log('Host:', config.host);
    console.log('Database:', config.database);
    console.log('Port:', config.port);
    console.log('Username:', config.username);
    console.log('\n¿Es Railway?', config.host?.includes('railway') || config.host?.includes('postgres'));
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
