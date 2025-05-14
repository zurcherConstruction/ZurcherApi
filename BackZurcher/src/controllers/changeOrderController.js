const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet, Receipt, ChangeOrder } = require('../data');
const { sendEmail } = require('../utils/notifications/emailService');
const path = require('path');
const {generateAndSaveChangeOrderPDF} = require('../utils/pdfGenerator')
const fs = require('fs'); 
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const recordOrUpdateChangeOrderDetails = async (req, res) => {
  try {
    const { idWork: workIdFromParams } = req.params; 
    const { changeOrderId: changeOrderIdFromParams } = req.params; 
    
    const {
      changeOrderId: changeOrderIdFromBody, 
      description,
      itemDescription,
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
        include: [{ model: Work, as: 'work' }] // Incluir el trabajo para obtener workId y datos del trabajo
      });

      if (!changeOrder) {
        return res.status(404).json({ error: true, message: 'Change Order no encontrado.' });
      }
      // Si el CO existe, el trabajo asociado es changeOrder.work
      work = changeOrder.work; 
      if (!work) {
         // Esto no debería pasar si la FK está bien, pero por si acaso
        return res.status(404).json({ error: true, message: 'Trabajo asociado al Change Order no encontrado.' });
      }

      // Permitir actualización solo si está en borrador o pendiente de revisión del admin
      if (changeOrder.status !== 'draft' && changeOrder.status !== 'pendingAdminReview') {
        return res.status(400).json({
          error: true,
          message: `El Change Order no puede modificarse en su estado actual: ${changeOrder.status}`,
        });
      }
    } else if (workIdFromParams) {
      // Si no hay ID de CO pero sí de Trabajo (ruta POST para crear nuevo CO)
      work = await Work.findByPk(workIdFromParams);
      if (!work) {
        return res.status(404).json({ error: true, message: 'Trabajo no encontrado.' });
      }
      // Crear un nuevo Change Order
      changeOrder = await ChangeOrder.create({
        workId: workIdFromParams,
        description: description || "Change Order",
        status: 'draft',
      });
      isNew = true;
    } else {
      // Ni ID de CO ni ID de Trabajo en los parámetros esperados
      return res.status(400).json({ error: true, message: 'Se requiere ID de Trabajo para crear un Change Order o ID de Change Order para actualizar.' });
    }

    // Actualizar los campos del Change Order
    changeOrder.description = description !== undefined ? description : changeOrder.description;
    // ... (resto de las actualizaciones de campos como estaban) ...
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
    
    if (isNew && description && changeOrder.totalCost > 0) {
        changeOrder.status = 'pendingAdminReview';
    } else if (!isNew) {
        if (changeOrder.status === 'draft' && description && changeOrder.totalCost > 0) {
            changeOrder.status = 'pendingAdminReview';
        }
    }
    // ... (fin de las actualizaciones de campos) ...

    await changeOrder.save();

    // Para la respuesta, nos aseguramos de tener el 'work' asociado si no lo incluimos antes
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

