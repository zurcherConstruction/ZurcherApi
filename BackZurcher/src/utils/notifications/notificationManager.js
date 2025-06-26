const { getNotificationDetails } = require('./notificationService');
const { getNotificationDetailsApp } = require('./notificationServiceApp');
const { sendEmail } = require('./emailService');
const { Notification, Staff } = require('../../data'); // Usar el modelo unificado de Notification
const { Expo } = require('expo-server-sdk'); // *** IMPORTAR EXPO SDK ***
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

   // --- Notificaciones Push ---
   const appDetails = await getNotificationDetailsApp(status, work, budget); // O usar servicio unificado
   console.log('Detalles de notificaciones push:', appDetails);

   if (appDetails && appDetails.staffToNotify.length > 0) {
     const { staffToNotify, message: pushMessageBase } = appDetails; // Mensaje base para push

     let messagesToSend = []; // Array para los mensajes push

     for (const staffMember of staffToNotify) {
       try {
         // 1. Crear notificación en BD (como antes)
         const notificationRecord = await Notification.create({
           title: `Estado: ${status}`, // Título más genérico o adaptado
           message: pushMessageBase, // Usar el mensaje específico para push
           staffId: staffMember.id,
           type: 'push',
           isRead: false,
         });

         // 2. Emitir por Socket.IO (como antes)
         if (io) {
           console.log(`Emitiendo notificación Socket.IO a: ${staffMember.id}`);
           io.to(staffMember.id).emit('newNotification', notificationRecord);
         }

         // 3. *** PREPARAR NOTIFICACIÓN PUSH ***
         // Obtener pushToken del staff (¡Necesitas este campo en tu modelo Staff!)
         const staffWithToken = await Staff.findByPk(staffMember.id, { attributes: ['pushToken'] });
         const pushToken = staffWithToken?.pushToken;

         if (pushToken && Expo.isExpoPushToken(pushToken)) {
           // Calcular el badge count ACTUAL para este usuario
           const unreadCount = await Notification.count({
             where: { staffId: staffMember.id, isRead: false }
           });

           console.log(`Preparando push para ${staffMember.id} (Token: ${pushToken}), Badge: ${unreadCount}`);

           // Añadir al array de mensajes a enviar
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
        badge: unreadCount + 1, // +1 porque esta notificación aún no se ha contado
        priority: 'high', // Asegurar alta prioridad
        channelId: 'default', // Para Android
         ios: {
            sound: 'default',
            badge: unreadCount + 1,
            _displayInForeground: true,
        },
        // Para Android específicamente  
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
     } // Fin del bucle for staffMember

     // 4. *** ENVIAR LOS MENSAJES PUSH EN LOTES ***
     if (messagesToSend.length > 0) {
       console.log(`Enviando ${messagesToSend.length} notificaciones push...`);
       let chunks = expo.chunkPushNotifications(messagesToSend);
       let tickets = [];
       for (let chunk of chunks) {
         try {
           let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
           console.log('Tickets recibidos:', ticketChunk);
           tickets.push(...ticketChunk);
           // NOTA: Aquí deberías manejar los tickets para verificar errores de envío, tokens inválidos, etc.
         } catch (error) {
           console.error('Error enviando chunk de notificaciones push:', error);
         }
       }
       // (Opcional: Lógica para manejar receipts de los tickets)
     }

   } // Fin if (appDetails)

 } catch (error) {
   console.error('Error general en sendNotifications:', error);
 }
};
  
module.exports = { sendNotifications };