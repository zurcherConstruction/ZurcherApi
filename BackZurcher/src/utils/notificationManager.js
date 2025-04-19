const {getNotificationDetails} = require('./nodeMailer/notificationService');
const { getNotificationDetailsApp } = require('./notificationServiceApp');
const { sendEmail } = require('./nodeMailer/emailService');
const { NotificationApp } = require('../data');

const sendNotifications = async (status, work, io) => {
    // Obtener detalles para notificaciones por correo
    const emailDetails = await getNotificationDetails(status, work);

    if (emailDetails) {
        const { staffToNotify, message } = emailDetails;

        // Enviar correos electrónicos
        for (const staff of staffToNotify) {
            console.log(`Enviando correo a: ${staff.email}`);
            await sendEmail(staff, message);
        }
    }

    // Obtener detalles para notificaciones push
    const appDetails = await getNotificationDetailsApp(status, work);

    if (appDetails) {
        const { staffToNotifyApp, message } = appDetails;

        // Crear notificaciones en la base de datos y emitirlas en tiempo real
        for (const staff of staffToNotifyApp) {
            const notification = await NotificationApp.create({
                title: `Estado del trabajo: ${status}`,
                message,
                staffId: staff.id,
            });

            // Emitir evento a través de Socket.IO
            if (io) {
                io.to(staff.id).emit('newNotification', notification);
            }
        }
    }
};

module.exports = { sendNotifications };