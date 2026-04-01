const express = require('express');
const router = express.Router();
const LeadNoteController = require('../controllers/LeadNoteController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// Roles autorizados: admin, owner, recept, sales_rep, follow-up
const authorizedRoles = ['admin', 'owner', 'recept', 'sales_rep', 'follow-up'];

// 📝 Crear nueva nota para un lead
router.post('/', verifyToken, allowRoles(authorizedRoles), LeadNoteController.createNote);

// 📋 Obtener todas las notas de un lead
// GET /lead-notes/lead/:leadId?noteType=follow_up&priority=high&unresolved=true
router.get('/lead/:leadId', verifyToken, allowRoles(authorizedRoles), LeadNoteController.getNotesByLead);

// 🔔 ===== RUTAS DE ALERTAS =====

// Obtener leads con alertas (notas no leídas o recordatorios próximos)
router.get('/alerts/leads', verifyToken, allowRoles(authorizedRoles), LeadNoteController.getLeadsWithAlerts);

// 🔔 Obtener leads con recordatorios próximos (con detalles completos, próximos 7 días)
router.get('/alerts/upcoming', verifyToken, allowRoles(authorizedRoles), LeadNoteController.getLeadsWithUpcomingAlerts);

// Marcar nota como leída
router.patch('/:id/read', verifyToken, allowRoles(authorizedRoles), LeadNoteController.markAsRead);

// ⏰ ===== RUTAS DE RECORDATORIOS =====

// Configurar/actualizar recordatorio en una nota
router.patch('/:id/reminder', verifyToken, allowRoles(authorizedRoles), LeadNoteController.setReminder);

// Obtener recordatorios próximos del usuario
router.get('/reminders/upcoming', verifyToken, allowRoles(authorizedRoles), LeadNoteController.getUpcomingReminders);

// Completar recordatorio
router.patch('/:id/reminder/complete', verifyToken, allowRoles(authorizedRoles), LeadNoteController.completeReminder);

// ✏️ Actualizar una nota
router.put('/:id', verifyToken, allowRoles(authorizedRoles), LeadNoteController.updateNote);

// 🗑️ Eliminar una nota
router.delete('/:id', verifyToken, allowRoles(authorizedRoles), LeadNoteController.deleteNote);

module.exports = router;
