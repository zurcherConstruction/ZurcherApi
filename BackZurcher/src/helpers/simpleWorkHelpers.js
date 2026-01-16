const { generateAndSaveSimpleWorkPDF } = require('../utils/pdfGenerators/simpleWorkPdfGenerator.js');
const { sendEmail } = require('../utils/notifications/emailService.js');
const { sendNotifications } = require('../utils/notifications/notificationManager.js');

/**
 * Helper para manejar lógica de envío de SimpleWork por email
 * Similar al budgetHelpers.js pero adaptado para SimpleWork
 */
async function handleSimpleWorkSendLogic(simpleWorkInstance, transaction, reqIO, isUpdate = false) {
  console.log(`🚀 Iniciando handleSimpleWorkSendLogic para SimpleWork ID: ${simpleWorkInstance.id}, isUpdate: ${isUpdate}`);
  let pdfPathForEmail = null;

  try {
    console.log("📄 Intentando generar PDF en backend...");
    
    // Preparar datos para PDF
    const simpleWorkDataForPdf = {
      ...simpleWorkInstance.toJSON(),
      items: simpleWorkInstance.items || [] // Incluir items si existen
    };

    const generatedPath = await generateAndSaveSimpleWorkPDF(simpleWorkDataForPdf);
    
    // Actualizar la instancia con la ruta del PDF
    simpleWorkInstance.pdfPath = generatedPath;
    await simpleWorkInstance.save({ transaction });
    
    pdfPathForEmail = generatedPath;
    console.log(`✅ PDF generado y ruta actualizada en BD para SimpleWork ID ${simpleWorkInstance.id}: ${pdfPathForEmail}`);

  } catch (pdfError) {
    console.error(`❌ Error CRÍTICO al generar/guardar PDF para SimpleWork ID ${simpleWorkInstance.id}:`, pdfError);
    throw new Error(`Error al generar PDF: ${pdfError.message}`);
  }

  if (!pdfPathForEmail) {
    throw new Error('❌ Error interno: No se pudo obtener la ruta del PDF generado.');
  }

  console.log(`📧 Usando PDF en ${pdfPathForEmail} para enviar correo...`);
  
  // Extraer datos del cliente
  const clientData = simpleWorkInstance.clientData || {};
  const clientEmail = clientData.email;
  const clientName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Cliente';
  const propertyAddress = simpleWorkInstance.propertyAddress;
  const workNumber = simpleWorkInstance.workNumber;

  if (!clientEmail || !clientEmail.includes('@')) {
    console.warn(`⚠️ Advertencia: El cliente para SimpleWork ID ${simpleWorkInstance.id} no tiene un correo válido. No se enviará email.`);
  } else {
    const emailSubject = isUpdate
      ? `Cotización Actualizada #${workNumber} - ${propertyAddress}`
      : `Nueva Cotización #${workNumber} - ${propertyAddress}`;
      
    const emailText = isUpdate
      ? `Estimado/a ${clientName},

Adjunto encontrará su cotización actualizada para el trabajo en:
${propertyAddress}

Número de Cotización: #${workNumber}
Tipo de Trabajo: ${simpleWorkInstance.getWorkTypeDisplay ? simpleWorkInstance.getWorkTypeDisplay() : simpleWorkInstance.workType}

Por favor revise cuidadosamente los detalles y no dude en contactarnos si tiene alguna pregunta.

Para aprobar la cotización, simplemente responda a este correo confirmando su aprobación.

Saludos cordiales,
ZURCHER CONSTRUCTION`
      : `Estimado/a ${clientName},

Adjunto encontrará la cotización solicitada para el trabajo en:
${propertyAddress}

Número de Cotización: #${workNumber}
Tipo de Trabajo: ${simpleWorkInstance.getWorkTypeDisplay ? simpleWorkInstance.getWorkTypeDisplay() : simpleWorkInstance.workType}

Por favor revise cuidadosamente los detalles y no dude en contactarnos si tiene alguna pregunta.

Para aprobar la cotización, simplemente responda a este correo confirmando su aprobación.

Saludos cordiales,
ZURCHER CONSTRUCTION`;

    const clientMailOptions = {
      to: clientEmail,
      subject: emailSubject,
      text: emailText,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">ZURCHER CONSTRUCTION</h1>
              <div style="height: 2px; background-color: #e74c3c; margin: 0 auto; width: 100px;"></div>
            </div>
            
            <h2 style="color: #34495e; margin-bottom: 20px;">
              ${isUpdate ? '📋 Cotización Actualizada' : '🆕 Nueva Cotización'}
            </h2>
            
            <p style="margin-bottom: 15px; color: #555;">Estimado/a <strong>${clientName}</strong>,</p>
            
            <p style="margin-bottom: 20px; color: #555;">
              Adjunto encontrará ${isUpdate ? 'su cotización actualizada' : 'la cotización solicitada'} para el trabajo en:
            </p>
            
            <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #2c3e50;"><strong>🏠 Dirección:</strong> ${propertyAddress}</p>
              <p style="margin: 5px 0; color: #2c3e50;"><strong>📋 Cotización #:</strong> ${workNumber}</p>
              <p style="margin: 5px 0; color: #2c3e50;"><strong>🔧 Tipo de Trabajo:</strong> ${simpleWorkInstance.getWorkTypeDisplay ? simpleWorkInstance.getWorkTypeDisplay() : simpleWorkInstance.workType}</p>
            </div>
            
            <p style="margin-bottom: 20px; color: #555;">
              Por favor revise cuidadosamente los detalles y no dude en contactarnos si tiene alguna pregunta.
            </p>
            
            <div style="background-color: #d5e8d4; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60; margin-bottom: 20px;">
              <p style="margin: 0; color: #27ae60; font-weight: bold;">
                ✅ Para aprobar la cotización, simplemente responda a este correo confirmando su aprobación.
              </p>
            </div>
            
            <p style="margin-bottom: 30px; color: #555;">
              Saludos cordiales,<br>
              <strong>ZURCHER CONSTRUCTION</strong>
            </p>
            
            <div style="text-align: center; border-top: 1px solid #ecf0f1; padding-top: 20px;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                Este correo fue enviado automáticamente. Por favor no responder a este mensaje para consultas generales.
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [{ 
        filename: `cotizacion_${workNumber}.pdf`, 
        path: pdfPathForEmail, 
        contentType: 'application/pdf' 
      }],
    };

    try {
      console.log(`📧 Intentando enviar correo (${isUpdate ? 'actualizado' : 'nuevo'}) al cliente: ${clientEmail}`);
      await sendEmail(clientMailOptions);
      console.log(`✅ Correo (${isUpdate ? 'actualizado' : 'nuevo'}) enviado exitosamente al cliente.`);
    } catch (clientEmailError) {
      console.error(`❌ Error al enviar correo (${isUpdate ? 'actualizado' : 'nuevo'}) al cliente ${clientEmail}:`, clientEmailError);
    }
  }

  // Enviar notificaciones internas
  await sendNotifications('simpleWorkSent', {
    propertyAddress: propertyAddress,
    clientEmail: clientEmail,
    workNumber: workNumber,
  }, null, reqIO);
  console.log(`📱 Notificaciones internas 'simpleWorkSent' enviadas.`);

  console.log(`🎉 handleSimpleWorkSendLogic completado exitosamente para SimpleWork ID: ${simpleWorkInstance.id}`);
}

module.exports = {
  handleSimpleWorkSendLogic
};