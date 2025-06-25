const express = require('express');
const { createNotification, getNotifications, markAsRead, markAllAsRead } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/isAuth');
//const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const router = express.Router();
//const { sendEmail } = require('../utils/notifications/emailService'); // Asegúrate de que la ruta sea correcta

// Crear una notificación (correo y/o push)
router.post('/', verifyToken, createNotification);

// Obtener notificaciones de un usuario
router.get('/:staffId', verifyToken, getNotifications);

// Marcar una notificación como leída
router.put('/:notificationId/read', verifyToken, markAsRead);

// Marcar todas las notificaciones como leídas para un usuario
router.put('/mark-all-read/:staffId', verifyToken, markAllAsRead);

module.exports = router;