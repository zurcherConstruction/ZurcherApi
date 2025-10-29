const express = require('express');
const router = express.Router();
const WorkNoteController = require('../controllers/WorkNoteController');
const { verifyToken } = require('../middleware/isAuth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// 📝 Crear nueva nota de seguimiento
router.post('/', WorkNoteController.createNote);

// 📋 Obtener todas las notas de una obra
// GET /work-notes/work/:workId?noteType=follow_up&priority=high&unresolved=true
router.get('/work/:workId', WorkNoteController.getNotesByWork);

// 📊 Obtener estadísticas de seguimiento de una obra
router.get('/work/:workId/stats', WorkNoteController.getFollowUpStats);

// 👥 Obtener lista de staff activo (para autocompletado de menciones)
router.get('/staff/active', WorkNoteController.getActiveStaff);

// 🔍 Obtener una nota específica
router.get('/:noteId', WorkNoteController.getNoteById);

// ✏️ Actualizar una nota
router.put('/:noteId', WorkNoteController.updateNote);

// 🗑️ Eliminar una nota
router.delete('/:noteId', WorkNoteController.deleteNote);

module.exports = router;
