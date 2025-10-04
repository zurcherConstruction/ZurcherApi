const { Sequelize } = require('sequelize');
const { conn } = require('./src/data/index');

// El script de migración se carga dinámicamente según el argumento

/**
 * Script para ejecutar migraciones de la base de datos
 * Uso: node run-migration.js [nombre-migracion]
 * Ejemplos:
 *   node run-migration.js add-budget-workflow-fields
 *   node run-migration.js add-legacy-fields
 */

async function runMigration() {
  // Leer el argumento de línea de comandos
  const migrationName = process.argv[2] || 'add-budget-workflow-fields';

  try {
    // Verificar conexión a la base de datos
    await conn.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
    console.log(`🚀 Iniciando migración: ${migrationName}...\n`);

    // Cargar el script de migración
    let migrationScript;
    try {
      migrationScript = require(`./migrations/${migrationName}`);
    } catch (error) {
      console.error(`❌ No se encontró la migración: ./migrations/${migrationName}.js`);
      console.log('\n📋 Migraciones disponibles:');
      console.log('   - add-budget-workflow-fields');
      console.log('   - add-review-fields');
      console.log('   - add-supplier-name-to-line-items');
      console.log('   - add-legacy-fields');
      console.log('   - add-sales-rep-role');
      console.log('   - add-commission-fields');
      console.log('   - add-commission-expense-type');
      process.exit(1);
    }

    console.log('⚙️  Ejecutando migración...\n');
    await migrationScript.up(conn.getQueryInterface(), Sequelize);

    console.log('\n🎉 Migración completada exitosamente!\n');

    // Mensajes específicos según la migración
    if (migrationName === 'add-budget-workflow-fields') {
      console.log('📋 Cambios aplicados a la tabla Budgets:');
      console.log('   ✅ Nuevos estados: draft, pending_review, client_approved');
      console.log('   ✅ leadSource (ENUM): web, direct_client, social_media, referral, sales_rep');
      console.log('   ✅ createdByStaffId (UUID): Referencia al vendedor');
      console.log('   ✅ salesCommissionAmount (DECIMAL): Comisión fija del vendedor');
      console.log('   ✅ clientTotalPrice (DECIMAL): Total mostrado al cliente');
      console.log('   ✅ commissionPercentage, commissionAmount, commissionPaid, commissionPaidDate');
    } else if (migrationName === 'add-review-fields') {
      console.log('📋 Cambios aplicados a la tabla Budgets:');
      console.log('   ✅ reviewToken (STRING): Token único para revisión pública');
      console.log('   ✅ sentForReviewAt (DATE): Fecha de envío para revisión');
      console.log('   ✅ reviewedAt (DATE): Fecha de respuesta del cliente');
    } else if (migrationName === 'add-supplier-name-to-line-items') {
      console.log('📋 Cambios aplicados a la tabla BudgetLineItems:');
      console.log('   ✅ supplierName (STRING): Nombre del proveedor del item');
      console.log('   📦 Útil para categorías como SAND con múltiples proveedores');
    } else if (migrationName === 'add-legacy-fields') {
      console.log('📋 Campos agregados:');
      console.log('   - Budgets: isLegacy, legacySignedPdfUrl, legacySignedPdfPublicId');
      console.log('   - Permits: isLegacy');
      console.log('   - Works: isLegacy');
      console.log('📈 Índices creados para mejorar performance');
      console.log('🔗 Los PDFs ahora se almacenan en Cloudinary (URLs) en lugar de BLOB');
    }
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
