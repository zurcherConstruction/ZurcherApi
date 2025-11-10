/**
 * Migración: Agregar sistema de alertas y recordatorios a BudgetNotes
 * Fecha: 2025-11-09
 * 
 * Campos agregados:
 * - isRead: Boolean - Indica si la nota ha sido leída
 * - readBy: ARRAY(UUID) - IDs de staff que han leído la nota
 * - reminderDate: DATE - Fecha/hora del recordatorio
 * - reminderFor: ARRAY(UUID) - IDs de staff para quienes es el recordatorio
 * - isReminderActive: BOOLEAN - Si el recordatorio está activo (no completado)
 * - reminderCompletedAt: DATE - Cuándo se marcó como completado el recordatorio
 * 
 * Casos de uso:
 * 1. Ver alertas de notas no leídas (badge rojo con número)
 * 2. Crear recordatorios: "Llamar cliente en 7 días"
 * 3. Ver alertas de recordatorios vencidos
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Iniciando migración: add-note-alerts-and-reminders');

    // 1. Agregar campo isRead
    await queryInterface.addColumn('BudgetNotes', 'isRead', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si la nota ha sido vista/leída por alguien'
    });
    console.log('✅ Campo isRead agregado');

    // 2. Agregar campo readBy (array de UUIDs de quiénes la leyeron)
    await queryInterface.addColumn('BudgetNotes', 'readBy', {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: true,
      defaultValue: [],
      comment: 'IDs de staff que han leído esta nota'
    });
    console.log('✅ Campo readBy agregado');

    // 3. Agregar campo reminderDate
    await queryInterface.addColumn('BudgetNotes', 'reminderDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha/hora para recordatorio futuro (ej: llamar cliente)'
    });
    console.log('✅ Campo reminderDate agregado');

    // 4. Agregar campo reminderFor (para quiénes es el recordatorio)
    await queryInterface.addColumn('BudgetNotes', 'reminderFor', {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: true,
      defaultValue: [],
      comment: 'IDs de staff que deben recibir el recordatorio'
    });
    console.log('✅ Campo reminderFor agregado');

    // 5. Agregar campo isReminderActive
    await queryInterface.addColumn('BudgetNotes', 'isReminderActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si el recordatorio está activo (no completado/cancelado)'
    });
    console.log('✅ Campo isReminderActive agregado');

    // 6. Agregar campo reminderCompletedAt
    await queryInterface.addColumn('BudgetNotes', 'reminderCompletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Cuándo se completó/canceló el recordatorio'
    });
    console.log('✅ Campo reminderCompletedAt agregado');

    // 7. Crear índices para optimizar búsquedas
    await queryInterface.addIndex('BudgetNotes', ['isRead'], {
      name: 'idx_budget_notes_is_read'
    });
    console.log('✅ Índice para isRead creado');

    await queryInterface.addIndex('BudgetNotes', ['reminderDate', 'isReminderActive'], {
      name: 'idx_budget_notes_reminder_date_active'
    });
    console.log('✅ Índice para reminderDate + isReminderActive creado');

    console.log('✅ Migración completada: add-note-alerts-and-reminders');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración: add-note-alerts-and-reminders');

    // Eliminar índices
    await queryInterface.removeIndex('BudgetNotes', 'idx_budget_notes_reminder_date_active');
    await queryInterface.removeIndex('BudgetNotes', 'idx_budget_notes_is_read');
    console.log('✅ Índices eliminados');

    // Eliminar columnas en orden inverso
    await queryInterface.removeColumn('BudgetNotes', 'reminderCompletedAt');
    await queryInterface.removeColumn('BudgetNotes', 'isReminderActive');
    await queryInterface.removeColumn('BudgetNotes', 'reminderFor');
    await queryInterface.removeColumn('BudgetNotes', 'reminderDate');
    await queryInterface.removeColumn('BudgetNotes', 'readBy');
    await queryInterface.removeColumn('BudgetNotes', 'isRead');
    console.log('✅ Campos eliminados');

    console.log('✅ Migración revertida: add-note-alerts-and-reminders');
  }
};
