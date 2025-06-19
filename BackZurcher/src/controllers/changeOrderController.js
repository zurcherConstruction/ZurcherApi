const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet, Receipt, ChangeOrder } = require('../data');
const { sendEmail } = require('../utils/notifications/emailService');
const path = require('path');
const { generateAndSaveChangeOrderPDF } = require('../utils/pdfGenerators');
const fs = require('fs'); 
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const recordOrUpdateChangeOrderDetails = async (req, res) => {
  try {
    const { idWork: workIdFromParams } = req.params; 
    const { changeOrderId: changeOrderIdFromParams } = req.params; 
    
    const {
      changeOrderId: changeOrderIdFromBody, 
      description,
      itemDescription,
      isStoneExtractionCO,
      hours,
      unitCost,
      totalCost,
      clientMessage,
      adminNotes,
    } = req.body;

    let work;
    let changeOrder;
    let isNew = false;
    const effectiveChangeOrderId = changeOrderIdFromParams || changeOrderIdFromBody;

    if (effectiveChangeOrderId) {
      changeOrder = await ChangeOrder.findByPk(effectiveChangeOrderId, {
        include: [{ model: Work, as: 'work' }] 
      });

      if (!changeOrder) {
        return res.status(404).json({ error: true, message: 'Change Order no encontrado.' });
      }
      work = changeOrder.work; 
      if (!work) {
        return res.status(404).json({ error: true, message: 'Trabajo asociado al Change Order no encontrado.' });
      }

      // Validar si se puede modificar
      if (changeOrder.status !== 'draft' && changeOrder.status !== 'pendingAdminReview' && changeOrder.status !== 'rejected') {
        return res.status(400).json({
          error: true,
          message: `El Change Order no puede modificarse en su estado actual: ${changeOrder.status}`,
        });
      }

      // Si la CO estaba rechazada y se está editando, resetear para un nuevo ciclo
      if (changeOrder.status === 'rejected') {
        changeOrder.status = 'pendingAdminReview'; // O 'draft', según prefieras el flujo
        changeOrder.approvalToken = null;
        changeOrder.rejectionToken = null;
        changeOrder.respondedAt = null;
        changeOrder.pdfUrl = null; // Importante: Limpiar la URL del PDF anterior
        changeOrder.requestedAt = null; // Limpiar fecha de envío anterior
        console.log(`Change Order ${changeOrder.id} estaba 'rejected', ahora es '${changeOrder.status}' y se han limpiado los campos de respuesta/PDF/envío.`);
      }
    } else if (workIdFromParams) {
      // Creando un nuevo CO para un trabajo existente
      work = await Work.findByPk(workIdFromParams);
      if (!work) {
        return res.status(404).json({ error: true, message: 'Trabajo no encontrado.' });
      }
      changeOrder = await ChangeOrder.create({
        workId: workIdFromParams,
        description: description || "Change Order", // Valor por defecto si no se provee
        status: 'draft', // Estado inicial
        // ... otros campos que quieras inicializar ...
      });
      isNew = true;
    } else {
      return res.status(400).json({ error: true, message: 'Se requiere ID de Trabajo o ID de Change Order.' });
    }

    // Actualizar los campos del Change Order
   // Actualizar los campos del Change Order
    changeOrder.description = description !== undefined ? description : changeOrder.description;
    changeOrder.itemDescription = itemDescription !== undefined ? itemDescription : changeOrder.itemDescription;
    changeOrder.hours = hours !== undefined ? parseFloat(hours) : changeOrder.hours;
    changeOrder.unitCost = unitCost !== undefined ? parseFloat(unitCost) : changeOrder.unitCost;
    
    if (hours !== undefined && unitCost !== undefined && totalCost === undefined) {
        changeOrder.totalCost = parseFloat(hours) * parseFloat(unitCost);
    } else if (totalCost !== undefined) {
        changeOrder.totalCost = parseFloat(totalCost);
    }

    changeOrder.clientMessage = clientMessage !== undefined ? clientMessage : changeOrder.clientMessage;
    changeOrder.adminNotes = adminNotes !== undefined ? adminNotes : changeOrder.adminNotes;
    
    // Lógica para cambiar el estado a 'pendingAdminReview' si es nuevo o estaba en 'draft'
    // No se aplica si ya se cambió de 'rejected' a 'pendingAdminReview' arriba.
    if (changeOrder.status !== 'pendingAdminReview') { // Evitar cambiar si ya lo pusimos en pendingAdminReview desde rejected
        if (isNew && description && changeOrder.totalCost && changeOrder.totalCost > 0) {
            changeOrder.status = 'pendingAdminReview';
        } else if (!isNew && changeOrder.status === 'draft') { 
            if (description && changeOrder.totalCost && changeOrder.totalCost > 0) {
                changeOrder.status = 'pendingAdminReview';
            }
        }
    }
    
    await changeOrder.save();

    const coIsForStoneExtraction = isStoneExtractionCO === true || (description && description.toLowerCase().includes('extracción de piedras'));

    if (work && coIsForStoneExtraction) { 
      work.stoneExtractionCONeeded = false; 
      await work.save();
      console.log(`[Backend] Work ${work.idWork} actualizado: stoneExtractionCONeeded a false.`);
    }

    const finalChangeOrder = await ChangeOrder.findByPk(changeOrder.id, {
        include: [{ model: Work, as: 'work' }] 
    });

    res.status(isNew ? 201 : 200).json({
      message: `Change Order ${isNew ? 'creado' : 'actualizado'} exitosamente. Estado: ${finalChangeOrder.status}`,
      changeOrder: finalChangeOrder,
    });

  } catch (error) {
    console.error('Error al registrar/actualizar detalles del Change Order:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.', details: error.message });
  }
};


