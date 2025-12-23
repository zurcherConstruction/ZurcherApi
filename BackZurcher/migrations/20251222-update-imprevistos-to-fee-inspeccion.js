'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Iniciando migración: Cambiar "Imprevistos" a "Fee de Inspección"');
      
      // 1. Agregar el nuevo valor al ENUM en todas las tablas que lo usan
      console.log('📝 Agregando "Fee de Inspección" al ENUM...');
      
      // Expenses.typeExpense
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Expenses_typeExpense" ADD VALUE IF NOT EXISTS 'Fee de Inspección';`,
        { transaction }
      );
      
      // Receipts.type  
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Receipts_type" ADD VALUE IF NOT EXISTS 'Fee de Inspección';`,
        { transaction }
      );
      
      // SupplierInvoiceItems.category
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_SupplierInvoiceItems_category" ADD VALUE IF NOT EXISTS 'Fee de Inspección';`,
        { transaction }
      );
      
      console.log('✅ Nuevos valores agregados al ENUM');
      
      // 2. Actualizar todos los registros existentes
      console.log('📋 Actualizando registros existentes...');
      
      // Actualizar Expenses
      const [expensesResults] = await queryInterface.sequelize.query(
        `UPDATE "Expenses" SET "typeExpense" = 'Fee de Inspección' WHERE "typeExpense" = 'Imprevistos';`,
        { transaction }
      );
      console.log(`   ✅ Expenses actualizados: ${expensesResults.length} registros`);
      
      // Actualizar Receipts
      const [receiptsResults] = await queryInterface.sequelize.query(
        `UPDATE "Receipts" SET "type" = 'Fee de Inspección' WHERE "type" = 'Imprevistos';`,
        { transaction }
      );
      console.log(`   ✅ Receipts actualizados: ${receiptsResults.length} registros`);
      
      // Actualizar SupplierInvoiceItems
      const [supplierResults] = await queryInterface.sequelize.query(
        `UPDATE "SupplierInvoiceItems" SET "category" = 'Fee de Inspección' WHERE "category" = 'Imprevistos';`,
        { transaction }
      );
      console.log(`   ✅ SupplierInvoiceItems actualizados: ${supplierResults.length} registros`);
      
      // 3. Verificar que no queden registros con "Imprevistos"
      console.log('🔍 Verificando actualización...');
      
      const [expensesCheck] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM "Expenses" WHERE "typeExpense" = 'Imprevistos';`,
        { transaction }
      );
      
      const [receiptsCheck] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM "Receipts" WHERE "type" = 'Imprevistos';`,
        { transaction }
      );
      
      const [supplierCheck] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM "SupplierInvoiceItems" WHERE "category" = 'Imprevistos';`,
        { transaction }
      );
      
      const remainingExpenses = parseInt(expensesCheck[0].count);
      const remainingReceipts = parseInt(receiptsCheck[0].count);
      const remainingSupplier = parseInt(supplierCheck[0].count);
      
      if (remainingExpenses === 0 && remainingReceipts === 0 && remainingSupplier === 0) {
        console.log('✅ Todos los registros actualizados correctamente');
        
        // 4. OPCIONAL: Remover el valor viejo del ENUM (comentado por seguridad)
        // Nota: En PostgreSQL no se puede remover fácilmente un valor de ENUM
        // si hay columnas que lo referencian, así que lo dejamos por compatibilidad
        
        console.log('🎉 Migración completada exitosamente');
        console.log('📝 "Imprevistos" → "Fee de Inspección" actualizado en toda la BD');
      } else {
        throw new Error(`Aún quedan registros sin actualizar: Expenses(${remainingExpenses}), Receipts(${remainingReceipts}), SupplierItems(${remainingSupplier})`);
      }
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Revertiendo migración: "Fee de Inspección" → "Imprevistos"');
      
      // Actualizar registros de vuelta
      await queryInterface.sequelize.query(
        `UPDATE "Expenses" SET "typeExpense" = 'Imprevistos' WHERE "typeExpense" = 'Fee de Inspección';`,
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        `UPDATE "Receipts" SET "type" = 'Imprevistos' WHERE "type" = 'Fee de Inspección';`,
        { transaction }
      );
      
      await queryInterface.sequelize.query(
        `UPDATE "SupplierInvoiceItems" SET "category" = 'Imprevistos' WHERE "category" = 'Fee de Inspección';`,
        { transaction }
      );
      
      console.log('✅ Registros revertidos a "Imprevistos"');
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};