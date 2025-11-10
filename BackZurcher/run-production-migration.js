/**
 * Script para ejecutar migraciones en PRODUCCIÓN (Railway)
 * 
 * USO:
 * 1. Asegúrate de tener DATABASE_URL de producción en .env
 * 2. Ejecuta: node run-production-migration.js
 */

require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL no está definida en .env');
  console.log('💡 Agrega la URL de producción de Railway en tu archivo .env');
  process.exit(1);
}

// Verificar que sea la URL de producción (Railway)
if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
  console.error('⚠️  ADVERTENCIA: Parece que DATABASE_URL apunta a localhost');
  console.log('🔍 URL actual:', databaseUrl);
  console.log('\n¿Estás seguro de que quieres ejecutar la migración en LOCAL?');
  console.log('Si quieres ejecutar en PRODUCCIÓN, cambia DATABASE_URL en .env a la de Railway\n');
  
  // Preguntar confirmación
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('¿Continuar de todos modos? (escribe "si" para continuar): ', (answer) => {
    readline.close();
    if (answer.toLowerCase() === 'si') {
      executeMigration();
    } else {
      console.log('❌ Migración cancelada');
      process.exit(0);
    }
  });
} else {
  console.log('🎯 Ejecutando migración en PRODUCCIÓN');
  console.log('🔗 Database:', databaseUrl.substring(0, 30) + '...');
  console.log('');
  executeMigration();
}

function executeMigration() {
  // Ejecutar la migración
  require('./migrations/add-note-alerts-and-reminders.js');
}
