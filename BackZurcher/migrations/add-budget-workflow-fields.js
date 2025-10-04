/**
 * Migración: Agregar campos de workflow mejorado y sistema de comisiones
 * Fecha: 2025-10-03
 * Descripción: 
 * - Agrega nuevos estados al flujo de presupuestos (draft, pending_review, client_approved)
 * - Agrega sistema de vendedores y comisiones
 */

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Iniciando migración: add-budget-workflow-fields');

    try {
      // 1️⃣ Agregar campos de fuente de lead y vendedor
      console.log('📝 Agregando campos de lead source y vendedor...');
      
      // Verificar si leadSource ya existe antes de crear el ENUM
      const [leadSourceExists] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Budgets' AND column_name = 'leadSource';
      `);
      
      if (leadSourceExists.length === 0) {
        // Agregar ENUM para leadSource solo si no existe
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
        `);

        await queryInterface.addColumn('Budgets', 'leadSource', {
          type: Sequelize.ENUM('web', 'direct_client', 'social_media', 'referral', 'sales_rep'),
          allowNull: true,
          defaultValue: 'web'
        });
        console.log('   ✅ leadSource agregado');
      } else {
        console.log('   ⏭️  leadSource ya existe, omitiendo...');
      }

      // Agregar createdByStaffId
      const [staffIdExists] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Budgets' AND column_name = 'createdByStaffId';
      `);
      
      if (staffIdExists.length === 0) {
        await queryInterface.addColumn('Budgets', 'createdByStaffId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Staffs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('   ✅ createdByStaffId agregado');
      } else {
        console.log('   ⏭️  createdByStaffId ya existe, omitiendo...');
      }

      // 2️⃣ Agregar campos de comisión
      console.log('📝 Agregando campos de comisión...');

      await queryInterface.addColumn('Budgets', 'salesCommissionAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('Budgets', 'clientTotalPrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });

      await queryInterface.addColumn('Budgets', 'commissionPercentage', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('Budgets', 'commissionAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      await queryInterface.addColumn('Budgets', 'commissionPaid', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });

      await queryInterface.addColumn('Budgets', 'commissionPaidDate', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });

      console.log('✅ Campos de vendedor/comisiones agregados');

      // 2️⃣ Actualizar ENUM de status para incluir nuevos estados
      console.log('📝 Actualizando estados del presupuesto...');
      
      // PostgreSQL requiere alterar el tipo ENUM
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'draft';
        ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'pending_review';
        ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'client_approved';
      `);

      console.log('✅ Nuevos estados agregados al ENUM');

      // 3️⃣ NO actualizar presupuestos existentes
      // Los estados actuales (created, send, etc.) siguen funcionando normalmente
      // Los nuevos estados (draft, pending_review, client_approved) son OPCIONALES
      
      console.log('ℹ️  Estados existentes mantenidos sin cambios');
      console.log('🎉 Migración completada exitosamente');

    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⏪ Revirtiendo migración: add-budget-workflow-fields');

    try {
      // Remover columnas agregadas
      await queryInterface.removeColumn('Budgets', 'createdByStaffId');
      await queryInterface.removeColumn('Budgets', 'commissionPercentage');
      await queryInterface.removeColumn('Budgets', 'commissionAmount');
      await queryInterface.removeColumn('Budgets', 'commissionPaid');
      await queryInterface.removeColumn('Budgets', 'commissionPaidDate');

      // Nota: Remover valores del ENUM en PostgreSQL es más complejo
      // Requeriría recrear el tipo ENUM completo
      console.log('⚠️ Los valores del ENUM no se eliminan automáticamente');
      console.log('✅ Migración revertida');

    } catch (error) {
      console.error('❌ Error al revertir migración:', error);
      throw error;
    }
  }
};