// ...existing code...
const sendChangeOrderToClient = async (req, res) => {
  let pdfPath; // Declarar pdfPath aquí para que esté disponible en el bloque finally
  try {
    const { changeOrderId } = req.params;

    const changeOrder = await ChangeOrder.findByPk(changeOrderId, {
      include: [
        {
          model: Work,
          as: 'work',
           include: [
            { 
              model: Budget, 
              as: 'budget',
              attributes: ['initialPaymentPercentage']
            }, 
            { model: Permit, as: 'Permit', attributes: ['applicantEmail', 'applicantName'] } 
          ]
        }
      ]
    });

    if (!changeOrder) {
      return res.status(404).json({ error: true, message: 'Change Order no encontrado.' });
    }
    if (!changeOrder.work) {
      return res.status(500).json({ error: true, message: 'No se pudo cargar la información del trabajo asociado al Change Order.' });
    }

    // Permitir enviar si está en 'draft' o 'pendingAdminReview'
    if (changeOrder.status !== 'pendingAdminReview' && changeOrder.status !== 'draft') {
      return res.status(400).json({
        error: true,
        message: `El Change Order no puede ser enviado en su estado actual: ${changeOrder.status}. Debe estar en 'pendingAdminReview' o 'draft'.`
      });
    }
    if (!changeOrder.totalCost || changeOrder.totalCost <= 0) {
        return res.status(400).json({ error: true, message: 'El Change Order debe tener un costo total definido antes de enviarse.'});
    }

    const companyData = {
      name: "ZURCHER CONSTRUCTION LLC.",
      addressLine1: "9837 Clear Cloud Aly",
      cityStateZip: "Winter Garden 34787",
      phone: "+1 (407) 419-4495",
      email: "zurcherseptic@gmail.com",
      logoPath: path.join(__dirname, '../assets/logo_zurcher_construction.png'), 
    };
    
    pdfPath = await generateAndSaveChangeOrderPDF(changeOrder.get({ plain: true }), changeOrder.work.get({ plain: true }), companyData);
    
    let pdfUrlForRecord = null; // Iniciar como null

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      console.log('[ChangeOrderController] Cloudinary credentials found, attempting upload...');
      try {
        const uploadResult = await cloudinary.uploader.upload(pdfPath, {
          folder: `change_orders/${changeOrder.work.idWork}`, 
          public_id: `co_${changeOrder.id}`, // Usar un ID único para el archivo en Cloudinary
          resource_type: 'raw', 
          overwrite: true, // Sobrescribir si ya existe un PDF para esta CO (útil para reenvíos)
        });
        pdfUrlForRecord = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Error al subir Change Order PDF a Cloudinary:", uploadError);
        pdfUrlForRecord = null; // Asegurar que sea null si falla la subida
      }
    }
    changeOrder.pdfUrl = pdfUrlForRecord; // Guardar URL de Cloudinary o null

    const workDetails = changeOrder.work;
    let clientEmail = null;
    let clientName = "Valued Customer"; 

    if (workDetails.budget && workDetails.budget.applicantEmail) {
      clientEmail = workDetails.budget.applicantEmail;
      clientName = workDetails.budget.applicantName || clientName;
    } else if (workDetails.Permit && workDetails.Permit.applicantEmail) {
      clientEmail = workDetails.Permit.applicantEmail;
      clientName = workDetails.Permit.applicantName || clientName;
    }

    if (!clientEmail) {
      return res.status(400).json({ error: true, message: 'No se pudo encontrar el email del cliente.' });
    }

    const approvalToken = uuidv4();
    const rejectionToken = uuidv4();
    changeOrder.approvalToken = approvalToken;
    changeOrder.rejectionToken = rejectionToken;
    const frontendBaseUrl = process.env.FRONTEND_URL2 || 'http://localhost:5174'; 

    const approvalLink = `${frontendBaseUrl}/change-order-response?token=${approvalToken}&decision=approved&coId=${changeOrder.id}`;
    const rejectionLink = `${frontendBaseUrl}/change-order-response?token=${rejectionToken}&decision=rejected&coId=${changeOrder.id}`;

    const emailSubject = `Acción Requerida: Orden de Cambio #${changeOrder.changeOrderNumber || changeOrder.id.substring(0,8)} para ${workDetails.propertyAddress}`;
    const emailHtml = `
      <p>Estimado/a ${clientName},</p>
      <p>${changeOrder.clientMessage || `Adjunto encontrará una orden de cambio (${changeOrder.description || 'N/A'}) que requiere su atención para la propiedad en ${workDetails.propertyAddress}.`}</p>
      <p><strong>Descripción del Cambio:</strong> ${changeOrder.itemDescription || changeOrder.description}</p>
      <p><strong>Costo Total Adicional:</strong> $${parseFloat(changeOrder.totalCost).toFixed(2)}</p>
      <p>Por favor, revise el documento PDF adjunto y seleccione una de las siguientes opciones para proceder:</p>
      <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px; margin-bottom: 20px;">
        <tr>
          <td style="padding-bottom: 10px;">
            <a href="${approvalLink}" target="_blank" style="background-color: #28a745; color: white; padding: 12px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; font-weight: bold; font-size: 16px;">APROBAR ORDEN DE CAMBIO</a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="${rejectionLink}" target="_blank" style="background-color: #dc3545; color: white; padding: 12px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; font-weight: bold; font-size: 16px;">RECHAZAR ORDEN DE CAMBIO</a>
          </td>
        </tr>
      </table>
      <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
      <p>Gracias,<br/>El Equipo de ${companyData.name}</p>
    `;
    
    await sendEmail({
      to: clientEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Texto alternativo: ${emailSubject}`, 
      attachments: [{ filename: `Change_Order_${changeOrder.id.substring(0,8)}.pdf`, path: pdfPath }]
    });

    changeOrder.status = 'pendingClientApproval';
    changeOrder.requestedAt = new Date(); // Registrar la fecha de (re)envío
    await changeOrder.save();
    
    res.status(200).json({
      message: 'Change Order enviado al cliente exitosamente.',
      changeOrder: await ChangeOrder.findByPk(changeOrder.id) 
    });

  } catch (error) {
    console.error('Error DETALLADO dentro de sendChangeOrderToClient:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al enviar el Change Order.', details: error.message });
  } finally {
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        console.log(`Archivo PDF local ${pdfPath} borrado exitosamente.`);
      } catch (unlinkError) {
        console.error(`Error al borrar el archivo PDF local ${pdfPath}:`, unlinkError);
      }
    }
  }
};
// ...existing code...

const handleClientChangeOrderResponse = async (req, res) => {
  try {
    const { token, decision, coId } = req.query;

    // 1. Validar parámetros de entrada
    if (!token || !decision || !coId) {
      return res.status(400).json({
        success: false,
        message: 'Información incompleta. Faltan parámetros necesarios (token, decision, coId) para procesar su respuesta.',
      });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Decisión inválida. Los valores permitidos son "approved" o "rejected".',
      });
    }

    const changeOrder = await ChangeOrder.findByPk(coId, {
      include: [{ 
        model: Work, 
        as: 'work',
        include: [{ model: Budget, as: 'budget' }] // Incluir Budget para el nombre del cliente si es necesario
      }]
    });

    if (!changeOrder) {
      return res.status(404).json({
        success: false,
        message: 'Orden de Cambio no encontrada. El enlace puede ser incorrecto o la orden ya no existe.',
      });
    }
    if (!changeOrder.work) {
        // Esto sería inesperado si la inclusión funciona
        return res.status(500).json({ success: false, message: 'Error interno: No se pudo cargar la información del trabajo asociado.' });
    }

    // 3. Verificar el estado actual del Change Order (como antes)
    // ... (código de verificación de estado y 409) ...
    if (changeOrder.status !== 'pendingClientApproval') {
      let userMessage = `Esta orden de cambio ya ha sido procesada anteriormente. Su estado actual es: ${changeOrder.status}.`;
      if (changeOrder.status === decision) {
        userMessage = `Su decisión de '${decision}' para esta orden de cambio ya fue registrada.`;
      }
      return res.status(409).json({
        success: false,
        message: userMessage,
        currentStatus: changeOrder.status,
      });
    }

    // --- LOGS DE DEPURACIÓN ---
    console.log('--- DEBUGGING TOKEN VALIDATION ---');
    console.log('Token desde URL (req.query.token):', token);
    console.log('Decisión desde URL (req.query.decision):', decision);
    console.log('ChangeOrder ID (coId):', coId);
    console.log('ChangeOrder.approvalToken desde BD:', changeOrder.approvalToken);
    console.log('ChangeOrder.rejectionToken desde BD:', changeOrder.rejectionToken);
    console.log('ChangeOrder.status desde BD:', changeOrder.status);
    // --- FIN LOGS DE DEPURACIÓN ---

    // 4. Validar el token
    let isValidToken = false;
    if (decision === 'approved' && token === changeOrder.approvalToken) {
      isValidToken = true;
      console.log('DEBUG: Token coincide con approvalToken.');
    } else if (decision === 'rejected' && token === changeOrder.rejectionToken) {
      isValidToken = true;
      console.log('DEBUG: Token coincide con rejectionToken.');
    } else {
      console.log('DEBUG: Token NO coincide con el token esperado para la decisión.');
    }

    if (!isValidToken) {
      console.log('DEBUG: isValidToken es false. Devolviendo 403.');
      return res.status(403).json({
        success: false,
        message: 'Enlace inválido o expirado. Este enlace de decisión no es válido o ya ha sido utilizado.',
      });
    }

  // 5. Actualizar el Change Order
    // Guardar estado anterior para la notificación
    changeOrder.status = decision; // 'approved' o 'rejected'
    changeOrder.respondedAt = new Date();
    changeOrder.approvalToken = null;
    changeOrder.rejectionToken = null;
    await changeOrder.save();

    // --- 6. Enviar Notificaciones Internas a Admin y Owner ---
    const decisionTextForNotification = decision === 'approved' ? 'APROBADA' : 'RECHAZADA';
    const clientName = changeOrder.work?.budget?.applicantName || 'El cliente'; // Obtener nombre del cliente si es posible
    const propertyAddress = changeOrder.work?.propertyAddress || 'Dirección desconocida';
    const coNumber = changeOrder.changeOrderNumber || changeOrder.id.substring(0,8);

    const adminOwnerSubject = `Respuesta de Cliente: Orden de Cambio #${coNumber} ha sido ${decisionTextForNotification}`;
    const adminOwnerHtml = `
      <p>Hola,</p>
      <p>${clientName} ha respondido a la Orden de Cambio #${coNumber} para la propiedad en <strong>${propertyAddress}</strong>.</p>
      <p><strong>Decisión del Cliente: ${decisionTextForNotification.toUpperCase()}</strong></p>
      <p><strong>Descripción de la Orden de Cambio:</strong> ${changeOrder.description || 'N/A'}</p>
      <p><strong>Costo Total:</strong> $${parseFloat(changeOrder.totalCost || 0).toFixed(2)}</p>
      <p>Por favor, revise el sistema para los detalles completos y los siguientes pasos.</p>
      <p>Saludos,<br/>Sistema de Notificaciones Zurcher</p>
    `;

    try {
      const staffToNotify = await Staff.findAll({
        where: {
          role: ['admin', 'owner'], // Roles a notificar
          email: { [Op.ne]: null } // Asegurarse de que tengan email
        }
      });

      if (staffToNotify.length > 0) {
        for (const staffMember of staffToNotify) {
          if (staffMember.email) { // Doble chequeo por si acaso
            await sendEmail({
              to: staffMember.email,
              subject: adminOwnerSubject,
              html: adminOwnerHtml,
              text: `El cliente ha ${decisionTextForNotification.toLowerCase()} la Orden de Cambio #${coNumber} para ${propertyAddress}. Costo: $${parseFloat(changeOrder.totalCost || 0).toFixed(2)}.`
            });
            console.log(`Notificación interna enviada a ${staffMember.role} (${staffMember.email}) sobre CO #${coNumber}`);
          }
        }
      } else {
        console.log('No se encontraron administradores u owners con email para notificar sobre la respuesta del CO.');
      }
    } catch (notificationError) {
      console.error('Error al enviar notificación interna sobre respuesta de CO:', notificationError);
      // No devolver error al cliente por esto, solo loguear
    }
    // 7. Respuesta JSON de éxito al cliente (como antes)
    const decisionTextForClient = decision === 'approved' ? 'APROBADA' : 'RECHAZADA';
    return res.status(200).json({
      success: true,
      message: `¡Gracias! Su decisión de '${decisionTextForClient}' para la Orden de Cambio ha sido registrada exitosamente.`,
      reference: `CO-${coNumber}`,
      newStatus: changeOrder.status
    });

  } catch (error) {
    console.error('Error al procesar la respuesta del cliente para el Change Order:', error);
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error del servidor al procesar su solicitud. Por favor, inténtelo más tarde.',
      details: error.message
    });
  }
};

