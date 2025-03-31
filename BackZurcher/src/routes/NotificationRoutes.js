const express = require('express');
const { createNotification, getNotifications, markAsRead } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const router = express.Router();

router.post('/', createNotification); // Crear una notificación
router.get('/:staffId', verifyToken, getNotifications);  // Obtener notificaciones de un usuario
router.put('/:notificationId/read', markAsRead); // Marcar una notificación como leída

module.exports = router;