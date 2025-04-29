const { getNotificationDetails } = require('./notificationService');
const { getNotificationDetailsApp } = require('./notificationServiceApp');
const { sendEmail } = require('./emailService');
const { Notification } = require('../../data'); // Usar el modelo unificado de Notification

const sendNotifications = async (status, work, budget, io) => {
  try {
    // Obtener detalles para notificaciones por correo
    const emailDetails = await getNotificationDetails(status, work || budget);
    console.log('Detalles de correo:', emailDetails);

    if (emailDetails) {
      const { staffToNotify, message } = emailDetails;

      // Enviar correos electrónicos
      for (const staff of staffToNotify) {
        if (!staff.email || !staff.email.includes('@')) {
          console.error(`El usuario ${staff.id} no tiene un correo electrónico válido: ${staff.email}`);
          continue; // Saltar al siguiente usuario
        }
        try {
          console.log(`Enviando correo a: ${staff.email}`);
          await sendEmail({
            to: staff.email,
            subject: 'Notificación de Presupuesto',
            text: message,
          });
        } catch (error) {
          console.error(`Error al enviar correo a ${staff.email}:`, error);
        }
      }
    }

    // Obtener detalles para notificaciones push
    const appDetails = await getNotificationDetailsApp(status, work, budget);
    console.log('Detalles de notificaciones push:', appDetails);

    if (appDetails) {
      const { staffToNotify, message } = appDetails;

      // Crear notificaciones en la base de datos y emitirlas en tiempo real
      for (const staff of staffToNotify) {
        try {
          const notification = await Notification.create({
            title: `Estado del presupuesto: ${status}`,
            message,
            staffId: staff.id,
            type: 'push', // Tipo de notificación
          });

          // Emitir evento a través de Socket.IO
          if (io) {
            console.log(`Emitiendo notificación a: ${staff.id}`);
            io.to(staff.id).emit('newNotification', notification);
          }
        } catch (error) {
          console.error(`Error al crear o emitir notificación para ${staff.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error en sendNotifications:', error);
  }
};
  
module.exports = { sendNotifications };