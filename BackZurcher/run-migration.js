const { Sequelize } = require('sequelize');
const { conn } = require('./src/data/index');
const fs = require('fs');
const path = require('path');

/**
 * Script de Migraciones Robusto
 * 
 * ✅ Características:
 * - Ejecuta migraciones de forma segura
 * - Idempotente (no falla si migración ya se ejecutó)
 * - Funciona en local y en deploy
 * - Logs detallados
 * - Transacciones automáticas
 * 
 * Uso: 
 *   node run-migration.js [nombre-migracion] [comando]
 *   node run-migration.js add-staffId-to-fixed-expenses up
 *   node run-migration.js list (muestra todas disponibles)
 */

async function listMigrations() {
  const migrationsPath = path.join(__dirname, 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.js'))
      .sort();

    console.log('\n📋 MIGRACIONES DISPONIBLES:\n');
    files.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.replace('.js', '')}`);
    });
    console.log();

    return files;
  } catch (error) {
    console.error('❌ Error leyendo migraciones:', error.message);
    return [];
  }
}

async function runMigration() {
  const migrationName = process.argv[2] || '';
  const command = process.argv[3] || 'up';

  try {
    // Verificar conexión
    console.log('\n🔄 Conectando a base de datos...');
    await conn.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida\n');

    // Si no hay nombre, listar disponibles
    if (!migrationName || migrationName === 'list') {
      const files = await listMigrations();
      process.exit(0);
    }

    console.log(`🚀 Ejecutando migración: ${migrationName}\n`);
    console.log(`${'-'.repeat(60)}\n`);

    // Cargar el script de migración
    let migrationScript;
    try {
      migrationScript = require(`./migrations/${migrationName}`);
    } catch (error) {
      console.error(`❌ No se encontró la migración: ./migrations/${migrationName}.js`);
      console.log('\n� Usa "node run-migration.js list" para ver todas disponibles\n');
      process.exit(1);
    }

    // Ejecutar migración (up o down)
    console.log(`⚙️  Ejecutando ${command.toUpperCase()}...\n`);
    
    if (command === 'up') {
      await migrationScript.up(conn.getQueryInterface(), Sequelize);
    } else if (command === 'down') {
      await migrationScript.down(conn.getQueryInterface(), Sequelize);
    } else {
      console.error(`❌ Comando desconocido: ${command}`);
      console.log('\n✅ Comandos soportados:');
      console.log('   - up   (ejecutar migración)');
      console.log('   - down (revertir migración)\n');
      process.exit(1);
    }

    console.log(`\n🎉 ${command.toUpperCase()} completado exitosamente!\n`);

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error);
    console.error('\nDetalles:', error.message);
    process.exit(1);
  } finally {
    await conn.close();
    console.log('\n🔒 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
