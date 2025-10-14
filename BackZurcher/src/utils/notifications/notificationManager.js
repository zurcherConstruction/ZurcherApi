const { getNotificationDetails } = require('./notificationService');
const { getNotificationDetailsApp } = require('./notificationServiceApp');
const { sendEmail } = require('./emailService');
const { Notification, Staff } = require('../../data');
const { Expo } = require('expo-server-sdk');
const { filterDuplicates, registerSent } = require('./notificationDeduplicator');
let expo = new Expo();

const sendNotifications = async (status, work, budget, io, context = {}) => {
  try {
    // Obtener el ID de la entidad para deduplicación
    const entityId = work?.idWork || budget?.idBudget || work?.id || budget?.id || 'unknown';
    
    // Obtener detalles para notificaciones por correo
    const emailDetails = await getNotificationDetails(status, work || budget, context);

    if (emailDetails) {
      const { staffToNotify, message, subject } = emailDetails;
      
      // 🛡️ Filtrar duplicados basado en envíos recientes
      const filteredStaff = filterDuplicates(staffToNotify, status, entityId);
      
      if (filteredStaff.length === 0) {
        console.log(`⏭️ Todas las notificaciones de email para "${status}" (${entityId}) fueron filtradas por duplicación`);
      }

      for (const staff of filteredStaff) {
        if (!staff.email || !staff.email.includes('@')) {
          console.error(`El usuario ${staff.id} no tiene un correo electrónico válido: ${staff.email}`);
          continue;
        }
        try {
          // Detectar si es notificación de rechazo de inspección rápida
          const isQuickRejection = status === 'initial_inspection_rejected' && work.resultDocumentUrl;
          const isBudgetCreated = status === 'budgetCreated' || status === 'budgetSentToSignNow';
          let htmlContent;
          if (isQuickRejection) {
            // Mostrar la imagen/PDF como enlace y/o vista previa si es imagen
            const isImage = work.resultDocumentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            htmlContent = `
              <div style=\"font-family: Arial, sans-serif; color: #333;\">
                <h2 style=\"color: #1a365d;\">${work.propertyAddress}</h2>
                <p>${message.replace(work.resultDocumentUrl, '')}</p>
                <p><strong>Documento de rechazo:</strong></p>
                ${isImage ? `<img src=\"${work.resultDocumentUrl}\" alt=\"Documento de rechazo\" style=\"max-width:400px;max-height:400px;display:block;margin-bottom:10px;\" />` : ''}
                <a href=\"${work.resultDocumentUrl}\" target=\"_blank\" style=\"color:#1a365d;word-break:break-all;\">${work.resultDocumentUrl}</a>
              </div>
            `;
          } else if (isBudgetCreated) {
            // Mantener el formato especial SOLO para creación/envío de presupuesto
            htmlContent = `
              <div style=\"font-family: Arial, sans-serif; color: #333;\">
                <h2 style=\"color: #1a365d;\">Presupuesto listo para revisión</h2>
                <p>${message}</p>
                ${work.budgetLink || (work.notificationDetails && work.notificationDetails.budgetLink) ? `
                  <a href=\"${work.budgetLink || (work.notificationDetails && work.notificationDetails.budgetLink)}\" 
                     style=\"display:inline-block;margin:20px 0;padding:12px 24px;background:#1a365d;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;\">
                    Ver presupuestos
                  </a>
                ` : ''}
                ${work.attachments || (work.notificationDetails && work.notificationDetails.attachments) ? `<p>Adjunto encontrarás el PDF del presupuesto para revisión.</p>` : ''}
              </div>
            `;
          } else {
            // Para todas las demás notificaciones, usar la dirección como título
            // Si no hay dirección, usar un título genérico basado en el tipo de notificación
            const titleText = (work || budget)?.propertyAddress || 
                            (status === 'expenseCreated' ? 'Nuevo Gasto Registrado' :
                             status === 'incomeRegistered' ? 'Nuevo Ingreso Registrado' :
                             status === 'expenseUpdated' ? 'Gasto Actualizado' : 
                             'Notificación del Sistema');
            
            htmlContent = `
              <div style=\"font-family: Arial, sans-serif; color: #333;\">
                <h2 style=\"color: #1a365d;\">${titleText}</h2>
                <p>${message}</p>
              </div>
            `;
          }
          
          // Generar asunto del correo
          const emailSubject = subject || 
                              (work || budget)?.propertyAddress || 
                              (status === 'expenseCreated' ? 'Nuevo Gasto Registrado' :
                               status === 'incomeRegistered' ? 'Nuevo Ingreso Registrado' :
                               status === 'expenseUpdated' ? 'Gasto Actualizado' : 
                               'Notificación del Sistema');
          
          await sendEmail({
            to: staff.email,
            subject: emailSubject,
            text: message,
            html: htmlContent,
            attachments: work.attachments || (work.notificationDetails && work.notificationDetails.attachments) || [],
          });
        } catch (error) {
          console.error(`Error al enviar correo a ${staff.email}:`, error);
        }
      }
      
      // 🛡️ Registrar los correos enviados exitosamente
      registerSent(filteredStaff, status, entityId);
    }

    // --- Notificaciones Push ---
    const appDetails = await getNotificationDetailsApp(status, work, budget, context);

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
            io.to(staffMember.id).emit('newNotification', notificationRecord);
          }

          // 3. Preparar notificación push
          const staffWithToken = await Staff.findByPk(staffMember.id, { attributes: ['pushToken'] });
          const pushToken = staffWithToken?.pushToken;

          if (pushToken && Expo.isExpoPushToken(pushToken)) {
            const unreadCount = await Notification.count({
              where: { staffId: staffMember.id, isRead: false }
            });

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
        let chunks = expo.chunkPushNotifications(messagesToSend);
        let tickets = [];
        for (let chunk of chunks) {
          try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
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