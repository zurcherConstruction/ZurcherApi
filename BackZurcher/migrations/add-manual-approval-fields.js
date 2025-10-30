'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Verificar si la tabla existe
      const tableExists = await queryInterface.sequelize.query(
        `SELECT to_regclass('"ChangeOrders"');`,
        { transaction }
      );

      if (!tableExists[0][0].to_regclass) {
        console.log('⚠️  Tabla ChangeOrders no existe, saltando migración');
        await transaction.commit();
        return;
      }

      console.log('🔄 Agregando campos de aprobación manual a ChangeOrders...');

      // Crear tipo ENUM para approvalMethod
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_ChangeOrders_approvalMethod" AS ENUM ('email', 'manual');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });

      // Verificar y agregar campo approvalMethod
      const [approvalMethodExists] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ChangeOrders' AND column_name = 'approvalMethod';
      `, { transaction });

      if (approvalMethodExists.length === 0) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "ChangeOrders" 
          ADD COLUMN "approvalMethod" "enum_ChangeOrders_approvalMethod";
        `, { transaction });
        
        await queryInterface.sequelize.query(`
          COMMENT ON COLUMN "ChangeOrders"."approvalMethod" IS 'Método de aprobación: email (aprobación por enlace) o manual (aprobación telefónica/presencial)';
        `, { transaction });
        console.log('   ✅ approvalMethod agregado');
      } else {
        console.log('   ⏭️  approvalMethod ya existe');
      }

      // Verificar y agregar campo manualApprovalNotes
      const [notesExists] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ChangeOrders' AND column_name = 'manualApprovalNotes';
      `, { transaction });

      if (notesExists.length === 0) {
        await queryInterface.addColumn(
          'ChangeOrders',
          'manualApprovalNotes',
          {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Notas sobre la aprobación manual: día, hora, cómo se contactó al cliente, etc.'
          },
          { transaction }
        );
        console.log('   ✅ manualApprovalNotes agregado');
      } else {
        console.log('   ⏭️  manualApprovalNotes ya existe');
      }

      // Verificar y agregar campo manualApprovedBy
      const [approvedByExists] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ChangeOrders' AND column_name = 'manualApprovedBy';
      `, { transaction });

      if (approvedByExists.length === 0) {
        await queryInterface.addColumn(
          'ChangeOrders',
          'manualApprovedBy',
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Usuario/Staff que registró la aprobación manual'
          },
          { transaction }
        );
        console.log('   ✅ manualApprovedBy agregado');
      } else {
        console.log('   ⏭️  manualApprovedBy ya existe');
      }

      // Verificar y agregar campo manualApprovedAt
      const [approvedAtExists] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ChangeOrders' AND column_name = 'manualApprovedAt';
      `, { transaction });

      if (approvedAtExists.length === 0) {
        await queryInterface.addColumn(
          'ChangeOrders',
          'manualApprovedAt',
          {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Fecha y hora en que se registró la aprobación manual en el sistema'
          },
          { transaction }
        );
        console.log('   ✅ manualApprovedAt agregado');
      } else {
        console.log('   ⏭️  manualApprovedAt ya existe');
      }

      // Verificar y agregar campo clientNotifiedAt
      const [notifiedAtExists] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ChangeOrders' AND column_name = 'clientNotifiedAt';
      `, { transaction });

      if (notifiedAtExists.length === 0) {
        await queryInterface.addColumn(
          'ChangeOrders',
          'clientNotifiedAt',
          {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Fecha y hora en que se notificó al cliente (por teléfono, presencial, etc.)'
          },
          { transaction }
        );
        console.log('   ✅ clientNotifiedAt agregado');
      } else {
        console.log('   ⏭️  clientNotifiedAt ya existe');
      }

      // Verificar y agregar campo clientNotificationMethod
      const [notificationMethodExists] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ChangeOrders' AND column_name = 'clientNotificationMethod';
      `, { transaction });

      if (notificationMethodExists.length === 0) {
        await queryInterface.addColumn(
          'ChangeOrders',
          'clientNotificationMethod',
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Método usado para notificar: teléfono, presencial, WhatsApp, etc.'
          },
          { transaction }
        );
        console.log('   ✅ clientNotificationMethod agregado');
      } else {
        console.log('   ⏭️  clientNotificationMethod ya existe');
      }

      await transaction.commit();
      console.log('✅ Campos de aprobación manual agregados exitosamente');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración de aprobación manual:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Revirtiendo campos de aprobación manual...');

      await queryInterface.removeColumn('ChangeOrders', 'clientNotificationMethod', { transaction });
      await queryInterface.removeColumn('ChangeOrders', 'clientNotifiedAt', { transaction });
      await queryInterface.removeColumn('ChangeOrders', 'manualApprovedAt', { transaction });
      await queryInterface.removeColumn('ChangeOrders', 'manualApprovedBy', { transaction });
      await queryInterface.removeColumn('ChangeOrders', 'manualApprovalNotes', { transaction });
      await queryInterface.removeColumn('ChangeOrders', 'approvalMethod', { transaction });

      // Eliminar el tipo ENUM
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_ChangeOrders_approvalMethod";',
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Campos de aprobación manual revertidos exitosamente');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error revirtiendo migración:', error);
      throw error;
    }
  }
};
