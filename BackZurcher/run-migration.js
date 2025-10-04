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
      console.log('   - complete-enum-migration (⭐ RECOMENDADO - Migración completa)');
      console.log('   - add-payment-method (💳 Agregar método de pago a Income/Expense)');
      console.log('   - add-verified-field (✅ Agregar campo de verificación a Income/Expense)');
      console.log('   - add-payment-proof-method (💳 Agregar método de pago a Budget)');
      console.log('   - add-cascade-delete (🗑️ Habilitar eliminación en cascada)');
      console.log('   - make-permit-nullable (🔓 Hacer PermitIdPermit nullable)');
      console.log('   - add-unique-constraints (🔒 Agregar constraints de unicidad)');
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
    } else if (migrationName === 'complete-enum-migration') {
      console.log('📋 ⭐ MIGRACIÓN COMPLETA APLICADA:');
      console.log('\n   🔹 Staff.role:');
      console.log('      ✅ Agregado valor "sales_rep"');
      console.log('\n   🔹 Expense.typeExpense:');
      console.log('      ✅ Agregado valor "Comisión Vendedor"');
      console.log('\n   🔹 Receipt.type:');
      console.log('      ✅ Agregado valor "Comisión Vendedor"');
      console.log('\n   🔹 Budget (8 nuevas columnas):');
      console.log('      ✅ leadSource (ENUM)');
      console.log('      ✅ createdByStaffId (UUID)');
      console.log('      ✅ salesCommissionAmount (DECIMAL)');
      console.log('      ✅ clientTotalPrice (DECIMAL)');
      console.log('      ✅ commissionPercentage (DECIMAL)');
      console.log('      ✅ commissionAmount (DECIMAL)');
      console.log('      ✅ commissionPaid (BOOLEAN)');
      console.log('      ✅ commissionPaidDate (DATE)');
      console.log('\n   💡 Ahora puedes:');
      console.log('      • Crear usuarios con rol "sales_rep"');
      console.log('      • Registrar gastos tipo "Comisión Vendedor"');
      console.log('      • Adjuntar comprobantes de comisiones');
      console.log('      • Rastrear comisiones en presupuestos');
    } else if (migrationName === 'add-payment-method') {
      console.log('📋 💳 MÉTODO DE PAGO AGREGADO:');
      console.log('\n   🔹 Incomes:');
      console.log('      ✅ Nueva columna "paymentMethod" (STRING)');
      console.log('\n   🔹 Expenses:');
      console.log('      ✅ Nueva columna "paymentMethod" (STRING)');
      console.log('\n   💡 Ahora puedes registrar:');
      console.log('      • Método de pago para cada ingreso (Zelle, Cash, Check, etc.)');
      console.log('      • Cuenta o método para cada gasto (Credit Card, Bank Transfer, etc.)');
      console.log('      • Mejor tracking financiero y reconciliación bancaria');
    } else if (migrationName === 'add-verified-field') {
      console.log('📋 ✅ CAMPO DE VERIFICACIÓN AGREGADO:');
      console.log('\n   🔹 Incomes:');
      console.log('      ✅ Nueva columna "verified" (BOOLEAN, default: false)');
      console.log('\n   🔹 Expenses:');
      console.log('      ✅ Nueva columna "verified" (BOOLEAN, default: false)');
      console.log('\n   💡 Ahora puedes:');
      console.log('      • Marcar ingresos/gastos como verificados');
      console.log('      • Identificar visualmente transacciones revisadas');
      console.log('      • Mejorar control financiero y auditoría');
      console.log('      • Filtrar por items pendientes de revisión');
    } else if (migrationName === 'add-payment-proof-method') {
      console.log('📋 💳 MÉTODO DE PAGO EN BUDGET AGREGADO:');
      console.log('\n   🔹 Budgets:');
      console.log('      ✅ Nueva columna "paymentProofMethod" (STRING)');
      console.log('\n   💡 Ahora puedes:');
      console.log('      • Guardar método de pago al subir comprobante inicial');
      console.log('      • Transferir método de pago a Income automáticamente');
      console.log('      • Mejor tracking de pagos iniciales de presupuestos');
    } else if (migrationName === 'add-cascade-delete') {
      console.log('📋 🗑️ ELIMINACIÓN EN CASCADA HABILITADA:');
      console.log('\n   🔹 Budget CASCADE:');
      console.log('      ✅ BudgetLineItems se eliminan automáticamente');
      console.log('      ✅ Work.idBudget se pone NULL (Work no se elimina)');
      console.log('\n   🔹 Work CASCADE:');
      console.log('      ✅ Materials se eliminan automáticamente');
      console.log('      ✅ MaterialSets se eliminan automáticamente');
      console.log('      ✅ Inspections se eliminan automáticamente');
      console.log('      ✅ InstallationDetails se eliminan automáticamente');
      console.log('      ✅ Images se eliminan automáticamente');
      console.log('      ✅ ChangeOrders se eliminan automáticamente');
      console.log('      ✅ FinalInvoices se eliminan automáticamente');
      console.log('      ✅ MaintenanceVisits se eliminan automáticamente');
      console.log('\n   💡 Ahora puedes:');
      console.log('      • Eliminar Works de prueba sin borrar todo manualmente');
      console.log('      • Eliminar Budgets sin orphan records');
      console.log('      • Limpiar datos de testing fácilmente');
      console.log('\n   ⚠️  IMPORTANTE:');
      console.log('      • Receipts, Incomes y Expenses NO se eliminan (usar lógica de aplicación)');
      console.log('      • Permits NO se eliminan (pueden estar asociados a múltiples Works)');
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
