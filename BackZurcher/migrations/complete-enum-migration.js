/**
 * MIGRACIÓN COMPLETA DE ENUMS
 * 
 * Este script actualiza todos los tipos ENUM en la base de datos para que coincidan
 * con los modelos actualizados:
 * 
 * 1. Staff.role - Agregar 'sales_rep'
 * 2. Expense.typeExpense - Agregar 'Comisión Vendedor'
 * 3. Receipt.type - Agregar 'Comisión Vendedor'
 * 4. Budget - Agregar columnas del sistema de comisiones
 * 
 * Fecha: Octubre 2025
 */

const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  /**
   * Ejecutar la migración
   * @param {QueryInterface} queryInterface 
   */
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🚀 Iniciando migración completa de ENUMs...\n');

      // ============================================================
      // 1. ACTUALIZAR Staff.role - Agregar 'sales_rep'
      // ============================================================
      console.log('📝 Paso 1: Actualizando Staff.role...');
      
      // Verificar si 'sales_rep' ya existe
      const [staffRoleCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'sales_rep' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_Staffs_role'
          )
        ) AS exists;
      `, { transaction });

      if (!staffRoleCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_Staffs_role" 
          ADD VALUE IF NOT EXISTS 'sales_rep';
        `, { transaction });
        console.log('   ✅ Agregado valor "sales_rep" a Staff.role');
      } else {
        console.log('   ⏭️  Valor "sales_rep" ya existe en Staff.role');
      }

      // ============================================================
      // 2. ACTUALIZAR Expense.typeExpense - Agregar 'Comisión Vendedor'
      // ============================================================
      console.log('\n📝 Paso 2: Actualizando Expense.typeExpense...');
      
      // Verificar si 'Comisión Vendedor' ya existe
      const [expenseTypeCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'Comisión Vendedor' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_Expenses_typeExpense'
          )
        ) AS exists;
      `, { transaction });

      if (!expenseTypeCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_Expenses_typeExpense" 
          ADD VALUE IF NOT EXISTS 'Comisión Vendedor';
        `, { transaction });
        console.log('   ✅ Agregado valor "Comisión Vendedor" a Expense.typeExpense');
      } else {
        console.log('   ⏭️  Valor "Comisión Vendedor" ya existe en Expense.typeExpense');
      }

      // ============================================================
      // 3. ACTUALIZAR Receipt.type - Agregar 'Comisión Vendedor'
      // ============================================================
      console.log('\n📝 Paso 3: Actualizando Receipt.type...');
      
      // Verificar si 'Comisión Vendedor' ya existe en Receipt
      const [receiptTypeCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'Comisión Vendedor' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_Receipts_type'
          )
        ) AS exists;
      `, { transaction });

      if (!receiptTypeCheck[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_Receipts_type" 
          ADD VALUE IF NOT EXISTS 'Comisión Vendedor';
        `, { transaction });
        console.log('   ✅ Agregado valor "Comisión Vendedor" a Receipt.type');
      } else {
        console.log('   ⏭️  Valor "Comisión Vendedor" ya existe en Receipt.type');
      }

      // ============================================================
      // 4. AGREGAR COLUMNAS DE COMISIONES A BUDGET (si no existen)
      // ============================================================
      console.log('\n📝 Paso 4: Verificando columnas de comisiones en Budget...');

      // Verificar si las columnas ya existen
      const [budgetColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Budgets' 
        AND column_name IN (
          'leadSource', 
          'createdByStaffId', 
          'salesCommissionAmount', 
          'clientTotalPrice',
          'commissionPercentage',
          'commissionAmount',
          'commissionPaid',
          'commissionPaidDate'
        );
      `, { transaction });

      const existingColumns = budgetColumns.map(col => col.column_name);

      // leadSource ENUM
      if (!existingColumns.includes('leadSource')) {
        // Primero crear el tipo ENUM si no existe
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE "enum_Budgets_leadSource" AS ENUM (
              'web',
              'direct_client',
              'social_media',
              'referral',
              'sales_rep'
            );
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `, { transaction });

        await queryInterface.addColumn('Budgets', 'leadSource', {
          type: DataTypes.ENUM('web', 'direct_client', 'social_media', 'referral', 'sales_rep'),
          allowNull: true,
          defaultValue: 'web'
        }, { transaction });
        console.log('   ✅ Agregada columna "leadSource"');
      } else {
        console.log('   ⏭️  Columna "leadSource" ya existe');
      }

      // createdByStaffId
      if (!existingColumns.includes('createdByStaffId')) {
        await queryInterface.addColumn('Budgets', 'createdByStaffId', {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Staffs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
        console.log('   ✅ Agregada columna "createdByStaffId"');
      } else {
        console.log('   ⏭️  Columna "createdByStaffId" ya existe');
      }

      // salesCommissionAmount
      if (!existingColumns.includes('salesCommissionAmount')) {
        await queryInterface.addColumn('Budgets', 'salesCommissionAmount', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
        console.log('   ✅ Agregada columna "salesCommissionAmount"');
      } else {
        console.log('   ⏭️  Columna "salesCommissionAmount" ya existe');
      }

      // clientTotalPrice
      if (!existingColumns.includes('clientTotalPrice')) {
        await queryInterface.addColumn('Budgets', 'clientTotalPrice', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        }, { transaction });
        console.log('   ✅ Agregada columna "clientTotalPrice"');
      } else {
        console.log('   ⏭️  Columna "clientTotalPrice" ya existe');
      }

      // commissionPercentage
      if (!existingColumns.includes('commissionPercentage')) {
        await queryInterface.addColumn('Budgets', 'commissionPercentage', {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
        console.log('   ✅ Agregada columna "commissionPercentage"');
      } else {
        console.log('   ⏭️  Columna "commissionPercentage" ya existe');
      }

      // commissionAmount
      if (!existingColumns.includes('commissionAmount')) {
        await queryInterface.addColumn('Budgets', 'commissionAmount', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
        console.log('   ✅ Agregada columna "commissionAmount"');
      } else {
        console.log('   ⏭️  Columna "commissionAmount" ya existe');
      }

      // commissionPaid
      if (!existingColumns.includes('commissionPaid')) {
        await queryInterface.addColumn('Budgets', 'commissionPaid', {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false
        }, { transaction });
        console.log('   ✅ Agregada columna "commissionPaid"');
      } else {
        console.log('   ⏭️  Columna "commissionPaid" ya existe');
      }

      // commissionPaidDate
      if (!existingColumns.includes('commissionPaidDate')) {
        await queryInterface.addColumn('Budgets', 'commissionPaidDate', {
          type: DataTypes.DATEONLY,
          allowNull: true
        }, { transaction });
        console.log('   ✅ Agregada columna "commissionPaidDate"');
      } else {
        console.log('   ⏭️  Columna "commissionPaidDate" ya existe');
      }

      // ============================================================
      // COMMIT DE LA TRANSACCIÓN
      // ============================================================
      await transaction.commit();
      console.log('\n✅ ¡Migración completa exitosa!');
      console.log('\n📊 Resumen:');
      console.log('   • Staff.role: Agregado "sales_rep"');
      console.log('   • Expense.typeExpense: Agregado "Comisión Vendedor"');
      console.log('   • Receipt.type: Agregado "Comisión Vendedor"');
      console.log('   • Budget: Agregadas 8 columnas de sistema de comisiones');
      console.log('\n✨ La base de datos está sincronizada con los modelos.\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Error durante la migración:', error);
      throw error;
    }
  },

  /**
   * Revertir la migración
   * @param {QueryInterface} queryInterface 
   */
  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('⏪ Revirtiendo migración completa de ENUMs...\n');

      // ============================================================
      // REVERTIR COLUMNAS DE BUDGET
      // ============================================================
      console.log('📝 Eliminando columnas de comisiones de Budget...');
      
      const columnsToRemove = [
        'commissionPaidDate',
        'commissionPaid',
        'commissionAmount',
        'commissionPercentage',
        'clientTotalPrice',
        'salesCommissionAmount',
        'createdByStaffId',
        'leadSource'
      ];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('Budgets', column, { transaction });
          console.log(`   ✅ Eliminada columna "${column}"`);
        } catch (error) {
          console.log(`   ⏭️  Columna "${column}" no existe o ya fue eliminada`);
        }
      }

      // Eliminar el tipo ENUM de leadSource
      try {
        await queryInterface.sequelize.query(`
          DROP TYPE IF EXISTS "enum_Budgets_leadSource";
        `, { transaction });
        console.log('   ✅ Eliminado ENUM "enum_Budgets_leadSource"');
      } catch (error) {
        console.log('   ⏭️  ENUM "enum_Budgets_leadSource" no existe');
      }

      // ============================================================
      // NOTA: NO SE PUEDEN ELIMINAR VALORES DE ENUM EN POSTGRESQL
      // ============================================================
      console.log('\n⚠️  ADVERTENCIA:');
      console.log('   PostgreSQL NO permite eliminar valores de tipos ENUM.');
      console.log('   Los valores agregados ("sales_rep", "Comisión Vendedor") permanecerán en la base de datos.');
      console.log('   Si necesitas eliminarlos completamente, deberás recrear las tablas afectadas.');

      await transaction.commit();
      console.log('\n✅ Rollback completado (parcial - columnas eliminadas, ENUMs permanecen).\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Error durante el rollback:', error);
      throw error;
    }
  }
};