const previewChangeOrderPDF = async (req, res) => {
  let pdfPath; // Declarar pdfPath aquí para que esté disponible en todo el bloque try-catch
  try {
    const { changeOrderId } = req.params;
    const changeOrder = await ChangeOrder.findByPk(changeOrderId, {
      include: [{ 
        model: Work, 
        as: 'work', 
        include: [
          { 
            model: Budget, 
            as: 'budget',
            attributes: ['initialPaymentPercentage']
          },
          { model: Permit, as: 'Permit' } // Agregar Permit si es necesario
        ] 
      }]
    });

    if (!changeOrder) {
      return res.status(404).json({ error: true, message: 'Change Order no encontrado.' });
    }
    if (!changeOrder.work) {
      return res.status(500).json({ error: true, message: 'No se pudo cargar la información del trabajo asociado.' });
    }

    // Extraer work del changeOrder
    const work = changeOrder.work;

    const companyData = {
      name: "ZURCHER CONSTRUCTION LLC.",
      addressLine1: "9837 Clear Cloud Aly",
      cityStateZip: "Winter Garden 34787",
      phone: "+1 (407) 419-4495",
      email: "zurcherseptic@gmail.com",
      logoPath: path.join(__dirname, '../assets/logo_zurcher_construction.png'),
    };

    // Usar generateAndSaveChangeOrderPDF para crear el archivo PDF
    // Pasar los datos correctos: changeOrder (plain object), work (plain object), companyData
    pdfPath = await generateAndSaveChangeOrderPDF(
      changeOrder.get({ plain: true }), 
      work.get({ plain: true }), 
      companyData
    );

    if (!fs.existsSync(pdfPath)) {
      console.error(`[previewChangeOrderPDF] El archivo PDF no se generó o no se encontró en: ${pdfPath}`);
      return res.status(500).json({ error: true, message: 'Error al generar la vista previa del PDF.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview_co_${changeOrder.id.substring(0,8)}.pdf"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Limpiar el archivo temporal después de enviarlo
    fileStream.on('close', () => {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlink(pdfPath, (err) => {
          if (err) console.error(`Error al borrar el PDF temporal de previsualización ${pdfPath}:`, err);
          else console.log(`PDF temporal de previsualización ${pdfPath} borrado.`);
        });
      }
    });

    fileStream.on('error', (err) => {
      console.error(`Error en el stream del archivo PDF de previsualización ${pdfPath}:`, err);
      // Asegurarse de borrar el archivo si aún existe y no se envió
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      if (!res.headersSent) {
        res.status(500).send('Error al transmitir el PDF.');
      }
    });

  } catch (error) {
    console.error('Error al generar la vista previa del PDF del Change Order:', error);
    // Intentar borrar el PDF si se creó y hubo un error
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (unlinkErr) {
        console.error(`Error al intentar borrar PDF temporal ${pdfPath} después de un error:`, unlinkErr);
      }
    }
    if (!res.headersSent) {
      res.status(500).json({ error: true, message: 'Error interno del servidor al generar la vista previa del PDF.', details: error.message });
    }
  }
};

const deleteChangeOrder = async (req, res) => {
  try {
    const { changeOrderId } = req.params;
    const changeOrder = await ChangeOrder.findByPk(changeOrderId);

    if (!changeOrder) {
      return res.status(404).json({ error: true, message: 'Change Order no encontrado.' });
    }

    // Si tienes archivos PDF en Cloudinary, podrías eliminarlos aquí también (opcional)
    if (changeOrder.pdfUrl && changeOrder.pdfUrl.includes('cloudinary.com')) {
      try {
        // Extraer public_id de la URL si lo necesitas para borrar en Cloudinary
        const publicId = `change_orders/${changeOrder.workId}/co_${changeOrder.id}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.error('Error al eliminar PDF de Cloudinary:', cloudErr);
      }
    }

    await changeOrder.destroy();

    res.status(200).json({ success: true, message: 'Change Order eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar Change Order:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al eliminar la Change Order.', details: error.message });
  }
};

module.exports = {

  recordOrUpdateChangeOrderDetails,
  sendChangeOrderToClient,
  handleClientChangeOrderResponse,
  previewChangeOrderPDF,
  deleteChangeOrder,
};