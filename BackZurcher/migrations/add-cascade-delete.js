'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔧 Iniciando migración para agregar CASCADE DELETE...\n');

      // 1. Works -> Budget (Foreign Key: idBudget)
      console.log('1️⃣ Modificando relación Works -> Budget...');
      await queryInterface.sequelize.query(`
        ALTER TABLE "Works" 
        DROP CONSTRAINT IF EXISTS "Works_idBudget_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Works" 
        ADD CONSTRAINT "Works_idBudget_fkey" 
        FOREIGN KEY ("idBudget") 
        REFERENCES "Budgets"("idBudget") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Works -> Budget actualizado\n');

      // 2. BudgetLineItems -> Budget (Foreign Key: budgetId)
      console.log('2️⃣ Modificando relación BudgetLineItems -> Budget...');
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
      console.log('✅ BudgetLineItems -> Budget actualizado\n');

      // 3. Budgets -> Permit (Foreign Key: PermitIdPermit)
      // Usamos DEFERRABLE para permitir eliminar Budget primero y Permit después dentro de una transacción
      console.log('3️⃣ Modificando relación Budgets -> Permit (DEFERRABLE)...');
      await queryInterface.sequelize.query(`
        ALTER TABLE "Budgets" 
        DROP CONSTRAINT IF EXISTS "Budgets_PermitIdPermit_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Budgets" 
        ADD CONSTRAINT "Budgets_PermitIdPermit_fkey" 
        FOREIGN KEY ("PermitIdPermit") 
        REFERENCES "Permits"("idPermit") 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
        DEFERRABLE INITIALLY DEFERRED;
      `, { transaction });
      console.log('✅ Budgets -> Permit actualizado (DEFERRABLE - permite eliminación en orden)\n');

      // 4. Incomes -> Work (Foreign Key: workId)
      console.log('4️⃣ Modificando relación Incomes -> Work...');
      await queryInterface.sequelize.query(`
        ALTER TABLE "Incomes" 
        DROP CONSTRAINT IF EXISTS "Incomes_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Incomes" 
        ADD CONSTRAINT "Incomes_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Incomes -> Work actualizado\n');

      // 5. Expenses -> Work (Foreign Key: workId)
      console.log('5️⃣ Modificando relación Expenses -> Work...');
      await queryInterface.sequelize.query(`
        ALTER TABLE "Expenses" 
        DROP CONSTRAINT IF EXISTS "Expenses_workId_fkey";
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE "Expenses" 
        ADD CONSTRAINT "Expenses_workId_fkey" 
        FOREIGN KEY ("workId") 
        REFERENCES "Works"("idWork") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `, { transaction });
      console.log('✅ Expenses -> Work actualizado\n');

      // 6. Materials -> Work (Foreign Key: workId)
      console.log('6️⃣ Modificando relación Materials -> Work...');
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
      console.log('✅ Materials -> Work actualizado\n');

      // 7. Inspections -> Work (Foreign Key: workId)
      console.log('7️⃣ Modificando relación Inspections -> Work...');
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
      console.log('✅ Inspections -> Work actualizado\n');

      // 8. Images -> Work (Foreign Key: idWork)
      console.log('8️⃣ Modificando relación Images -> Work...');
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
      console.log('✅ Images -> Work actualizado\n');

      // 9. InstallationDetails -> Work (Foreign Key: idWork)
      console.log('9️⃣ Modificando relación InstallationDetails -> Work...');
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
      console.log('✅ InstallationDetails -> Work actualizado\n');

      // 10. MaterialSets -> Work (Foreign Key: workId)
      console.log('🔟 Modificando relación MaterialSets -> Work...');
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
      console.log('✅ MaterialSets -> Work actualizado\n');

      // 11. ChangeOrders -> Work (Foreign Key: workId)
      console.log('1️⃣1️⃣ Modificando relación ChangeOrders -> Work...');
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
      console.log('✅ ChangeOrders -> Work actualizado\n');

      // 12. FinalInvoices -> Work (Foreign Key: workId)
      console.log('1️⃣2️⃣ Modificando relación FinalInvoices -> Work...');
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
      console.log('✅ FinalInvoices -> Work actualizado\n');

      // 13. MaintenanceVisits -> Work (Foreign Key: workId)
      console.log('1️⃣3️⃣ Modificando relación MaintenanceVisits -> Work...');
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
      console.log('✅ MaintenanceVisits -> Work actualizado\n');

      await transaction.commit();
      console.log('\n🎉 Migración CASCADE DELETE completada exitosamente!\n');
      console.log('📋 Resumen:');
      console.log('   ✅ 13 relaciones actualizadas con CASCADE DELETE');
      console.log('   ✅ Ahora al eliminar un Budget o Work, se eliminarán automáticamente todos sus datos relacionados\n');
      
    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Error durante la migración CASCADE DELETE:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️ Rollback no implementado para CASCADE DELETE');
    console.log('Esta migración modifica constraints existentes.');
    console.log('Para revertir, necesitarías restaurar los constraints originales manualmente.');
  }
};
