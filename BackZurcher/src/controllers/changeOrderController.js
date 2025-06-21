const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet, Receipt, ChangeOrder } = require('../data');
const { sendEmail } = require('../utils/notifications/emailService');
const path = require('path');
const { generateAndSaveChangeOrderPDF } = require('../utils/pdfGenerators');
const  SignNowService  = require('../services/ServiceSignNow');
const fs = require('fs'); 
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const axios = require('axios'); 
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
          public_id: `co_${changeOrder.id}_${Date.now()}`,
          resource_type: 'auto', // CAMBIAR DE 'raw' A 'auto'
          access_mode: 'public',
          overwrite: true,
          format: 'pdf' // ESPECIFICAR FORMATO EXPLÍCITAMENTE
        });
        
        pdfUrlForRecord = uploadResult.secure_url;
        console.log('[Cloudinary] PDF subido como auto/public:', pdfUrlForRecord);
        
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

    // ✅ LOGS DETALLADOS
    console.log('🔍 === DEBUGGING CHANGE ORDER RESPONSE (PRODUCTION) ===');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('📧 Query params:', req.query);
    console.log('📊 Headers:', {
      'user-agent': req.get('user-agent')?.substring(0, 50),
      'referer': req.get('referer'),
      'host': req.get('host')
    });

    // 1. Validar parámetros
    if (!token || !decision || !coId) {
      return res.status(400).json({
        success: false,
        message: 'Información incompleta. Faltan parámetros necesarios.',
        debug: { received: req.query }
      });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Decisión inválida. Los valores permitidos son "approved" o "rejected".',
      });
    }

    // ✅ VALIDAR ID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coId);
    if (!isValidUUID) {
      console.error('❌ ID inválido:', coId);
      return res.status(400).json({
        success: false,
        message: 'ID de orden de cambio inválido.',
        debug: { receivedCoId: coId, type: typeof coId }
      });
    }

    console.log('✅ Parámetros validados. Buscando Change Order:', coId);

    // ✅ BÚSQUEDA SÚPER ROBUSTA
    let changeOrder;
    let searchAttempts = [];

    try {
      // INTENTO 1: Búsqueda completa con todos los includes
      console.log('🔎 Intento 1: Búsqueda completa...');
      changeOrder = await ChangeOrder.findOne({
        where: { id: coId },
        include: [{ 
          model: Work, 
          as: 'work',
          include: [
            { 
              model: Budget, 
              as: 'budget',
              required: false // ✅ IMPORTANTE: No requerir Budget
            },
            { 
              model: Permit, 
              as: 'Permit', 
              attributes: ['applicantEmail', 'applicantName'],
              required: false // ✅ IMPORTANTE: No requerir Permit
            }
          ]
        }]
      });
      
      searchAttempts.push({
        attempt: 1,
        method: 'findOne with full includes',
        found: !!changeOrder,
        details: changeOrder ? {
          id: changeOrder.id,
          status: changeOrder.status,
          workId: changeOrder.workId,
          hasWork: !!changeOrder.work,
          hasBudget: !!changeOrder.work?.budget,
          hasPermit: !!changeOrder.work?.Permit
        } : null
      });

    } catch (includeError) {
      console.log('❌ Error en intento 1:', includeError.message);
      searchAttempts.push({
        attempt: 1,
        method: 'findOne with full includes',
        error: includeError.message
      });
    }

    if (!changeOrder) {
      try {
        // INTENTO 2: Búsqueda simple sin includes
        console.log('🔎 Intento 2: Búsqueda simple...');
        changeOrder = await ChangeOrder.findByPk(coId);
        
        if (changeOrder) {
          console.log('✅ Change Order encontrado sin includes. Cargando Work...');
          
          try {
            changeOrder.work = await Work.findByPk(changeOrder.workId);
            
            if (changeOrder.work) {
              // Cargar Budget y Permit por separado
              try {
                changeOrder.work.budget = await Budget.findOne({
                  where: { PermitIdPermit: { [Op.ne]: null } },
                  include: [{ model: Permit, where: { idPermit: changeOrder.work.idWork } }]
                });
              } catch (budgetError) {
                console.log('⚠️ No se pudo cargar Budget:', budgetError.message);
                changeOrder.work.budget = null;
              }

              try {
                changeOrder.work.Permit = await Permit.findOne({
                  where: { 
                    [Op.or]: [
                      { idPermit: changeOrder.work.idWork },
                      { propertyAddress: changeOrder.work.propertyAddress }
                    ]
                  },
                  attributes: ['applicantEmail', 'applicantName']
                });
              } catch (permitError) {
                console.log('⚠️ No se pudo cargar Permit:', permitError.message);
                changeOrder.work.Permit = null;
              }
            }
          } catch (workError) {
            console.log('❌ Error cargando Work:', workError.message);
          }
        }

        searchAttempts.push({
          attempt: 2,
          method: 'findByPk + manual loading',
          found: !!changeOrder,
          hasWork: !!changeOrder?.work
        });

      } catch (simpleError) {
        console.log('❌ Error en intento 2:', simpleError.message);
        searchAttempts.push({
          attempt: 2,
          method: 'findByPk + manual loading',
          error: simpleError.message
        });
      }
    }

    if (!changeOrder) {
      try {
        // INTENTO 3: Búsqueda por tokens
        console.log('🔎 Intento 3: Búsqueda por tokens...');
        changeOrder = await ChangeOrder.findOne({
          where: {
            [Op.or]: [
              { approvalToken: token },
              { rejectionToken: token }
            ]
          }
        });

        if (changeOrder) {
          console.log('✅ Change Order encontrado por token');
          try {
            changeOrder.work = await Work.findByPk(changeOrder.workId);
          } catch (workError) {
            console.log('❌ Error cargando Work por token:', workError.message);
          }
        }

        searchAttempts.push({
          attempt: 3,
          method: 'findOne by tokens',
          found: !!changeOrder
        });

      } catch (tokenError) {
        console.log('❌ Error en intento 3:', tokenError.message);
        searchAttempts.push({
          attempt: 3,
          method: 'findOne by tokens',
          error: tokenError.message
        });
      }
    }

    // ✅ LOGS DETALLADOS DEL RESULTADO
    console.log('📊 Resultado detallado de búsqueda:', {
      found: !!changeOrder,
      searchAttempts,
      finalData: changeOrder ? {
        id: changeOrder.id,
        status: changeOrder.status,
        workId: changeOrder.workId,
        hasWork: !!changeOrder.work,
        workDetails: changeOrder.work ? {
          idWork: changeOrder.work.idWork,
          propertyAddress: changeOrder.work.propertyAddress,
          hasBudget: !!changeOrder.work.budget,
          hasPermit: !!changeOrder.work.Permit,
          budgetEmail: changeOrder.work.budget?.applicantEmail,
          permitEmail: changeOrder.work.Permit?.applicantEmail
        } : null,
        approvalToken: changeOrder.approvalToken ? 'SET' : 'NULL',
        rejectionToken: changeOrder.rejectionToken ? 'SET' : 'NULL'
      } : null
    });

    if (!changeOrder) {
      console.error('❌ Change Order definitivamente no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Orden de Cambio no encontrada. El enlace puede ser incorrecto o la orden ya no existe.',
        debug: {
          searchedId: coId,
          environment: process.env.NODE_ENV,
          searchAttempts: searchAttempts,
          timestamp: new Date().toISOString()
        }
      });
    }

    // ✅ VALIDAR WORK (más flexible)
    if (!changeOrder.work) {
      console.log('⚠️ Work no encontrado, pero continuando...');
      // En lugar de fallar, crear un objeto work vacío
      changeOrder.work = {
        idWork: changeOrder.workId,
        propertyAddress: 'Dirección no disponible',
        budget: null,
        Permit: null
      };
    }

    // 3. Verificar estado
    if (changeOrder.status !== 'pendingClientApproval') {
      let userMessage = `Esta orden de cambio ya ha sido procesada anteriormente. Su estado actual es: ${changeOrder.status}.`;
      if (changeOrder.status === decision) {
        userMessage = `Su decisión de '${decision}' para esta orden de cambio ya fue registrada.`;
      }
      
      console.log('⚠️ Estado incorrecto:', {
        currentStatus: changeOrder.status,
        expectedStatus: 'pendingClientApproval',
        decision: decision
      });
      
      return res.status(409).json({
        success: false,
        message: userMessage,
        currentStatus: changeOrder.status,
      });
    }

    // 4. Validar tokens
    console.log('🔐 Validando tokens...');
    console.log('Token recibido:', token?.substring(0, 8) + '...');
    console.log('Approval token BD:', changeOrder.approvalToken?.substring(0, 8) + '...');
    console.log('Rejection token BD:', changeOrder.rejectionToken?.substring(0, 8) + '...');

    let isValidToken = false;
    if (decision === 'approved' && token === changeOrder.approvalToken) {
      isValidToken = true;
      console.log('✅ Token de aprobación válido');
    } else if (decision === 'rejected' && token === changeOrder.rejectionToken) {
      isValidToken = true;
      console.log('✅ Token de rechazo válido');
    } else {
      console.error('❌ Token inválido:', {
        decision,
        receivedToken: token?.substring(0, 8) + '...',
        approvalTokenMatch: token === changeOrder.approvalToken,
        rejectionTokenMatch: token === changeOrder.rejectionToken
      });
    }

    if (!isValidToken) {
      return res.status(403).json({
        success: false,
        message: 'Enlace inválido o expirado. Este enlace de decisión no es válido o ya ha sido utilizado.',
      });
    }

    console.log('🎉 Procesando decisión:', decision);

    // ============= CASO 1: CLIENTE RECHAZA =============
    if (decision === 'rejected') {
      // Guardar estado anterior para la notificación
      changeOrder.status = 'rejected';
      changeOrder.respondedAt = new Date();
      changeOrder.approvalToken = null;
      changeOrder.rejectionToken = null;
      await changeOrder.save();

      // Enviar notificaciones de rechazo (código original)
     const clientName = changeOrder.work?.budget?.applicantName || 
                        changeOrder.work?.Permit?.applicantName || 
                        'El cliente';
      const propertyAddress = changeOrder.work?.propertyAddress || 'Dirección desconocida';
      const coNumber = changeOrder.changeOrderNumber || changeOrder.id.substring(0,8);
      const adminOwnerSubject = `Respuesta de Cliente: Orden de Cambio #${coNumber} ha sido RECHAZADA`;
      const adminOwnerHtml = `
        <p>Hola,</p>
        <p>${clientName} ha RECHAZADO la Orden de Cambio #${coNumber} para la propiedad en <strong>${propertyAddress}</strong>.</p>
        <p><strong>Descripción de la Orden de Cambio:</strong> ${changeOrder.description || 'N/A'}</p>
        <p><strong>Costo Total:</strong> $${parseFloat(changeOrder.totalCost || 0).toFixed(2)}</p>
        <p>Por favor, revise el sistema para los detalles completos y los siguientes pasos.</p>
        <p>Saludos,<br/>Sistema de Notificaciones Zurcher</p>
      `;

      try {
        const staffToNotify = await Staff.findAll({
          where: {
            role: ['admin', 'owner'],
            email: { [Op.ne]: null }
          }
        });

        for (const staffMember of staffToNotify) {
          if (staffMember.email) {
            await sendEmail({
              to: staffMember.email,
              subject: adminOwnerSubject,
              html: adminOwnerHtml,
            });
            console.log(`Notificación interna enviada a ${staffMember.role} (${staffMember.email}) sobre CO #${coNumber}`);
          }
        }
      } catch (notificationError) {
        console.error('Error al enviar notificación interna sobre rechazo de CO:', notificationError);
      }

      return res.status(200).json({
        success: true,
        message: '¡Gracias! Su decisión de RECHAZAR la Orden de Cambio ha sido registrada exitosamente.',
        reference: `CO-${coNumber}`,
        newStatus: changeOrder.status
      });
    }

    // ============= CASO 2: CLIENTE APRUEBA =============
    if (decision === 'approved') {
      // Paso 1: Marcar como 'approved'
      changeOrder.status = 'approved';
      changeOrder.respondedAt = new Date();
      changeOrder.approvalToken = null;
      changeOrder.rejectionToken = null;
      await changeOrder.save();

      console.log(`[CO Response] CO #${coId} marcado como 'approved'. Procediendo a notificar y enviar para firma.`);

      // Paso 2: Enviar notificación interna de APROBACIÓN
      try {
        const clientName = changeOrder.work?.Permit?.applicantName || changeOrder.work?.budget?.applicantName || 'El cliente';
        const propertyAddress = changeOrder.work?.propertyAddress || changeOrder.work?.budget?.propertyAddress || 'N/A';
        const coNumber = changeOrder.changeOrderNumber || changeOrder.id.substring(0, 8);
        const adminOwnerSubject = `Respuesta de Cliente: Orden de Cambio #${coNumber} ha sido APROBADA`;
        const adminOwnerHtml = `<p>Hola,</p><p>${clientName} ha APROBADO la Orden de Cambio #${coNumber} para la propiedad en <strong>${propertyAddress}</strong>.</p><p>El documento ha sido enviado para firma electrónica.</p><p><strong>Costo Total:</strong> $${parseFloat(changeOrder.totalCost || 0).toFixed(2)}</p>`;
        
        const staffToNotify = await Staff.findAll({ where: { role: ['admin', 'owner'], email: { [Op.ne]: null } } });
        for (const staffMember of staffToNotify) {
          await sendEmail({ to: staffMember.email, subject: adminOwnerSubject, html: adminOwnerHtml });
        }
      } catch (notificationError) {
        console.error('Error al enviar notificación interna de aprobación de CO:', notificationError);
      }

      // Paso 3: Intentar enviar para firma electrónica (NUEVA LÓGICA HÍBRIDA)
      try {
        if (!changeOrder.pdfUrl) throw new Error('Falta el PDF del Change Order.');
        
        // CORREGIR: Buscar email en ambos lugares (como en sendChangeOrderToClient)
        let clientEmail = null;
        if (changeOrder.work?.budget?.applicantEmail) {
          clientEmail = changeOrder.work.budget.applicantEmail;
        } else if (changeOrder.work?.Permit?.applicantEmail) {
          clientEmail = changeOrder.work.Permit.applicantEmail;
        }
        
        if (!clientEmail) throw new Error('Falta el email del cliente.');

        // ========= SOLUCIÓN HÍBRIDA: CREAR COPIA LOCAL PARA SIGNNOW =========
        let pdfUrlForSignNow = changeOrder.pdfUrl;
        let tempFilePath = null;
        
        // Si es URL de Cloudinary, crear copia local para SignNow
        if (changeOrder.pdfUrl && changeOrder.pdfUrl.includes('cloudinary.com')) {
          console.log('[SignNow] PDF en Cloudinary detectado, creando copia local...');
          
          const backendUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
          const fileName = `signnow_co_${changeOrder.id}_${Date.now()}.pdf`;
          const localPdfPath = path.join(__dirname, '../../uploads/change_orders', fileName);
          
          // Crear directorio si no existe
          const uploadDir = path.join(__dirname, '../../uploads/change_orders');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          try {
            // Descargar PDF desde Cloudinary
            console.log('[SignNow] Descargando PDF desde Cloudinary...');
            const response = await axios({
              method: 'GET',
              url: changeOrder.pdfUrl,
              responseType: 'stream',
              timeout: 60000,
              headers: {
                'User-Agent': 'ZurcherApp/1.0'
              }
            });
            
            const writer = fs.createWriteStream(localPdfPath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            pdfUrlForSignNow = `${backendUrl}/uploads/change_orders/${fileName}`;
            tempFilePath = localPdfPath;
            console.log('[SignNow] ✅ PDF local creado:', pdfUrlForSignNow);
            
          } catch (downloadError) {
            console.error('[SignNow] ❌ Error descargando PDF de Cloudinary:', downloadError.message);
            console.log('[SignNow] Intentando usar URL de Cloudinary directamente...');
            pdfUrlForSignNow = changeOrder.pdfUrl;
          }
        }

        const signNowService = new SignNowService();
        const clientName = changeOrder.work?.Permit?.applicantName || changeOrder.work?.budget?.applicantName || 'Valued Client';
        const propertyAddress = changeOrder.work?.propertyAddress || changeOrder.work?.budget?.propertyAddress || 'N/A';
        const fileName = `ChangeOrder_${coId}_${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        console.log('[SignNow] Enviando a SignNow con URL:', pdfUrlForSignNow);
        
        const signNowResult = await signNowService.sendBudgetForSignature(
          pdfUrlForSignNow,
          fileName,
          clientEmail,
          clientName
        );

        // Actualizar el estado de la firma y guardar el ID de SignNow
        changeOrder.signatureStatus = 'pending';
        changeOrder.signNowDocumentId = signNowResult.documentId;
        await changeOrder.save();

        console.log(`[CO Response] ✅ CO #${coId} enviado a SignNow. Document ID: ${signNowResult.documentId}`);

        // Programar limpieza del archivo temporal después de 10 minutos
        if (tempFilePath) {
          setTimeout(() => {
            if (fs.existsSync(tempFilePath)) {
              try {
                fs.unlinkSync(tempFilePath);
                console.log('[SignNow] 🧹 Archivo temporal limpiado:', tempFilePath);
              } catch (cleanupError) {
                console.error('[SignNow] Error limpiando archivo temporal:', cleanupError.message);
              }
            }
          }, 10 * 60 * 1000); // 10 minutos
        }

        // ✅ AQUÍ VA EL RETURN DE ÉXITO COMPLETO
        return res.status(200).json({
          success: true,
          message: '¡Gracias! Su aprobación ha sido registrada. Le hemos enviado un correo electrónico por separado para que firme formalmente el documento.',
        });

      } catch (signError) {
        console.error(`💥 === ERROR EN PROCESO COMPLETO ===`);
        console.error(`Error message: ${signError.message}`);
        console.error(`Stack trace: ${signError.stack}`);
        console.error(`================================`);
        
        console.error(`[CO Response] El CO #${coId} fue aprobado, pero falló el envío para firma: ${signError.message}`);
        
        // El CO ya está 'approved', pero la firma falló
        changeOrder.signatureStatus = 'not_sent';
        await changeOrder.save();
        
        // ✅ AQUÍ VA EL RETURN DE ÉXITO PARCIAL (CUANDO SIGNNOW FALLA)
        return res.status(200).json({
          success: true,
          message: 'Su aprobación ha sido registrada, pero hubo un problema al enviar el documento para la firma electrónica. Nuestro equipo lo revisará manualmente.',
        });
      }
    }

    // ✅ ESTE RETURN NUNCA DEBERÍA EJECUTARSE (POR SEGURIDAD)
    return res.status(400).json({
      success: false,
      message: 'Decisión no procesada correctamente.',
    });

  } catch (error) {
    // ✅ AQUÍ VA EL CATCH GENERAL DEL CONTROLADOR COMPLETO
    console.error('💥 Error completo en handleClientChangeOrderResponse:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error del servidor al procesar su solicitud.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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