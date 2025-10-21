/**
 * Script de Fix: Agregar campos faltantes a Expenses
 * 
 * Este script verifica y agrega solo los campos que faltan:
 * - supplierInvoiceItemId (falta)
 * 
 * paymentStatus y paidDate ya existen, así que los omitimos.
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function fixMissingFields() {
  try {
    console.log('\n🔧 Iniciando fix de campos faltantes en Expenses...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    const queryInterface = sequelize.getQueryInterface();

    // Verificar qué campos existen
    const tableDescription = await queryInterface.describeTable('Expenses');
    
    const hasPaymentStatus = !!tableDescription.paymentStatus;
    const hasPaidDate = !!tableDescription.paidDate;
    const hasSupplierInvoiceItemId = !!tableDescription.supplierInvoiceItemId;

    console.log('📊 Estado de campos:');
    console.log(`   paymentStatus: ${hasPaymentStatus ? '✅ Existe' : '❌ Falta'}`);
    console.log(`   paidDate: ${hasPaidDate ? '✅ Existe' : '❌ Falta'}`);
    console.log(`   supplierInvoiceItemId: ${hasSupplierInvoiceItemId ? '✅ Existe' : '❌ Falta'}\n`);

    // Agregar campos faltantes
    if (!hasSupplierInvoiceItemId) {
      console.log('🔧 Agregando campo supplierInvoiceItemId...');
      
      await queryInterface.addColumn('Expenses', 'supplierInvoiceItemId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'SupplierInvoiceItems',
          key: 'idItem'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Item del invoice de proveedor que pagó este gasto'
      });

      console.log('✅ Campo supplierInvoiceItemId agregado correctamente\n');
    }

    if (!hasPaidDate) {
      console.log('🔧 Agregando campo paidDate...');
      
      await queryInterface.addColumn('Expenses', 'paidDate', {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha en que se pagó el gasto'
      });

      console.log('✅ Campo paidDate agregado correctamente\n');
    }

    // Verificación final
    const finalDescription = await queryInterface.describeTable('Expenses');
    
    console.log('📊 Verificación final:');
    console.log(`   paymentStatus: ${finalDescription.paymentStatus ? '✅' : '❌'}`);
    console.log(`   paidDate: ${finalDescription.paidDate ? '✅' : '❌'}`);
    console.log(`   supplierInvoiceItemId: ${finalDescription.supplierInvoiceItemId ? '✅' : '❌'}\n`);

    console.log('✅ Fix completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error en el fix:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexión cerrada\n');
  }
}

fixMissingFields();
