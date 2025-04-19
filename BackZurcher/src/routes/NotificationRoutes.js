const express = require('express');
const { createNotification, getNotifications, markAsRead, createNotificationApp, getNotificationsApp, markAsReadApp } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const router = express.Router();
const { sendEmail } = require('../utils/nodeMailer/emailService'); // Asegúrate de que la ruta sea correcta

router.post('/io', createNotification); // Crear una notificación
router.get('/io/:staffId', verifyToken, getNotifications);  // Obtener notificaciones de un usuario
router.put('/io/:notificationId/read', markAsRead); 
router.post('/app', createNotificationApp); // Crear una notificación
router.get('/app/:staffId', getNotificationsApp); // Obtener notificaciones de un usuario
router.put('/app/:notificationId/read', markAsReadApp);// Marcar una notificación como leída

router.post('/email', async (req, res) => {
    const { email, subject, message } = req.body;
  
    try {
      await sendEmail({ email }, message);
      res.status(200).send({ success: true, message: 'Correo enviado correctamente.' });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      res.status(500).send({ success: false, message: 'Error al enviar el correo.' });
    }
  });

module.exports = router;