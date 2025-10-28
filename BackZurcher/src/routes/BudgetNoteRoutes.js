const express = require('express');
const router = express.Router();
const BudgetNoteController = require('../controllers/BudgetNoteController');
const { verifyToken } = require('../middleware/isAuth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// 📝 Crear nueva nota de seguimiento
router.post('/', BudgetNoteController.createNote);

// 📋 Obtener todas las notas de un budget
// GET /budget-notes/budget/:budgetId?noteType=follow_up&priority=high&unresolved=true
router.get('/budget/:budgetId', BudgetNoteController.getNotesByBudget);

// 📊 Obtener estadísticas de seguimiento de un budget
router.get('/budget/:budgetId/stats', BudgetNoteController.getFollowUpStats);

// � Obtener lista de staff activo (para autocompletado de menciones)
router.get('/staff/active', BudgetNoteController.getActiveStaff);

// �🔍 Obtener una nota específica
router.get('/:noteId', BudgetNoteController.getNoteById);

// ✏️ Actualizar una nota
router.put('/:noteId', BudgetNoteController.updateNote);

// 🗑️ Eliminar una nota
router.delete('/:noteId', BudgetNoteController.deleteNote);

module.exports = router;
