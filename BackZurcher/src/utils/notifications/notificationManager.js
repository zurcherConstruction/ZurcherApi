const { getNotificationDetails } = require('./notificationService');
const { getNotificationDetailsApp } = require('./notificationServiceApp');
const { sendEmail } = require('./emailService');
const { Notification, Staff } = require('../../data');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

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
          continue;
        }
        try {
          console.log(`Enviando correo a: ${staff.email}`);
          await sendEmail({
            to: staff.email,
            subject: 'Nuevo presupuesto listo para revisión',
            text: `${message}\n\nRevisa todos los presupuestos aquí: ${work.budgetLink || (work.notificationDetails && work.notificationDetails.budgetLink)}`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #1a365d;">Presupuesto listo para revisión</h2>
                <p>${message}</p>
                <a href="${work.budgetLink || (work.notificationDetails && work.notificationDetails.budgetLink)}" 
                   style="display:inline-block;margin:20px 0;padding:12px 24px;background:#1a365d;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
                  Ver presupuestos
                </a>
                <p>Adjunto encontrarás el PDF del presupuesto para revisión.</p>
              </div>
            `,
            attachments: work.attachments || (work.notificationDetails && work.notificationDetails.attachments) || [],
          });
        } catch (error) {
          console.error(`Error al enviar correo a ${staff.email}:`, error);
        }
      }
    }

    // --- Notificaciones Push ---
    const appDetails = await getNotificationDetailsApp(status, work, budget);
    console.log('Detalles de notificaciones push:', appDetails);

    if (appDetails && appDetails.staffToNotify.length > 0) {
      const { staffToNotify, message: pushMessageBase } = appDetails;

      let messagesToSend = [];

      for (const staffMember of staffToNotify) {
        try {
          // 1. Crear notificación en BD
          const notificationRecord = await Notification.create({
            title: `Estado: ${status}`,
            message: pushMessageBase,
            staffId: staffMember.id,
            type: 'push',
            isRead: false,
          });

          // 2. Emitir por Socket.IO
          if (io) {
            console.log(`Emitiendo notificación Socket.IO a: ${staffMember.id}`);
            io.to(staffMember.id).emit('newNotification', notificationRecord);
          }

          // 3. Preparar notificación push
          const staffWithToken = await Staff.findByPk(staffMember.id, { attributes: ['pushToken'] });
          const pushToken = staffWithToken?.pushToken;

          if (pushToken && Expo.isExpoPushToken(pushToken)) {
            const unreadCount = await Notification.count({
              where: { staffId: staffMember.id, isRead: false }
            });

            console.log(`Preparando push para ${staffMember.id} (Token: ${pushToken}), Badge: ${unreadCount}`);

            messagesToSend.push({
              to: pushToken,
              sound: 'default',
              title: notificationRecord.title,
              body: notificationRecord.message,
              data: {
                notificationId: notificationRecord.id,
                staffId: staffMember.id,
                type: 'workUpdate'
              },
              badge: unreadCount + 1,
              priority: 'high',
              channelId: 'default',
              ios: {
                sound: 'default',
                badge: unreadCount + 1,
                _displayInForeground: true,
              },
              android: {
                sound: 'default',
                priority: 'high',
                channelId: 'default',
              }
            });
          } else {
            console.warn(`Usuario ${staffMember.id} no tiene un push token válido.`);
          }

        } catch (error) {
          console.error(`Error procesando notificación push para ${staffMember.id}:`, error);
        }
      }

      // 4. Enviar los mensajes push en lotes
      if (messagesToSend.length > 0) {
        console.log(`Enviando ${messagesToSend.length} notificaciones push...`);
        let chunks = expo.chunkPushNotifications(messagesToSend);
        let tickets = [];
        for (let chunk of chunks) {
          try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Tickets recibidos:', ticketChunk);
            tickets.push(...ticketChunk);
          } catch (error) {
            console.error('Error enviando chunk de notificaciones push:', error);
          }
        }
        // (Opcional: lógica para manejar receipts de los tickets)
      }
    }

  } catch (error) {
    console.error('Error general en sendNotifications:', error);
  }
};

module.exports = { sendNotifications };