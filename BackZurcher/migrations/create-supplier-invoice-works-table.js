/**
 * Migración: Crear tabla SupplierInvoiceWorks
 * 
 * Esta tabla vincula Supplier Invoices con Works para permitir:
 * - Vincular invoices a uno o más trabajos al crearlos
 * - Auto-generar gastos distribuidos equitativamente cuando se paga el invoice
 * - Evitar tener que usar el modal de distribución manual para casos simples
 * 
 * Fecha: 2025-11-06
 */

const { SupplierInvoice, Work } = require('../src/data');

async function up() {
  const sequelize = SupplierInvoice.sequelize;
  
  try {
    console.log('📊 Creando tabla SupplierInvoiceWorks...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SupplierInvoiceWorks" (
        "idSupplierInvoiceWork" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "supplierInvoiceId" UUID NOT NULL REFERENCES "SupplierInvoices"("idSupplierInvoice") ON DELETE CASCADE ON UPDATE CASCADE,
        "workId" UUID NOT NULL REFERENCES "Works"("idWork") ON DELETE CASCADE ON UPDATE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE("supplierInvoiceId", "workId")
      );
    `);
    
    console.log('✅ Tabla SupplierInvoiceWorks creada exitosamente');
    
    // Crear índices
    console.log('📊 Creando índices...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "supplier_invoice_works_invoice_id" 
      ON "SupplierInvoiceWorks"("supplierInvoiceId");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "supplier_invoice_works_work_id" 
      ON "SupplierInvoiceWorks"("workId");
    `);
    
    console.log('✅ Índices creados exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  }
}

async function down() {
  const sequelize = SupplierInvoice.sequelize;
  
  try {
    console.log('📊 Eliminando tabla SupplierInvoiceWorks...');
    
    await sequelize.query(`
      DROP TABLE IF EXISTS "SupplierInvoiceWorks";
    `);
    
    console.log('✅ Tabla SupplierInvoiceWorks eliminada');
    
  } catch (error) {
    console.error('❌ Error en rollback:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migración fallida:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
