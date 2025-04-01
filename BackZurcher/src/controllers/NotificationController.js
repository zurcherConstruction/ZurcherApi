const { Notification, Staff } = require('../data');
 // Asegúrate de importar `io` desde tu servidor
 const createNotification = async (req, res) => {
  try {
    const { staffId, message, type, parentId } = req.body;

    // Obtener el usuario que envía la notificación (remitente)
    const sender = req.staff;

    if (!sender) {
      return res.status(401).json({ error: true, message: "Usuario no autenticado" });
    }

    let recipientId = staffId; // Por defecto, el destinatario es el staffId proporcionado

    // Si es una respuesta, verifica que la notificación original exista
    if (parentId) {
      const originalNotification = await Notification.findByPk(parentId);
      if (!originalNotification) {
        return res.status(404).json({ error: true, message: "Notificación original no encontrada" });
      }

      // El destinatario de la respuesta debe ser el remitente de la notificación original
      recipientId = originalNotification.senderId;
    }

    // Crear la notificación
    const notification = await Notification.create({
      staffId: recipientId, // Destinatario
      message,
      type,
      parentId: parentId || null, // Asocia la respuesta con la notificación original
      senderId: sender.id, // Remitente
    });

    // Emitir la notificación en tiempo real
    const io = req.app.get("io");
    io.to(recipientId).emit("newNotification", notification);

    res.status(201).json({ error: false, notification });
  } catch (error) {
    console.error("Error al crear la notificación:", error);
    res.status(500).json({ error: true, message: "Error interno del servidor" });
  }
};
// Obtener notificaciones de un usuario
const getNotifications = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Obtener las notificaciones con sus respuestas
    const notifications = await Notification.findAll({
      where: { staffId },
      include: [
        {
          model: Staff,
          as: "sender", // Alias definido en la relación
          attributes: ["id", "name"], // Incluye el ID y el nombre del remitente
        },
        {
          model: Notification,
          as: "responses", // Alias para las respuestas
          attributes: ["id", "message", "createdAt"], // Incluye los campos necesarios de las respuestas
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Formatear las notificaciones para incluir el nombre y el ID del remitente
    const formattedNotifications = notifications.map((notification) => ({
      ...notification.toJSON(),
      senderId: notification.sender?.id || null,
      senderName: notification.sender?.name || "Desconocido",
    }));

    res.status(200).json({ error: false, notifications: formattedNotifications });
  } catch (error) {
    console.error("Error al obtener las notificaciones:", error);
    res.status(500).json({ error: true, message: "Error interno del servidor" });
  }
};
  // Marcar una notificación como leída
  const markAsRead = async (req, res) => {
    try {
      const { notificationId } = req.params;
  
      // Buscar la notificación
      const notification = await Notification.findByPk(notificationId);
      if (!notification) {
        return res.status(404).json({ error: true, message: 'Notificación no encontrada' });
      }
  
      // Marcar como leída
      notification.isRead = true;
      await notification.save();
  
      res.status(200).json({ error: false, message: 'Notificación marcada como leída' });
    } catch (error) {
      console.error('Error al marcar la notificación como leída:', error);
      res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  };

module.exports = { createNotification, getNotifications, markAsRead };