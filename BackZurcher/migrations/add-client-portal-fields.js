const { DataTypes } = require('sequelize');

/**
 * Migración para agregar campos del portal de clientes
 * - Budget: clientPortalToken (para acceso seguro al portal)
 * - WorkNote: isVisibleToClient (para controlar visibilidad de notas)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // 1. Agregar campo clientPortalToken a la tabla Budget
      await queryInterface.addColumn('Budget', 'clientPortalToken', {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Token único para acceso al portal de seguimiento del cliente'
      });

      // 2. Crear índice para el clientPortalToken (para búsquedas rápidas)
      await queryInterface.addIndex('Budget', ['clientPortalToken'], {
        name: 'idx_budget_client_portal_token',
        unique: true
      });

      // 3. Agregar campo isVisibleToClient a la tabla WorkNote
      await queryInterface.addColumn('WorkNote', 'isVisibleToClient', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la nota es visible para el cliente en el portal'
      });

      // 4. Crear índice para isVisibleToClient (para filtros rápidos)
      await queryInterface.addIndex('WorkNote', ['isVisibleToClient'], {
        name: 'idx_worknote_visible_to_client'
      });

      console.log('✅ Campos del portal de clientes agregados correctamente:');
      console.log('   - Budget.clientPortalToken con índice único');
      console.log('   - WorkNote.isVisibleToClient con índice de filtro');

    } catch (error) {
      console.error('❌ Error en migración de portal de clientes:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revertir cambios en orden inverso

      // 1. Eliminar índice de WorkNote
      await queryInterface.removeIndex('WorkNote', 'idx_worknote_visible_to_client');
      
      // 2. Eliminar campo isVisibleToClient
      await queryInterface.removeColumn('WorkNote', 'isVisibleToClient');

      // 3. Eliminar índice de Budget
      await queryInterface.removeIndex('Budget', 'idx_budget_client_portal_token');
      
      // 4. Eliminar campo clientPortalToken
      await queryInterface.removeColumn('Budget', 'clientPortalToken');

      console.log('✅ Migración del portal de clientes revertida correctamente');

    } catch (error) {
      console.error('❌ Error revirtiendo migración de portal de clientes:', error);
      throw error;
    }
  }
};