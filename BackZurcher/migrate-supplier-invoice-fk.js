const {sequelize} = require('./src/data');

(async () => {
  try {
    console.log('=== CAMBIANDO FOREIGN KEY DE supplierInvoiceItemId ===\n');
    
    // 0. Limpiar valores inválidos primero
    console.log('0. Limpiando valores de supplierInvoiceItemId...');
    await sequelize.query(`
      UPDATE "Expenses" 
      SET "supplierInvoiceItemId" = NULL 
      WHERE "supplierInvoiceItemId" IS NOT NULL;
    `);
    console.log('✅ Valores limpiados\n');
    
    // 1. Eliminar el constraint actual
    console.log('1. Eliminando constraint actual...');
    await sequelize.query(`
      ALTER TABLE "Expenses" 
      DROP CONSTRAINT IF EXISTS "Expenses_supplierInvoiceItemId_fkey";
    `);
    console.log('✅ Constraint eliminado\n');
    
    // 2. Crear nuevo constraint apuntando a SupplierInvoices
    console.log('2. Creando nuevo constraint apuntando a SupplierInvoices...');
    await sequelize.query(`
      ALTER TABLE "Expenses" 
      ADD CONSTRAINT "Expenses_supplierInvoiceItemId_fkey" 
      FOREIGN KEY ("supplierInvoiceItemId") 
      REFERENCES "SupplierInvoices"("idSupplierInvoice") 
      ON DELETE SET NULL;
    `);
    console.log('✅ Nuevo constraint creado\n');
    
    console.log('=== MIGRACIÓN COMPLETADA ===');
    console.log('Ahora supplierInvoiceItemId apunta a SupplierInvoices.idSupplierInvoice');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
