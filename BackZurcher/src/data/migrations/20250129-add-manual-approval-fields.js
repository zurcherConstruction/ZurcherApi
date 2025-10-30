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

      // Agregar campo approvalMethod
      await queryInterface.addColumn(
        'ChangeOrders',
        'approvalMethod',
        {
          type: Sequelize.ENUM('email', 'manual'),
          allowNull: true,
          comment: 'Método de aprobación: email (aprobación por enlace) o manual (aprobación telefónica/presencial)'
        },
        { transaction }
      );

      // Agregar campo manualApprovalNotes
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

      // Agregar campo manualApprovedBy
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

      // Agregar campo manualApprovedAt
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

      // Agregar campo clientNotifiedAt
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

      // Agregar campo clientNotificationMethod
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
