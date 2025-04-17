const express = require('express');
const { createNotification, getNotifications, markAsRead } = require('../controllers/NotificationController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const router = express.Router();
const { sendEmail } = require('../utils/nodeMailer/emailService'); // Asegúrate de que la ruta sea correcta

router.post('/', createNotification); // Crear una notificación
router.get('/:staffId', verifyToken, getNotifications);  // Obtener notificaciones de un usuario
router.put('/:notificationId/read', markAsRead); // Marcar una notificación como leída

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