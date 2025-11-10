const express = require('express');
const router = express.Router();
const BudgetNoteController = require('../controllers/BudgetNoteController');
const { verifyToken } = require('../middleware/isAuth');

// Todas las rutas requieren autenticación
// Follow-up tiene acceso completo a las notas (crear, leer, actualizar)
router.use(verifyToken);

// 📝 Crear nueva nota de seguimiento
router.post('/', BudgetNoteController.createNote);

// 📋 Obtener todas las notas de un budget
// GET /budget-notes/budget/:budgetId?noteType=follow_up&priority=high&unresolved=true
router.get('/budget/:budgetId', BudgetNoteController.getNotesByBudget);

// 📊 Obtener estadísticas de seguimiento de un budget
router.get('/budget/:budgetId/stats', BudgetNoteController.getFollowUpStats);

// 👥 Obtener lista de staff activo (para autocompletado de menciones)
router.get('/staff/active', BudgetNoteController.getActiveStaff);

// 🔔 ===== RUTAS DE ALERTAS =====

// 🆕 Obtener lista de budgets con alertas (eficiente - solo IDs y contadores)
router.get('/alerts/budgets', BudgetNoteController.getBudgetsWithAlerts);

// Obtener contador de alertas (notas no leídas + recordatorios vencidos)
router.get('/alerts/count', BudgetNoteController.getAlertCount);

// Obtener notas no leídas para el usuario actual
router.get('/alerts/unread', BudgetNoteController.getUnreadNotes);

// Marcar nota como leída
router.patch('/:noteId/read', BudgetNoteController.markAsRead);

// Marcar múltiples notas como leídas (bulk)
router.post('/read/bulk', BudgetNoteController.markMultipleAsRead);

// ⏰ ===== RUTAS DE RECORDATORIOS =====

// Obtener recordatorios activos del usuario
router.get('/reminders/active', BudgetNoteController.getActiveReminders);

// Configurar recordatorio en una nota
router.post('/:noteId/reminder', BudgetNoteController.setReminder);

// Completar/cancelar recordatorio
router.patch('/:noteId/reminder/complete', BudgetNoteController.completeReminder);

// 🔍 Obtener una nota específica
router.get('/:noteId', BudgetNoteController.getNoteById);

// ✏️ Actualizar una nota
router.put('/:noteId', BudgetNoteController.updateNote);

// 🗑️ Eliminar una nota
router.delete('/:noteId', BudgetNoteController.deleteNote);

module.exports = router;
