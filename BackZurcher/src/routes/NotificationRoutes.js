const express = require('express');
const { createNotification, getNotifications, markAsRead, createNotificationApp, getNotificationsApp, markAsReadApp } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/isAuth');
//const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const router = express.Router();
//const { sendEmail } = require('../utils/nodeMailer/emailService'); // Asegúrate de que la ruta sea correcta

// Crear una notificación (correo y/o push)
router.post('/', verifyToken, createNotification);

// Obtener notificaciones de un usuario
router.get('/:staffId', verifyToken, getNotifications);

// Marcar una notificación como leída
router.put('/:notificationId/read', verifyToken, markAsRead);

// router.post('/email', async (req, res) => {
//     const { email, subject, message } = req.body;
  
//     try {
//       await sendEmail({ email }, message);
//       res.status(200).send({ success: true, message: 'Correo enviado correctamente.' });
//     } catch (error) {
//       console.error('Error al enviar el correo:', error);
//       res.status(500).send({ success: false, message: 'Error al enviar el correo.' });
//     }
//   });

module.exports = router;