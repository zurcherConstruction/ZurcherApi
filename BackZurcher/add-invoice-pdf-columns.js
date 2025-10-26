/**
 * Script de migración: Agregar campos para PDF del invoice
 * Ejecutar: node add-invoice-pdf-columns.js
 */

const { conn } = require('./src/data/index');

async function addInvoicePdfColumns() {
  const queryInterface = conn.getQueryInterface();
  const transaction = await conn.transaction();

  try {
    console.log('🔄 Iniciando migración: Agregar campos invoicePdfPath e invoicePdfPublicId...\n');

    // Verificar si las columnas ya existen
    const tableDescription = await queryInterface.describeTable('SupplierInvoices');
    
    if (tableDescription.invoicePdfPath) {
      console.log('⚠️  La columna "invoicePdfPath" ya existe. Saltando...');
    } else {
      console.log('📝 Agregando columna "invoicePdfPath"...');
      await queryInterface.addColumn(
        'SupplierInvoices',
        'invoicePdfPath',
        {
          type: conn.Sequelize.STRING(500),
          allowNull: true,
          comment: 'URL del PDF/imagen del invoice en Cloudinary'
        },
        { transaction }
      );
      console.log('✅ Columna "invoicePdfPath" agregada exitosamente');
    }

    if (tableDescription.invoicePdfPublicId) {
      console.log('⚠️  La columna "invoicePdfPublicId" ya existe. Saltando...');
    } else {
      console.log('📝 Agregando columna "invoicePdfPublicId"...');
      await queryInterface.addColumn(
        'SupplierInvoices',
        'invoicePdfPublicId',
        {
          type: conn.Sequelize.STRING(200),
          allowNull: true,
          comment: 'Public ID de Cloudinary del PDF/imagen del invoice'
        },
        { transaction }
      );
      console.log('✅ Columna "invoicePdfPublicId" agregada exitosamente');
    }

    await transaction.commit();
    
    console.log('\n✅ Migración completada exitosamente\n');
    console.log('📊 Verificando cambios...');
    
    // Verificar que se agregaron correctamente
    const updatedDescription = await queryInterface.describeTable('SupplierInvoices');
    
    if (updatedDescription.invoicePdfPath && updatedDescription.invoicePdfPublicId) {
      console.log('✅ Ambas columnas verificadas en la tabla SupplierInvoices');
      console.log('   - invoicePdfPath:', updatedDescription.invoicePdfPath.type);
      console.log('   - invoicePdfPublicId:', updatedDescription.invoicePdfPublicId.type);
    }

    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error en migración:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
}

// Ejecutar migración
addInvoicePdfColumns();
