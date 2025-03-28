const { Notification, Staff } = require('../data');
 // Asegúrate de importar `io` desde tu servidor

 const createNotification = async (req, res) => {
  try {
    const { staffId, message, type } = req.body;

    // Verificar que el usuario exista
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      return res.status(404).json({ error: true, message: "Usuario no encontrado" });
    }

    // Crear la notificación
    const notification = await Notification.create({
      staffId,
      message,
      type,
    });

    // Agregar el nombre del remitente y su ID a la notificación
    const notificationWithSender = {
      ...notification.toJSON(),
      senderId: staff.id, // Incluye el ID del remitente
      senderName: staff.name, // Incluye el nombre del remitente
    };

    // Emitir la notificación en tiempo real
    const io = req.app.get("io");
    io.to(staffId).emit("newNotification", notificationWithSender);

    res.status(201).json({ error: false, notification: notificationWithSender });
  } catch (error) {
    console.error("Error al crear la notificación:", error);
    res.status(500).json({ error: true, message: "Error interno del servidor" });
  }
};
// Obtener notificaciones de un usuario
const getNotifications = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Obtener las notificaciones con el nombre del remitente
    const notifications = await Notification.findAll({
      where: { staffId },
      include: [
        {
          model: Staff,
          as: "sender", // Alias definido en la relación
          attributes: ["id", "name"], // Incluye el ID y el nombre del remitente
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