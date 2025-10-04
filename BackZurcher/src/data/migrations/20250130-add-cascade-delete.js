'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Actualizando constraints para eliminación en cascada...');

      // ===== BUDGET CASCADE DELETES =====
      
      // 1. BudgetLineItems -> Budget (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "BudgetLineItems" 
        DROP CONSTRAINT IF EXISTS "BudgetLineItems_budgetId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "BudgetLineItems" 
        ADD CONSTRAINT "BudgetLineItems_budgetId_fkey" 
        FOREIGN KEY ("budgetId") 
        REFERENCES "Budgets"("idBudget") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ BudgetLineItems ahora se eliminan en cascada con Budget');

      // 2. Works -> Budget (SET NULL - no eliminar Work si se borra Budget)
      await queryInterface.sequelize.query(`
        ALTER TABLE "Works" 
        DROP CONSTRAINT IF EXISTS "Works_idBudget_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Works" 
        ADD CONSTRAINT "Works_idBudget_fkey" 
        FOREIGN KEY ("idBudget") 
        REFERENCES "Budgets"("idBudget") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Works.idBudget se pondrá NULL si se elimina Budget');

      // ===== WORK CASCADE DELETES =====
      
      // 3. Materials -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "Materials" 
        DROP CONSTRAINT IF EXISTS "Materials_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Materials" 
        ADD CONSTRAINT "Materials_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Materials ahora se eliminan en cascada con Work');

      // 4. MaterialSets -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "MaterialSets" 
        DROP CONSTRAINT IF EXISTS "MaterialSets_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "MaterialSets" 
        ADD CONSTRAINT "MaterialSets_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ MaterialSets ahora se eliminan en cascada con Work');

      // 5. Inspections -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "Inspections" 
        DROP CONSTRAINT IF EXISTS "Inspections_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Inspections" 
        ADD CONSTRAINT "Inspections_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Inspections ahora se eliminan en cascada con Work');

      // 6. InstallationDetails -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "InstallationDetails" 
        DROP CONSTRAINT IF EXISTS "InstallationDetails_idWork_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "InstallationDetails" 
        ADD CONSTRAINT "InstallationDetails_idWork_fkey" 
        FOREIGN KEY ("idWork") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ InstallationDetails ahora se eliminan en cascada con Work');

      // 7. Images -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "Images" 
        DROP CONSTRAINT IF EXISTS "Images_idWork_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Images" 
        ADD CONSTRAINT "Images_idWork_fkey" 
        FOREIGN KEY ("idWork") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Images ahora se eliminan en cascada con Work');

      // 8. ChangeOrders -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "ChangeOrders" 
        DROP CONSTRAINT IF EXISTS "ChangeOrders_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "ChangeOrders" 
        ADD CONSTRAINT "ChangeOrders_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ ChangeOrders ahora se eliminan en cascada con Work');

      // 9. FinalInvoices -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "FinalInvoices" 
        DROP CONSTRAINT IF EXISTS "FinalInvoices_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "FinalInvoices" 
        ADD CONSTRAINT "FinalInvoices_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ FinalInvoices ahora se eliminan en cascada con Work');

      // 10. MaintenanceVisits -> Work (CASCADE)
      await queryInterface.sequelize.query(`
        ALTER TABLE "MaintenanceVisits" 
        DROP CONSTRAINT IF EXISTS "MaintenanceVisits_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "MaintenanceVisits" 
        ADD CONSTRAINT "MaintenanceVisits_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ MaintenanceVisits ahora se eliminan en cascada con Work');

      // ===== PERMIT CASCADE (OPCIONAL - CUIDADO) =====
      // NOTA: NO recomiendo CASCADE en Permit porque múltiples Works/Budgets pueden compartir un Permit
      // Mejor usar SET NULL o lógica en aplicación

      await transaction.commit();
      console.log('🎉 Migración de CASCADE completada exitosamente!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración CASCADE:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir cambios (volver a RESTRICT o NO ACTION)
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('⏪ Revirtiendo constraints CASCADE...');

      // Revertir todas las constraints a RESTRICT
      const tables = [
        { table: 'BudgetLineItems', fk: 'budgetId', ref: 'Budgets', refKey: 'idBudget' },
        { table: 'Materials', fk: 'workId', ref: 'Works', refKey: 'idWork' },
        { table: 'MaterialSets', fk: 'workId', ref: 'Works', refKey: 'idWork' },
        { table: 'Inspections', fk: 'workId', ref: 'Works', refKey: 'idWork' },
        { table: 'InstallationDetails', fk: 'idWork', ref: 'Works', refKey: 'idWork' },
        { table: 'Images', fk: 'idWork', ref: 'Works', refKey: 'idWork' },
        { table: 'ChangeOrders', fk: 'workId', ref: 'Works', refKey: 'idWork' },
        { table: 'FinalInvoices', fk: 'workId', ref: 'Works', refKey: 'idWork' },
        { table: 'MaintenanceVisits', fk: 'workId', ref: 'Works', refKey: 'idWork' },
      ];

      for (const { table, fk, ref, refKey } of tables) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "${table}" 
          DROP CONSTRAINT IF EXISTS "${table}_${fk}_fkey";
        `, { transaction });
        
        await queryInterface.sequelize.query(`
          ALTER TABLE "${table}" 
          ADD CONSTRAINT "${table}_${fk}_fkey" 
          FOREIGN KEY ("${fk}") 
          REFERENCES "${ref}"("${refKey}") 
          ON DELETE RESTRICT 
          ON UPDATE CASCADE;
        `, { transaction });
      }

      await transaction.commit();
      console.log('✅ Constraints revertidos a RESTRICT');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
