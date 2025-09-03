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

      for (const staff of staffToNotify) {
        if (!staff.email || !staff.email.includes('@')) {
          console.error(`❌ Usuario ${staff.id} no tiene email válido: ${staff.email}`);
          continue;
        }
        try {
          console.log(`📧 Enviando correo a: ${staff.email}`);
          
          // ✅ ESTRATEGIA DE REINTENTOS PARA PRODUCCIÓN
          const maxRetries = process.env.NODE_ENV === 'production' ? 2 : 1;
          let emailSent = false;
          let lastError = null;
          
          for (let attempt = 1; attempt <= maxRetries && !emailSent; attempt++) {
            try {
              console.log(`📤 Intento ${attempt}/${maxRetries} para ${staff.email}`);
              
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
            htmlContent = `
              <div style=\"font-family: Arial, sans-serif; color: #333;\">
                <h2 style=\"color: #1a365d;\">${work.propertyAddress}</h2>
                <p>${message}</p>
              </div>
            `;
          }
          
          // ✅ USAR LA NUEVA FUNCIÓN sendEmail QUE RETORNA RESULTADO
          const emailResult = await sendEmail({
            to: staff.email,
            subject: `${work.propertyAddress}`,
            text: message,
            html: htmlContent,
            attachments: work.attachments || (work.notificationDetails && work.notificationDetails.attachments) || [],
          });
          
          // ✅ VERIFICAR EL RESULTADO Y MARCAR COMO ENVIADO
          if (emailResult.success) {
            console.log(`✅ Email enviado exitosamente a ${staff.email} en ${emailResult.duration}ms`);
            emailSent = true; // Marcar como exitoso
          } else {
            lastError = new Error(emailResult.error);
            console.error(`❌ Intento ${attempt}/${maxRetries} falló para ${staff.email}: ${emailResult.error}`);
            
            // ✅ ESPERAR ANTES DEL SIGUIENTE INTENTO
            if (attempt < maxRetries) {
              const delayMs = attempt * 2000; // 2s, 4s, etc.
              console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
          
        } catch (attemptError) {
          lastError = attemptError;
          console.error(`❌ Error en intento ${attempt}/${maxRetries} para ${staff.email}:`, attemptError.message);
          
          // ✅ ESPERAR ANTES DEL SIGUIENTE INTENTO
          if (attempt < maxRetries) {
            const delayMs = attempt * 2000;
            console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      // ✅ LOG FINAL DEL RESULTADO
      if (!emailSent) {
        console.error(`❌ Falló el envío de email a ${staff.email} después de ${maxRetries} intentos. Último error:`, lastError?.message);
      }
          
        } catch (error) {
          console.error(`❌ Error general enviando correo a ${staff.email}:`, error.message);
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