const { Sequelize } = require('sequelize');
const { conn } = require('./src/data/index');
const migrationScript = require('./migrations/add-legacy-fields');

/**
 * Script para ejecutar la migración de campos Legacy con Cloudinary
 * Uso: node run-migration.js
 */

async function runMigration() {
  console.log('� Iniciando migración de campos Legacy con Cloudinary...');
  
  try {
    // Verificar conexión a la base de datos
    await conn.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
    
    // Ejecutar la migración
    await migrationScript.up(conn.getQueryInterface(), Sequelize);
    
    console.log('🎉 Migración completada exitosamente!');
    console.log('📋 Campos agregados:');
    console.log('   - Budgets: isLegacy, legacySignedPdfUrl, legacySignedPdfPublicId');
    console.log('   - Permits: isLegacy');
    console.log('   - Works: isLegacy');
    console.log('📈 Índices creados para mejorar performance');
    console.log('🔗 Los PDFs ahora se almacenan en Cloudinary (URLs) en lugar de BLOB');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await conn.close();
    console.log('🔒 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };