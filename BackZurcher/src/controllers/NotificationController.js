const { Notification, Staff } = require('../data');
const { sendNotifications } = require('../utils/notifications/notificationManager');
const { getNotificationDetailsApp } = require('../utils/notifications/notificationServiceApp');

const createNotification = async (req, res) => {
  try {
    const { staffId, message, type, title, sendEmailFlag } = req.body;

    // Validar que staffId sea un UUID
    if (!/^[0-9a-fA-F-]{36}$/.test(staffId)) {
      return res.status(400).json({ error: true, message: 'El ID del staff no es válido.' });
    }

    // Crear la notificación en la base de datos
    const notification = await Notification.create({
      title: title || 'Nueva notificación',
      message,
      staffId,
      senderId: req.staff?.id || null,
      type,
    });

    console.log('Notificación creada:', notification);

    // Enviar notificación según el tipo
    if (type === 'email' && sendEmailFlag) {
      const staff = await Staff.findByPk(staffId);
      if (staff && staff.email) {
        await sendNotifications('customEmail', { staff, message });
        console.log(`Correo enviado a ${staff.email}`);
      }
    } else if (type === 'push') {
      const appDetails = await getNotificationDetailsApp('customPush', { staffId, message });
      console.log('Detalles de notificación push:', appDetails);
      // Aquí puedes manejar la lógica de Expo Push Notifications
    } else if (type === 'socket') {
      const io = req.app.get('io');
      if (io) {
        io.to(staffId).emit('newNotification', notification);
        console.log(`Notificación enviada por Socket.IO a ${staffId}`);
      }
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error al crear la notificación:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Obtener las notificaciones con sus respuestas
    const notifications = await Notification.findAll({
      where: { staffId },
      include: [
        {
          model: Staff,
          as: 'sender', // Alias definido en la relación
          attributes: ['id', 'name'], // Incluye el ID y el nombre del remitente
        },
        {
          model: Notification,
          as: 'responses', // Alias para las respuestas
          attributes: ['id', 'message', 'createdAt'], // Incluye los campos necesarios de las respuestas
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Si no hay notificaciones, devolver una lista vacía en lugar de un error
    if (!notifications || notifications.length === 0) {
      return res.status(200).json([]);
    }

    // Formatear las notificaciones para incluir el nombre y el ID del remitente
    const formattedNotifications = notifications.map((notification) => ({
      ...notification.toJSON(),
      senderId: notification.sender?.id || null,
      senderName: notification.sender?.name || 'Desconocido',
    }));

    res.status(200).json(formattedNotifications);
  } catch (error) {
    console.error('Error al obtener las notificaciones:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Validar que notificationId sea un UUID
    if (!/^[0-9a-fA-F-]{36}$/.test(notificationId)) {
      return res.status(400).json({ error: true, message: 'El ID de la notificación no es válido.' });
    }

    // Buscar la notificación
    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return res.status(404).json({ error: true, message: 'La notificación no existe.' });
    }

    // Verificar si ya está marcada como leída
    if (notification.isRead) {
      return res.status(200).json({ error: false, message: 'La notificación ya estaba marcada como leída.' });
    }

    // Marcar como leída
    notification.isRead = true;
    await notification.save();

    res.status(200).json({ error: false, message: 'Notificación marcada como leída.' });
  } catch (error) {
    console.error('Error al marcar la notificación como leída:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

module.exports = { createNotification, getNotifications, markAsRead };