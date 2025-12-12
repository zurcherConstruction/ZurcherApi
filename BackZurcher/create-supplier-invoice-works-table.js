/**
 * Script para crear la tabla SupplierInvoiceWorks
 * Uso: node create-supplier-invoice-works-table.js
 */

const { Sequelize } = require('sequelize');
const { conn } = require('./src/data/index');

async function createTable() {
  try {
    // Verificar conexión a la base de datos
    await conn.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
    console.log('🚀 Iniciando migración: create-supplier-invoice-works-table...\n');
    
    // Cargar el script de migración
    const migration = require('./src/data/migrations/20251212-create-supplier-invoice-works-table.js');
    
    console.log('⚙️  Ejecutando migración...\n');
    await migration.up(conn.getQueryInterface(), Sequelize);
    
    console.log('\n🎉 Migración completada exitosamente!\n');
    console.log('📋 Cambios aplicados:');
    console.log('   ✅ Tabla SupplierInvoiceWorks creada');
    console.log('   ✅ Relación entre SupplierInvoices y Works establecida');
    console.log('   ✅ Índices y constraints agregados\n');
    
  } catch (error) {
    console.error('\n❌ Error al ejecutar la migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await conn.close();
    console.log('✅ Conexión cerrada');
  }
}

createTable();
