const { getNotificationDetails } = require('./nodeMailer/notificationService');
const { getNotificationDetailsApp } = require('./notificationServiceApp');
const { sendEmail } = require('./nodeMailer/emailService');
const { Notification } = require('../data'); // Usar el modelo unificado de Notification

const sendNotifications = async (status, work, io) => {
    try {
        // Obtener detalles para notificaciones por correo
        const emailDetails = await getNotificationDetails(status, work);
        console.log('Detalles de correo:', emailDetails);

        if (emailDetails) {
            const { staffToNotify, message } = emailDetails;

            // Enviar correos electrónicos
            for (const staff of staffToNotify) {
                try {
                    console.log(`Enviando correo a: ${staff.email}`);
                    await sendEmail(staff, message);
                } catch (error) {
                    console.error(`Error al enviar correo a ${staff.email}:`, error);
                }
            }
        }

        // Obtener detalles para notificaciones push
        const appDetails = await getNotificationDetailsApp(status, work);
        console.log('Detalles de notificaciones push:', appDetails);

        if (appDetails) {
            const { staffToNotifyApp, message } = appDetails;

            // Crear notificaciones en la base de datos y emitirlas en tiempo real
            for (const staff of staffToNotifyApp) {
                try {
                    const notification = await Notification.create({
                        title: `Estado del trabajo: ${status}`,
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