const sendChangeOrderToClient = async (req, res) => {
  let pdfPath;
  try {
    const { changeOrderId } = req.params;

    const changeOrder = await ChangeOrder.findByPk(changeOrderId, {
      include: [
        {
          model: Work,
          as: 'work',
           include: [
            { model: Budget, as: 'budget'}, // Asegúrate de pedir los atributos necesarios
            { model: Permit, as: 'Permit', attributes: ['applicantEmail', 'applicantName'] }  // Y aquí también
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

    // Verificar estado del Change Order (ej. 'pendingAdminReview' o 'draft' si se permite enviar desde draft)
    if (changeOrder.status !== 'pendingAdminReview' && changeOrder.status !== 'draft') {
      return res.status(400).json({
        error: true,
        message: `El Change Order no puede ser enviado en su estado actual: ${changeOrder.status}. Debe estar en 'pendingAdminReview' o 'draft'.`
      });
    }
    if (!changeOrder.totalCost || changeOrder.totalCost <= 0) {
        return res.status(400).json({ error: true, message: 'El Change Order debe tener un costo total definido antes de enviarse.'});
    }


    // --- 1. Generar el PDF ---
    // Datos de la empresa (puedes tenerlos en una config o pasarlos)
    const companyData = {
      name: "ZURCHER CONSTRUCTION LLC.",
      addressLine1: "9837 Clear Cloud Aly",
      cityStateZip: "Winter Garden 34787",
      phone: "+1 (407) 419-4495",
      email: "zurcherseptic@gmail.com",
      logoPath: path.join(__dirname, '../assets/logo_zurcher_construction.png'), // Ajusta la ruta a tu logo
      // ... otros datos de la empresa que necesite el PDF ...
    };
    const pdfPath = await generateAndSaveChangeOrderPDF(changeOrder.get({ plain: true }), changeOrder.work.get({ plain: true }), companyData);
    
    let pdfUrlForRecord = pdfPath; // URL local por defecto

    // --- 2. (Opcional) Subir PDF a Cloudinary ---
    if (process.env.CLOUDINARY_URL) { // Verifica si Cloudinary está configurado
      try {
        const uploadResult = await cloudinary.uploader.upload(pdfPath, {
          folder: `change_orders/${changeOrder.work.idWork}`, // Organiza en Cloudinary
          public_id: `co_${changeOrder.id}`,
          resource_type: 'raw', // o 'image' si Cloudinary lo maneja mejor como imagen
        });
        pdfUrlForRecord = uploadResult.secure_url;
        changeOrder.pdfUrl = pdfUrlForRecord; // Guardar URL de Cloudinary
        // Opcional: Borrar el archivo PDF local después de subirlo a Cloudinary
         fs.unlinkSync(pdfPath); 
      } catch (uploadError) {
        console.error("Error al subir Change Order PDF a Cloudinary:", uploadError);
        // Decidir si continuar sin Cloudinary o devolver error
        // Por ahora, continuamos con la URL local si falla la subida
      }
    } else {
      changeOrder.pdfUrl = pdfPath; // Guardar path local si no se usa Cloudinary
    }


    // --- 3. Obtener Email del Cliente ---
    const workDetails = changeOrder.work;
    let clientEmail = null;
    let clientName = "Valued Customer"; // Nombre por defecto

    if (workDetails.budget && workDetails.budget.applicantEmail) {
      clientEmail = workDetails.budget.applicantEmail;
      clientName = workDetails.budget.applicantName || clientName;
      console.log(`Email del cliente obtenido del Budget: ${clientEmail}`);
    } else if (workDetails.Permit && workDetails.Permit.applicantEmail) {
      clientEmail = workDetails.Permit.applicantEmail;
      clientName = workDetails.Permit.applicantName || clientName;
      console.log(`Email del cliente obtenido del Permit: ${clientEmail}`);
    } else {
      console.log('No se encontró applicantEmail ni en Budget ni en Permit para el trabajo:', workDetails.idWork);
    }

 if (!clientEmail) {
      if (pdfPath && fs.existsSync(pdfPath) && !process.env.CLOUDINARY_URL) { // Solo borrar si no se subió a Cloudinary y existe
          fs.unlinkSync(pdfPath); // Comentado temporalmente para no borrar el PDF durante la depuración
         console.log(`PDF no borrado (depuración): ${pdfPath}`);
      }
      return res.status(400).json({ error: true, message: 'No se pudo encontrar el email del cliente para este trabajo. Verifique los datos del Budget o Permit asociados.' });
    }

    // --- 4. Generar Tokens y Enlaces de Acción ---
  


 // ... (Generar Tokens y Enlaces de Acción como antes) ...
    const approvalToken = uuidv4();
    const rejectionToken = uuidv4();
    changeOrder.approvalToken = approvalToken;
    changeOrder.rejectionToken = rejectionToken;
       const frontendBaseUrl = process.env.FRONTEND_URL2 || 'http://localhost:5174'; // URL base de tu frontend

    // Los enlaces ahora apuntan a una página del frontend que manejará la lógica
    // Esta página del frontend luego llamará a la API del backend
    const approvalLink = `${frontendBaseUrl}/change-order-response?token=${approvalToken}&decision=approved&coId=${changeOrder.id}`;
    const rejectionLink = `${frontendBaseUrl}/change-order-response?token=${rejectionToken}&decision=rejected&coId=${changeOrder.id}`;

     // --- 5. Enviar Email ---
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

    console.log(`Intentando enviar email a: ${clientEmail}`);
    
    // --- AJUSTE AQUÍ ---
    await sendEmail({
      to: clientEmail,
      subject: emailSubject,
      html: emailHtml,
      text: `Texto alternativo: ${emailSubject}`, // O un texto plano más elaborado
      attachments: [{ filename: `Change_Order_${changeOrder.id.substring(0,8)}.pdf`, path: pdfPath }]
    });
    // --- FIN DEL AJUSTE ---

    console.log(`Email enviado (o intento realizado) a ${clientEmail}`);

    // --- 6. Actualizar Estado del Change Order ---
    changeOrder.status = 'pendingClientApproval';
    changeOrder.requestedAt = new Date();
    // pdfUrl ya se asignó si se usa Cloudinary, o se puede dejar como path local si no.
    // Si no usas Cloudinary y quieres guardar una URL relativa o un identificador del archivo:
    if (!changeOrder.pdfUrl) changeOrder.pdfUrl = `local_co_pdf_${path.basename(pdfPath)}`;


    await changeOrder.save();
    
    // Opcional: Borrar el archivo PDF local si ya se envió y/o subió a Cloudinary
     if (process.env.CLOUDINARY_URL) fs.unlinkSync(pdfPath);


    res.status(200).json({
      message: 'Change Order enviado al cliente exitosamente.',
      changeOrder: await ChangeOrder.findByPk(changeOrder.id) // Devolver el CO actualizado
    });

  } catch (error) {
    console.error('Error al enviar Change Order al cliente:', error);
    // Intentar borrar el PDF si se creó y hubo un error posterior
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    res.status(500).json({ error: true, message: 'Error interno del servidor al enviar el Change Order.', details: error.message });
  }
};

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

module.exports = {

  recordOrUpdateChangeOrderDetails,
  sendChangeOrderToClient,
  handleClientChangeOrderResponse
};