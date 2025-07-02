const { Inspection, Work, Permit, Image, Budget } = require('../data'); // Asegúrate de importar Image
const { sendEmail } = require('../utils/notifications/emailService');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUploader');
const { sendNotifications } = require('../utils/notifications/notificationManager'); // Para notificaciones internas si es necesario
const { scheduleInitialMaintenanceVisits } = require('./MaintenanceController'); // <--- IMPORTANTE: AÑADIR ESTA LÍNEA
// --- INICIO: NUEVAS FUNCIONES PARA EL FLUJO DE INSPECCIÓN DETALLADO ---

/**
 * @description Inicia el proceso de inspección inicial para una obra.
 * Crea un registro de inspección, envía correo a inspectores con documentos.
 */
const requestInitialInspection = async (req, res) => {
  try {
    const { workId } = req.params;
    const { inspectorEmail, workImageId } = req.body;

    // ✅ VALIDACIONES mejoradas
    if (!inspectorEmail || !inspectorEmail.trim()) {
      return res.status(400).json({ 
        error: true, 
        message: 'El email del inspector es requerido y no puede estar vacío.' 
      });
    }

    if (!workImageId) {
      return res.status(400).json({ 
        error: true, 
        message: 'Debe seleccionar una imagen de la obra (workImageId es requerido).' 
      });
    }

    // ✅ CONVERTIR a string de forma segura
    const workImageIdString = String(workImageId).trim();
    if (!workImageIdString) {
      return res.status(400).json({ 
        error: true, 
        message: 'Debe seleccionar una imagen de la obra (workImageId no puede estar vacío).' 
      });
    }

    // ✅ VALIDAR formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inspectorEmail)) {
      return res.status(400).json({ 
        error: true, 
        message: 'El formato del email del inspector no es válido.' 
      });
    }

    const work = await Work.findByPk(workId, {
      include: [
        { model: Permit, attributes: ['idPermit', 'pdfData', 'optionalDocs', 'permitNumber','applicantEmail', 'applicantName'] },
        { model: Image, as: 'images', where: { id: workImageId }, limit: 1, required: false } // ✅ required: false para mejor manejo
      ]
    });

    if (!work) {
      return res.status(404).json({ 
        error: true, 
        message: 'Obra no encontrada. Verifique el ID de la obra.' 
      });
    }

    if (work.status !== 'installed') {
      return res.status(400).json({ 
        error: true, 
        message: `La obra debe estar en estado "installed" para solicitar inspección. Estado actual: "${work.status}"` 
      });
    }

    if (!work.Permit || !work.Permit.pdfData) {
      return res.status(400).json({ 
        error: true, 
        message: 'La obra no tiene un Permiso con PDF asociado. Es necesario para enviar a los inspectores.' 
      });
    }

    if (!work.images || work.images.length === 0) {
      return res.status(400).json({ 
        error: true, 
        message: `La imagen de obra especificada (ID: ${workImageId}) no fue encontrada. Seleccione una imagen válida.` 
      });
    }
    const workImage = work.images[0];


    // 1. Crear el registro de Inspección
    let inspection = await Inspection.create({
      workId,
      type: 'initial',
      processStatus: 'pending_request',
      notes: `Solicitud inicial para ${work.propertyAddress}. Email inspector: ${inspectorEmail}`,
    });

    // 2. Preparar y enviar correo a inspectores
    const attachments = [];
    if (work.Permit.pdfData) {
      attachments.push({
        filename: `Permit_${work.Permit.permitNumber || workId}.pdf`,
        content: Buffer.isBuffer(work.Permit.pdfData) ? work.Permit.pdfData : Buffer.from(work.Permit.pdfData, 'base64'),
        contentType: 'application/pdf'
      });
    }
    // Adjuntar optionalDocs igual de simple que pdfData
    if (work.Permit.optionalDocs) {
      if (Buffer.isBuffer(work.Permit.optionalDocs)) {
        attachments.push({
          filename: `OptionalDoc.pdf`,
          content: work.Permit.optionalDocs,
          contentType: 'application/pdf'
        });
      } else if (typeof work.Permit.optionalDocs === 'string') {
        attachments.push({
          filename: `OptionalDoc.pdf`,
          content: Buffer.from(work.Permit.optionalDocs, 'base64'),
          contentType: 'application/pdf'
        });
      } else if (Array.isArray(work.Permit.optionalDocs)) {
        work.Permit.optionalDocs.forEach((doc, idx) => {
          if (Buffer.isBuffer(doc)) {
            attachments.push({
              filename: `OptionalDoc_${idx + 1}.pdf`,
              content: doc,
              contentType: 'application/pdf'
            });
          } else if (typeof doc === 'string') {
            attachments.push({
              filename: `OptionalDoc_${idx + 1}.pdf`,
              content: Buffer.from(doc, 'base64'),
              contentType: 'application/pdf'
            });
          } else if (doc && doc.data) {
            attachments.push({
              filename: doc.filename || `OptionalDoc_${idx + 1}.pdf`,
              content: Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data, 'base64'),
              contentType: doc.contentType || 'application/pdf'
            });
          }
        });
      }
    }

    // Email en inglés para el inspector
    const emailSubject = `Solicitud de Inspección Inicial - Obra: ${work.propertyAddress}`;
    let emailText = `Dear Inspector,\n\nAttached you will find the documentation to request the initial inspection for the project located at ${work.propertyAddress}.\n\n- Permit No.: ${work.Permit.permitNumber || 'N/A'}\n- Project image.\n`;
    if (attachments.length > 1) {
      emailText += `- Additional documents are also attached.\n`;
    }
    emailText += `\nPlease let us know the scheduled date and any additional documents required.\n\nBest regards.`;

    await sendEmail({
      to: inspectorEmail,
      subject: emailSubject,
      text: emailText,
      html: `<p>${emailText.replace(/\n/g, '<br>')}</p><p>Project image: <a href="${workImage.imageUrl}">View Image</a></p>`,
      attachments,
    });

    // 3. Actualizar estados
    inspection.processStatus = 'requested_to_inspectors';
    inspection.dateRequestedToInspectors = new Date();
    await inspection.save();

    work.status = 'firstInspectionPending';
    await work.save();
    
    // Opcional: Enviar notificación interna de la app
     await sendNotifications('firstInspectionPending', work, req.app.get('io'));


    res.status(201).json({ 
        message: 'Solicitud de inspección inicial enviada y registrada.', 
        inspection,
        workStatus: work.status 
    });

  } catch (error) {
    console.error('Error en requestInitialInspection:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al solicitar inspección inicial.' });
  }
};

/**
 * @description Registra la respuesta de los inspectores (fecha programada y documento para el aplicante).
 */
const registerInspectorResponse = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { inspectorScheduledDate, notes } = req.body; // Fecha programada, notas
    
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se proporcionó el documento para el aplicante.' });
    }

    const inspection = await Inspection.findByPk(inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    if (inspection.processStatus !== 'requested_to_inspectors') {
        return res.status(400).json({ error: true, message: `Estado de proceso de inspección inválido (${inspection.processStatus}). Se esperaba 'requested_to_inspectors'.` });
    }

    // Subir documento para el aplicante a Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `inspections/${inspection.workId}/${inspection.idInspection}/applicant_docs`,
      resource_type: 'raw', // O 'raw' si es un PDF que no quieres que Cloudinary procese como imagen
      public_id: req.file.originalname.split('.')[0] + '_' + Date.now()
    });

    inspection.inspectorScheduledDate = inspectorScheduledDate || null;
    inspection.documentForApplicantUrl = cloudinaryResult.secure_url;
    inspection.documentForApplicantPublicId = cloudinaryResult.public_id;
    inspection.processStatus = 'schedule_received';
    inspection.notes = notes ? `${inspection.notes || ''}\nRespuesta Inspector: ${notes}`.trim() : inspection.notes;
    await inspection.save();

    res.status(200).json({ message: 'Respuesta de inspectores registrada.', inspection });

  } catch (error) {
    console.error('Error en registerInspectorResponse:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al registrar respuesta de inspectores.' });
  }
};

/**
 * @description Envía el documento (recibido de inspectores) al aplicante para firma.
 */
const sendDocumentToApplicant = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { applicantEmail, applicantName } = req.body; // Email y nombre del aplicante

    if (!applicantEmail) {
      return res.status(400).json({ error: true, message: 'Falta el email del aplicante.' });
    }

    const inspection = await Inspection.findByPk(inspectionId, { include: [{ model: Work, attributes: ['propertyAddress'] }] });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    if (inspection.processStatus !== 'schedule_received' || !inspection.documentForApplicantUrl) {
      return res.status(400).json({ error: true, message: 'La inspección no está en estado "schedule_received" o falta el documento para el aplicante.' });
    }

    const emailSubject = `Documento para Firma - Inspección Obra: ${inspection.Work.propertyAddress}`;
    const emailText = `Estimado/a ${applicantName || 'Cliente'},\n\nAdjunto encontrará un documento que requiere su firma como parte del proceso de inspección para la obra en ${inspection.Work.propertyAddress}.\n\nPor favor, revíselo, fírmelo y envíelo de vuelta a la brevedad.\n\nSaludos cordiales.`;
    
    await sendEmail({
      to: applicantEmail,
      subject: emailSubject,
      text: emailText,
      html: `<p>${emailText.replace(/\n/g, '<br>')}</p>`,
      attachments: [{
        filename: `Documento_Inspeccion_${inspection.Work.propertyAddress.replace(/\s+/g, '_')}.pdf`, // Asume PDF, ajusta si es necesario
        path: inspection.documentForApplicantUrl, // Nodemailer puede descargar desde URL
      }],
    });

    inspection.processStatus = 'applicant_document_pending';
    inspection.dateDocumentSentToApplicant = new Date();
    await inspection.save();

    res.status(200).json({ message: 'Documento enviado al aplicante.', inspection });

  } catch (error) {
    console.error('Error en sendDocumentToApplicant:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al enviar documento al aplicante.' });
  }
};

/**
 * @description Registra la recepción del documento firmado por el aplicante.
 */
const registerSignedApplicantDocument = async (req, res) => {
   try {
    const { inspectionId } = req.params;
    const { notes } = req.body; // Asumo que 'notes' viene del body si quieres añadir más notas aquí

    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se proporcionó el documento firmado.' });
    }

    // --- ASEGÚRATE DE QUE ESTA SECCIÓN ESTÉ ASÍ ---
    const inspection = await Inspection.findByPk(inspectionId, {
      include: [
        {
          model: Work,
          as: 'Work', // Verifica que 'Work' sea el alias correcto en tu modelo Inspection
          include: [
            {
              model: Permit,
              as: 'Permit' // Verifica que 'Permit' sea el alias correcto en tu modelo Work
            }
          ]
        }
      ]
    });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
     if (inspection.processStatus !== 'applicant_document_pending') {
        return res.status(400).json({ error: true, message: `Estado de proceso de inspección inválido (${inspection.processStatus}). Se esperaba 'applicant_document_pending'.` });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `inspections/${inspection.workId}/${inspection.idInspection}/applicant_signed_docs`,
      resource_type: 'raw',
      public_id: `signed_${req.file.originalname.split('.')[0]}_${Date.now()}`
    });

    inspection.signedDocumentFromApplicantUrl = cloudinaryResult.secure_url;
    inspection.signedDocumentFromApplicantPublicId = cloudinaryResult.public_id;
    inspection.dateSignedDocumentReceived = new Date();
    inspection.processStatus = 'applicant_document_received'; // O 'inspection_completed_pending_result' si este es el último paso antes del resultado
    inspection.notes = notes ? `${inspection.notes || ''}\nDoc Firmado Aplicante: ${notes}`.trim() : inspection.notes;
    await inspection.save();

  if (inspection.signedDocumentFromApplicantUrl && inspection.processStatus === 'applicant_document_received') {
    const workDetails = inspection.Work; 
    let inspectorEmail = null;

    if (inspection.notes) {
      const emailMatch = inspection.notes.match(/(?:Email inspector:|Inspector:)\s*([\w@.-]+)/i);
      if (emailMatch && emailMatch[1]) {
        inspectorEmail = emailMatch[1];
      }
    }

    if (inspectorEmail && workDetails) {
      const mailSubject = `Documento Firmado por Aplicante Recibido - Obra: ${workDetails.propertyAddress}`;
      const permitNumberText = workDetails.Permit ? workDetails.Permit.permitNumber : 'N/A';
      
      // ESTA ES LA PARTE CLAVE PARA EL ENLACE DEL DOCUMENTO
      const mailText = `Estimado Inspector,\n\nSe ha recibido el documento firmado por el aplicante para la inspección relacionada con la obra ubicada en ${workDetails.propertyAddress} (Permit N°: ${permitNumberText}).\n\nPuede ver el documento firmado aquí: ${inspection.signedDocumentFromApplicantUrl}\n\nSaludos,\nEl Sistema de Zurcher Construction`;
      const mailHtml = `<p>Estimado Inspector,</p><p>Se ha recibido el documento firmado por el aplicante para la inspección relacionada con la obra ubicada en <strong>${workDetails.propertyAddress}</strong> (Permit N°: <strong>${permitNumberText}</strong>).</p><p>Puede ver el documento firmado haciendo clic en el siguiente enlace: <a href="${inspection.signedDocumentFromApplicantUrl}" target="_blank">Ver Documento Firmado</a></p><p>Saludos,<br>El Sistema de Zurcher Construction</p>`;
     
      const attachments = [];
      if (inspection.signedDocumentFromApplicantUrl) {
        // Extraer un nombre de archivo razonable de la URL o usar uno genérico
        let signedDocFilename = 'Documento_Firmado_Aplicante.pdf';
        try {
            // Intentar obtener el nombre del archivo original si lo guardaste en la inspección
            // o construirlo a partir de la URL si es posible.
            // Por ahora, un nombre genérico con la dirección de la obra.
            signedDocFilename = `Doc_Firmado_${workDetails.propertyAddress.replace(/\s+/g, '_')}.pdf`;
        } catch (e) { /* Usar el nombre por defecto */ }

        attachments.push({
          filename: signedDocFilename,
          path: inspection.signedDocumentFromApplicantUrl, // Nodemailer descargará desde esta URL
          // contentType: 'application/pdf' // Opcional, Nodemailer usualmente lo infiere bien
        });
      }

       await sendEmail({
        to: inspectorEmail,
        subject: mailSubject,
        text: mailText,
        html: mailHtml,
        attachments: attachments, // <--- USAR LOS ATTACHMENTS
      });
      console.log(`API_INFO: Correo con documento firmado (URL: ${inspection.signedDocumentFromApplicantUrl}) enviado al inspector ${inspectorEmail} para la inspección ${inspection.idInspection}`);
    } else {
      console.warn(`API_WARN: No se pudo enviar correo al inspector para la inspección ${inspection.idInspection}. Email del inspector no encontrado (${inspectorEmail}) o detalles de la obra faltantes (workDetails: ${workDetails ? 'presente' : 'ausente'}).`);
    }
  }
  // --- FIN NUEVO ---

  res.status(200).json({
    message: 'Documento firmado por el aplicante registrado exitosamente.',
    inspection,
  });
  } catch (error) {
    console.error('Error en registerSignedApplicantDocument:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al registrar documento firmado.' });
  }
};

/**
 * @description Registra el resultado final de la inspección (aprobada/rechazada).
 */
const registerInspectionResult = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { finalStatus, dateInspectionPerformed, notes } = req.body;

    if (!finalStatus || (finalStatus !== 'approved' && finalStatus !== 'rejected')) {
      return res.status(400).json({ error: true, message: 'El estado final (finalStatus) es inválido o no fue proporcionado.' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: true, message: 'No se proporcionaron documentos/capturas del resultado.' });
    }

    const inspection = await Inspection.findByPk(inspectionId, { include: [Work] });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }

     // Validar que la inspección esté en el estado correcto para recibir un resultado
    const expectedStatuses = [
      'applicant_document_received', 
        'inspection_completed_pending_result', // Para inspecciones iniciales
        'final_payment_notified_to_inspector'  // Para inspecciones finales
    ];
    if (!expectedStatuses.includes(inspection.processStatus)) {
        return res.status(400).json({ 
            error: true, 
            message: `Estado de proceso de inspección inválido (${inspection.processStatus}). Se esperaba uno de: ${expectedStatuses.join(', ')}.` 
        });
    }



    const work = inspection.Work;
    if (!work) {
        return res.status(404).json({ error: true, message: 'Obra asociada a la inspección no encontrada.' });
    }

  
    const uploadedFilesInfo = [];
    let fileNotes = '';

    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const resourceType = file.mimetype && file.mimetype.startsWith('image/') ? 'image' : 'raw';
          const originalNameWithoutExt = file.originalname.split('.').slice(0, -1).join('.');
          const publicIdSuffix = originalNameWithoutExt || `file_${Date.now()}`;

          const cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
            folder: `inspections/${inspection.workId}/${inspection.idInspection}/results`,
            resource_type: resourceType, 
            public_id: `result_${finalStatus}_${publicIdSuffix}_${Date.now()}`
          });
          uploadedFilesInfo.push({
            url: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            originalName: file.originalname,
            mimetype: file.mimetype
          });
        }
        let primaryFile = uploadedFilesInfo.find(f => f.mimetype === 'application/pdf');
        if (!primaryFile && uploadedFilesInfo.length > 0) primaryFile = uploadedFilesInfo[0];
        if (primaryFile) {
          inspection.resultDocumentUrl = primaryFile.url;
          inspection.resultDocumentPublicId = primaryFile.publicId;
        }
        fileNotes = 'Archivos de resultado adjuntos:\n';
        uploadedFilesInfo.forEach(f => { fileNotes += `- ${f.originalName} (${f.url})\n`; });
    }
    

   inspection.dateInspectionPerformed = dateInspectionPerformed || new Date();
    inspection.dateResultReceived = new Date();
    inspection.finalStatus = finalStatus; // 'approved' o 'rejected'
    
    // Determinar processStatus basado en el tipo y resultado
    if (inspection.type === 'initial') {
        inspection.processStatus = finalStatus === 'approved' ? 'result_approved' : 'result_rejected';
    } else if (inspection.type === 'final') {
        // Usar los nuevos estados finales específicos si los creaste, o los genéricos
        inspection.processStatus = finalStatus === 'approved' ? 'result_approved' : 'result_rejected'; 
        // O por ejemplo: 'final_result_approved', 'final_result_rejected' si los definiste en el ENUM
    }
    
    inspection.notes = `${notes || ''}\n${fileNotes}`.trim();
    
    if (finalStatus === 'rejected') {
        inspection.workerHasCorrected = false; 
        inspection.dateWorkerCorrected = null;
    }
    await inspection.save();


     // Actualizar Work.status
  // Actualizar Work.status
    if (finalStatus === 'approved') {
      if (inspection.type === 'initial') {
        work.status = 'approvedInspection'; 
        // ... (notificaciones) ...
      } else if (inspection.type === 'final') {
        const oldWorkStatus = work.status; // Asegúrate que esto esté antes de cambiar work.status
        work.status = 'maintenance'; 
        
        if (oldWorkStatus !== 'maintenance') { 
            work.maintenanceStartDate = new Date();
            console.log(`[InspectionController - registerResult] Work ${work.idWork} status will be 'maintenance'. SETTING MaintenanceStartDate TO: ${work.maintenanceStartDate}`);
        } else if (!work.maintenanceStartDate) { 
            work.maintenanceStartDate = new Date();
            console.log(`[InspectionController - registerResult] Work ${work.idWork} IS 'maintenance' and maintenanceStartDate was NULL. SETTING MaintenanceStartDate TO: ${work.maintenanceStartDate}`);
        }
        
        // --- GUARDAR WORK ANTES DE PROGRAMAR VISITAS ---
        await work.save(); 
        console.log(`[InspectionController - registerResult] Work ${work.idWork} saved with status: ${work.status} and maintenanceStartDate: ${work.maintenanceStartDate}`);
        // --- FIN GUARDAR WORK ---

        // Ahora llamar a programar visitas, si es necesario
        if (oldWorkStatus !== 'maintenance') { // Usar oldWorkStatus para decidir si programar
            try {
                console.log(`[InspectionController - registerResult] ATTEMPTING to call scheduleInitialMaintenanceVisits for work ${work.idWork}`);
                await scheduleInitialMaintenanceVisits(work.idWork); // Ahora leerá los datos actualizados de la BD
                console.log(`[InspectionController - registerResult] SUCCESSFULLY CALLED scheduleInitialMaintenanceVisits for work ${work.idWork}`);
            } catch (scheduleError) {
                console.error(`[InspectionController - registerResult] ERROR CALLING scheduleInitialMaintenanceVisits for work ${work.idWork}:`, scheduleError);
            }
        }
        // <--- CAMBIO IMPORTANTE AQUÍ
        await sendNotifications('final_inspection_approved_maintenance', work, req.app.get('io'), { inspectionId: inspection.idInspection });
      }
    } else if (finalStatus === 'rejected') {
      if (inspection.type === 'initial') {
        work.status = 'rejectedInspection';
        await sendNotifications('initial_inspection_rejected', work, req.app.get('io'), { inspectionId: inspection.idInspection, notes: inspection.notes });
      } else if (inspection.type === 'final') {
        work.status = 'finalRejected'; // Esto ya lo tenías
        await sendNotifications('final_inspection_rejected', work, req.app.get('io'), { inspectionId: inspection.idInspection, notes: inspection.notes });
      }
    }
    await work.save();

    res.status(200).json({
      message: `Resultado de inspección (${finalStatus}) registrado.`,
      inspection,
      workStatus: work.status
    });

  } catch (error) {
    console.error('Error en registerInspectionResult:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al registrar resultado de inspección.' });
  }
};
// NUEVO CONTROLADOR:
const markCorrectionByWorker = async (req, res, next) => {
  try {
    const { inspectionId } = req.params;
    const { correctionNotes } = req.body;

    const inspection = await Inspection.findByPk(inspectionId, { include: [Work] });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Inspección no encontrada.' });
    }
    if (inspection.finalStatus !== 'rejected') {
      return res.status(400).json({ error: true, message: 'Esta inspección no está marcada como rechazada.' });
    }

    const work = inspection.Work;
    if (!work || (work.status !== 'rejectedInspection' && work.status !== 'finalRejected')) {
      return res.status(400).json({ error: true, message: `La obra asociada no está en estado 'rejectedInspection' o 'finalRejected'. Estado actual: ${work?.status}` });
    }

    inspection.workerHasCorrected = true;
    inspection.dateWorkerCorrected = new Date();
    if (correctionNotes) {
      inspection.notes = `${inspection.notes || ''}\nNota Corrección Empleado: ${correctionNotes}`.trim();
    }
    await inspection.save();

    if (work) {
      // Notificar a la oficina que las correcciones están listas
      const notificationType = work.status === 'rejectedInspection' ? 'initial_correction_ready' : 'final_correction_ready';
      await sendNotifications(notificationType, work, req.app.get('io'), { inspectionId: inspection.idInspection });
    }

    res.status(200).json({ message: 'Corrección marcada por el empleado.', inspection });
  } catch (error) {
    console.error('Error en markCorrectionByWorker:', error);
    next(error); // O res.status(500).json(...)
  }
};

// --- FIN: NUEVAS FUNCIONES ---
const requestReinspection = async (req, res, next) => {
  try {
    const { workId } = req.params;
    const { inspectorEmail, notes, originalInspectionId, workImageId } = req.body; // workImageId es opcional para reinspección
    //const reinspectionFile = req.file; 
  const filesUploaded = req.files; // req.files es un array cuando usas upload.array()
    let reinspectionFile = null; // Tomaremos el primer archivo de 'attachments' para este ejemplo
    if (filesUploaded && filesUploaded.length > 0) {
        // Si el fieldname es 'attachments', toma el primer archivo de ese campo.
        // Si tienes múltiples campos de archivo en el mismo form, necesitarías filtrar por fieldname.
        // Asumiendo que 'attachments' es el único campo de archivo para esta acción.
        reinspectionFile = filesUploaded[0]; 
    }
    if (!inspectorEmail) {
      return res.status(400).json({ error: true, message: 'Falta el email del inspector.' });
    }

    const work = await Work.findByPk(workId, {
      include: [
          { model: Permit, attributes: ['permitNumber', 'pdfData'] },
          // Solo incluir la imagen si se proporciona workImageId y es relevante para la reinspección
          ...(workImageId ? [{ model: Image, as: 'images', where: { id: workImageId }, limit: 1, required: false }] : [])
      ]
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }

    let newInspectionType;
    let previousInspectionTypeForNotification = '';

    if (work.status === 'rejectedInspection') {
      newInspectionType = 'initial';
      previousInspectionTypeForNotification = 'Inicial';
    } else if (work.status === 'finalRejected') {
      newInspectionType = 'final';
      previousInspectionTypeForNotification = 'Final';
    } else {
      return res.status(400).json({ error: true, message: `La obra no está en un estado que permita reinspección ('rejectedInspection' o 'finalRejected'). Estado actual: ${work.status}` });
    }
    
    if (originalInspectionId && newInspectionType === 'initial') { // Solo verificar para reinspección inicial
        const originalInsp = await Inspection.findByPk(originalInspectionId);
        if (originalInsp && !originalInsp.workerHasCorrected) {
            return res.status(400).json({ error: true, message: 'Para reinspecciones iniciales, las correcciones para la inspección original rechazada deben ser marcadas por el empleado.' });
        }
    }
    // 1. Crear el NUEVO registro de Inspección para la reinspección
    const reinspection = await Inspection.create({ // <--- Creación de la reinspección
      workId,
      type: newInspectionType, // 'initial' o 'final'
      // --- ESTA ES LA LÍNEA CRUCIAL ---
      processStatus: 'inspection_completed_pending_result', // Directo a esperar resultado
      // --- FIN ---
      originalInspectionId: originalInspectionId || null,
      notes: `Solicitud de REINSPECCIÓN (${previousInspectionTypeForNotification}) para ${work.propertyAddress}. Inspector: ${inspectorEmail}. ${notes ? `Notas: ${notes}` : ''}${originalInspectionId ? ` (Reinspección de: ${originalInspectionId})` : ''}`,
      dateRequestedToInspectors: new Date(), // Se solicita y se asume lista para resultado
      // workerHasCorrected será false por defecto para esta nueva inspección
    });

 // 2. Preparar y enviar correo simple a inspectores
    const emailSubject = `Solicitud de REINSPECCIÓN (${previousInspectionTypeForNotification}) - Obra: ${work.propertyAddress}`; // 'const' está bien aquí
    let emailText = `Estimados Inspectores,\n\nSe solicita una REINSPECCIÓN (${previousInspectionTypeForNotification}) para la obra ubicada en ${work.propertyAddress} (Permit N°: ${work.Permit?.permitNumber || 'N/A'}).\nLas correcciones necesarias han sido realizadas por el personal de campo.\n\nPor favor, procedan a programar la visita e informar el resultado.\n\nSaludos cordiales.`; // 'let' es correcto
    
    // Asegúrate de que emailHtml se inicialice aquí con 'let'
    let emailHtml = `<p>${emailText.replace(/\n/g, '<br>')}</p>`; 

     const attachmentsForEmail = []; // Renombrado para evitar confusión con el fieldname 'attachments'
    if (work.Permit && work.Permit.pdfData) {
        attachmentsForEmail.push({
            filename: `Permit_${work.Permit.permitNumber || workId}.pdf`,
            content: Buffer.isBuffer(work.Permit.pdfData) ? work.Permit.pdfData : Buffer.from(work.Permit.pdfData, 'base64'),
            contentType: 'application/pdf'
        });
    }

    // Añadir enlace a la imagen si se proporcionó workImageId y la imagen existe
    if (workImageId && work.images && work.images.length > 0) {
        const workImage = work.images[0];
        if (workImage && workImage.imageUrl) {
            const imageLinkText = `\n\nImagen de referencia actualizada: Ver Imagen`;
            const imageLinkHtmlContent = `<p>Imagen de referencia actualizada: <a href="${workImage.imageUrl}">Ver Imagen</a></p>`; // Renombré para evitar confusión con la variable emailHtml
            emailText += imageLinkText;
            emailHtml += imageLinkHtmlContent; // Ahora esto debería funcionar
        }
    }

       if (reinspectionFile) { // Ahora reinspectionFile se refiere al archivo de req.files[0]
        try {
          console.log("API_INFO: Procesando archivo de reinspección para subida:", {
            originalname: reinspectionFile.originalname,
            mimetype: reinspectionFile.mimetype,
            size: reinspectionFile.size
          });

          const resourceType = reinspectionFile.mimetype.startsWith('video/') ? 'video' : (reinspectionFile.mimetype.startsWith('image/') ? 'image' : 'raw');
          const originalNameBase = reinspectionFile.originalname.substring(0, reinspectionFile.originalname.lastIndexOf('.')) || reinspectionFile.originalname;
          
          const publicId = `reinspections/${workId}/${reinspection.idInspection}/${originalNameBase}_${Date.now()}`;

          const cloudinaryResult = await uploadBufferToCloudinary(
            reinspectionFile.buffer,
            {
              folder: `reinspections/${workId}/${reinspection.idInspection}`, // Cloudinary antepone esto si public_id no es una ruta completa
              public_id: `${originalNameBase}_${Date.now()}`, // Solo el nombre del archivo, Cloudinary lo pone en la carpeta
              resource_type: resourceType,
              // original_filename: reinspectionFile.originalname, // Opcional, Cloudinary lo puede inferir
            }
          );
          
          console.log("API_INFO: Cloudinary upload result:", cloudinaryResult);

          // Guardar la info en el registro de la reinspección
          reinspection.reinspectionExtraDocumentUrl = cloudinaryResult.secure_url;
          reinspection.reinspectionExtraDocumentPublicId = cloudinaryResult.public_id;
          reinspection.reinspectionExtraDocumentOriginalName = reinspectionFile.originalname;
          // await reinspection.save(); // Guardar estos campos en la BD

          const suggestedDownloadFileName = reinspectionFile.originalname.replace(/^~\$/, '');
          
          attachmentsForEmail.push({ // Añadir al array de adjuntos del correo
            filename: suggestedDownloadFileName,
            path: cloudinaryResult.secure_url, 
          });

          const extraDocLinkText = `\n\nArchivo adjunto a esta solicitud de reinspección: Ver Documento (${reinspectionFile.originalname})`;
          const extraDocLinkHtml = `<p>Archivo adjunto a esta solicitud de reinspección: <a href="${cloudinaryResult.secure_url}" target="_blank" download="${suggestedDownloadFileName}">${reinspectionFile.originalname}</a></p>`;
          emailText += extraDocLinkText;
          emailHtml += extraDocLinkHtml;
          console.log("API_INFO: Enlace y adjunto para documento extra añadido al correo. URL:", cloudinaryResult.secure_url);

        } catch (uploadError) {
          console.error('Error al subir documento de reinspección a Cloudinary:', uploadError);
          // Considera cómo manejar este error, ¿debería fallar toda la solicitud?
          // Por ahora, solo se loguea y el correo se envía sin este adjunto.
        }
    }

    await sendEmail({
      to: inspectorEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml, // Usar el HTML con el enlace
      attachments: attachmentsForEmail,
    });

    // 3. Actualizar estado de la obra (la inspección ya se creó con el processStatus correcto)
    if (newInspectionType === 'initial') {
      work.status = 'firstInspectionPending'; // O un estado como 'reinspectionPending'
    } else if (newInspectionType === 'final') {
      work.status = 'finalInspectionPending'; // O un estado como 'reinspectionFinalPending'
    }
    await work.save();
    
    await sendNotifications(newInspectionType === 'initial' ? 'reinspection_initial_requested' : 'reinspection_final_requested', work, req.app.get('io'), { inspectionId: reinspection.idInspection });
 // ---- LOG CRÍTICO QUE DEBERÍAS TENER AQUÍ ----
 console.log("BACKEND - Enviando respuesta para requestReinspection. Reinspección:", JSON.stringify(reinspection, null, 2));
 // ---- FIN LOG CRÍTICO ----
    res.status(201).json({
      message: `Solicitud de reinspección (${previousInspectionTypeForNotification}) enviada y registrada. Lista para recibir resultado.`,
      inspection: reinspection,
      workStatus: work.status
    });

  } catch (error) {
    console.error('Error en requestReinspection:', error);
    if (next && typeof next === 'function') {
      next(error);
    } else {
      res.status(500).json({ error: true, message: 'Error interno del servidor al solicitar reinspección.' });
    }
  }
};

// Obtener todas las inspecciones para una obra específica
const getInspectionsByWork = async (req, res) => {
  try {
    const { workId } = req.params;
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }
    const inspections = await Inspection.findAll({
      where: { workId },
      include: [ // <--- AÑADIR ESTOS INCLUDES
          {
              model: Work,
              as: 'Work', // Asegúrate que este alias coincida con tu definición de modelo
              attributes: ['idWork', 'propertyAddress', 'status'], // Incluye los atributos de Work que necesites
              include: [
                  {
                      model: Permit,
                      as: 'Permit', // Asegúrate que este alias coincida con tu definición de modelo Work-Permit
                      attributes: ['idPermit', 'applicantEmail', 'permitNumber'] // Incluye applicantEmail y otros que necesites
                  },
                  {
                      model: Budget, // Asegúrate que Budget esté importado
                      as: 'budget', // Asegúrate que este alias coincida con tu definición de modelo Work-Budget
                      attributes: ['idBudget', 'applicantName'] // Incluye applicantName y otros que necesites
                  }
              ]
          }
      ],
      order: [['createdAt', 'DESC']]
  });
    res.status(200).json(inspections);
  } catch (error) {
    console.error('Error al obtener inspecciones por obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener una inspección específica por su ID
const getInspectionById = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const inspection = await Inspection.findByPk(inspectionId, {
        include: [{model: Work, attributes: ['idWork', 'propertyAddress', 'status']}] // Incluir info básica de la obra
    });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Inspección no encontrada' });
    }
    res.status(200).json(inspection);
  } catch (error) {
    console.error('Error al obtener la inspección:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const requestFinalInspection = async (req, res) => {
  try {
    const { workId } = req.params;
    // inspectorEmail puede venir del body o podrías tenerlo configurado de otra forma
    const { inspectorEmail, notes, applicantEmail, applicantName } = req.body; 
    const files = req.files; // Para múltiples archivos: req.files (configura multer para 'any' o campos específicos)
                               // Para un solo archivo: req.file

    if (!inspectorEmail) {
      return res.status(400).json({ error: true, message: 'Falta el email del inspector.' });
    }
    if (!applicantEmail || !applicantName) {
        return res.status(400).json({ error: true, message: 'Faltan datos del aplicante (email, nombre) para notificaciones.' });
    }

    const work = await Work.findByPk(workId, {
        include: [{ model: Permit, attributes: ['permitNumber'] }]
    });
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }
    // Validar que la obra esté en un estado apropiado para solicitar inspección final
    // Por ejemplo, después de 'approvedInspection' (inspección inicial aprobada) o 'coverApproved'
    // Ajusta esta lógica según tus estados de obra exactos
    if (!['approvedInspection', 'finalRejected', 'paymentReceived', 'covered'].includes(work.status) ) { // Añade otros estados si aplica
         return res.status(400).json({ error: true, message: `La obra no está en un estado válido para solicitar inspección final. Estado actual: ${work.status}` });
    }


    // 1. Crear el registro de Inspección Final
    const inspection = await Inspection.create({
      workId,
      type: 'final',
      processStatus: 'pending_final_request',
      notes: `Solicitud de Inspección Final para ${work.propertyAddress}. Inspector: ${inspectorEmail}. ${notes ? `Notas: ${notes}` : ''}`,
    });

    // 2. Subir archivos adjuntos a Cloudinary (si los hay)
    const uploadedAttachmentsInfo = [];
    const emailAttachments = [];

    if (files && files.length > 0) {
        for (const file of files) {
            const resourceType = file.mimetype.startsWith('image/') ? 'image' : (file.mimetype.startsWith('video/') ? 'video' : 'raw');
            const uploadResult = await uploadBufferToCloudinary(file.buffer, {
                folder: `inspections/${workId}/${inspection.idInspection}/final_request_attachments`,
                resource_type: resourceType,
                public_id: `${file.originalname.split('.')[0]}_${Date.now()}`
            });
            uploadedAttachmentsInfo.push({
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                originalName: file.originalname,
                mimetype: file.mimetype
            });
            emailAttachments.push({
                filename: file.originalname,
                path: uploadResult.secure_url, // Nodemailer puede usar la URL para adjuntar
            });
        }
        inspection.notes += `\nArchivos adjuntos a la solicitud: ${uploadedAttachmentsInfo.map(f => `${f.originalName} (${f.url})`).join(', ')}`;
    }


    // 3. Preparar y enviar correo a inspectores
    const emailSubject = `Solicitud de Inspección Final - Obra: ${work.propertyAddress}`;
    let emailText = `Estimado Inspector,\n\nSe solicita la Inspección Final para la obra ubicada en ${work.propertyAddress} (Permit N°: ${work.Permit?.permitNumber || 'N/A'}).`;
    if (notes) emailText += `\n\nNotas adicionales:\n${notes}`;
    emailText += `\n\nPor favor, envíenos el invoice correspondiente para proceder con el pago.\n\nSaludos cordiales.`;
    
    let emailHtml = `<p>${emailText.replace(/\n/g, '<br>')}</p>`;
    if (uploadedAttachmentsInfo.length > 0) {
        emailHtml += `<p><strong>Archivos Adjuntos:</strong></p><ul>`;
        uploadedAttachmentsInfo.forEach(att => {
            emailHtml += `<li><a href="${att.url}" target="_blank">${att.originalName}</a></li>`;
        });
        emailHtml += `</ul>`;
    }

    await sendEmail({
      to: inspectorEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      attachments: emailAttachments, // Nodemailer puede tomar 'path' como URL
    });

    // 4. Actualizar estados
    inspection.processStatus = 'final_requested_to_inspector';
    inspection.dateRequestedToInspectors = new Date(); // Reutilizamos este campo
    await inspection.save();

    work.status = 'finalInspectionPending'; // Nuevo estado de obra
    await work.save();
    
    await sendNotifications('final_inspection_requested', work, req.app.get('io'), { inspectionId: inspection.idInspection, applicantEmail });

    res.status(201).json({ 
        message: 'Solicitud de inspección final enviada y registrada. Esperando invoice del inspector.', 
        inspection,
        workStatus: work.status 
    });

  } catch (error) {
    console.error('Error en requestFinalInspection:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al solicitar inspección final.' });
  }
};

/**
 * @description Inspectores responden con el invoice. Se registra y se guarda el invoice.
 */
const registerInspectorInvoiceForFinal = async (req, res) => {

  try {
    const { inspectionId } = req.params;
    const { notes } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se proporcionó el archivo del invoice.' });
    }

    const inspection = await Inspection.findByPk(inspectionId, { include: [Work] });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    if (inspection.type !== 'final' || inspection.processStatus !== 'final_requested_to_inspector') {
        return res.status(400).json({ error: true, message: `Estado de proceso de inspección inválido (${inspection.processStatus}). Se esperaba 'final_requested_to_inspector'.` });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `inspections/${inspection.workId}/${inspection.idInspection}/final_invoices`,
      resource_type: 'raw', // Para PDFs o documentos
      public_id: `invoice_${req.file.originalname.split('.')[0]}_${Date.now()}`
    });

    inspection.invoiceFromInspectorUrl = cloudinaryResult.secure_url;
    inspection.invoiceFromInspectorPublicId = cloudinaryResult.public_id;
    inspection.processStatus = 'final_invoice_received';
    if (notes) inspection.notes = `${inspection.notes || ''}\nInvoice Recibido: ${notes}`.trim();
    await inspection.save();
    
    // Notificar internamente que el invoice está listo para ser enviado al cliente
    await sendNotifications('final_invoice_received', inspection.Work, req.app.get('io'), { inspectionId: inspection.idInspection, invoiceUrl: inspection.invoiceFromInspectorUrl });


    res.status(200).json({ message: 'Invoice del inspector registrado. Listo para enviar al cliente.', inspection });

  } catch (error) {
    console.error('Error en registerInspectorInvoiceForFinal:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al registrar invoice.' });
  }
};

/**
 * @description Se reenvía el invoice (recibido de inspectores) al cliente.
 */
const sendInvoiceToClientForFinal = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    // El email del cliente podría venir del body, o mejor, obtenerlo de la Obra o Permiso asociado.
    const { clientEmail, clientName } // Asumimos que estos datos se obtienen de alguna manera (e.g., req.body o consulta)
                         = req.body; // O buscar en Work.Permit.applicantEmail / Work.Budget.applicantName

    if (!clientEmail) { // Validar clientName también si es mandatorio
      return res.status(400).json({ error: true, message: 'Falta el email del cliente.' });
    }

    const inspection = await Inspection.findByPk(inspectionId, { 
        include: [{ 
            model: Work, 
            attributes: ['propertyAddress', 'idWork'],
            include: [
                { model: Permit, attributes: ['applicantEmail', 'applicantName'] }, // Para obtener email/nombre si no viene en body
            ]
        }] 
    });

    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    if (inspection.type !== 'final' || inspection.processStatus !== 'final_invoice_received' || !inspection.invoiceFromInspectorUrl) {
      return res.status(400).json({ error: true, message: 'La inspección no está en estado "final_invoice_received" o falta el invoice del inspector.' });
    }
    
    const finalClientEmail = clientEmail || inspection.Work?.Permit?.applicantEmail;
    const finalClientName = clientName || inspection.Work?.Permit?.applicantName || inspection.Work?.Budget?.applicantName || 'Cliente';

    if (!finalClientEmail) {
        return res.status(400).json({ error: true, message: 'No se pudo determinar el email del cliente.' });
    }

    const emailSubject = `Invoice para Inspección Final - Obra: ${inspection.Work.propertyAddress}`;
    const emailText = `Estimado/a ${finalClientName},\n\nAdjunto encontrará el invoice correspondiente a la Inspección Final para la obra en ${inspection.Work.propertyAddress}.\n\nPor favor, realice el abono y notifíquenos para proceder.\n\nSaludos cordiales.`;
    
    await sendEmail({
      to: finalClientEmail,
      subject: emailSubject,
      text: emailText,
      html: `<p>${emailText.replace(/\n/g, '<br>')}</p>`,
      attachments: [{
        filename: `Invoice_Inspeccion_Final_${inspection.Work.propertyAddress.replace(/\s+/g, '_')}.pdf`, // Asume PDF
        path: inspection.invoiceFromInspectorUrl, 
      }],
    });

    inspection.processStatus = 'final_invoice_sent_to_client';
    inspection.dateInvoiceSentToClient = new Date();
    await inspection.save();

    await sendNotifications('final_invoice_sent_to_client', inspection.Work, req.app.get('io'), { inspectionId: inspection.idInspection, clientEmail: finalClientEmail });

    res.status(200).json({ message: 'Invoice enviado al cliente. Esperando confirmación de pago.', inspection });

  } catch (error) {
    console.error('Error en sendInvoiceToClientForFinal:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al enviar invoice al cliente.' });
  }
};

// Registra el pago directo del invoice (sin enviar al cliente)
const confirmDirectPaymentForFinal = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Debes subir el comprobante de pago.' });
    }

    const inspection = await Inspection.findByPk(inspectionId);
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Inspección no encontrada.' });
    }
    if (inspection.processStatus !== 'final_invoice_received') {
      return res.status(400).json({ error: true, message: 'La inspección no está esperando confirmación de pago.' });
    }

    // Subir comprobante a Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `inspections/${inspection.workId}/${inspection.idInspection}/direct_payment_proofs`,
      resource_type: 'raw',
      public_id: `direct_payment_${req.file.originalname.split('.')[0]}_${Date.now()}`
    });

    inspection.clientPaymentProofUrl = cloudinaryResult.secure_url;
    inspection.clientPaymentProofPublicId = cloudinaryResult.public_id;
    inspection.datePaymentConfirmedByClient = new Date();
    inspection.processStatus = 'final_payment_confirmed';
    inspection.notes = notes ? `${inspection.notes || ''}\nPago directo registrado: ${notes}`.trim() : inspection.notes;
    await inspection.save();

    res.status(200).json({ message: 'Pago directo registrado correctamente.', inspection });
  } catch (error) {
    console.error('Error en confirmDirectPaymentForFinal:', error);
    res.status(500).json({ error: true, message: 'Error interno al registrar pago directo.' });
  }
};


/**
 * @description Cliente avisa que abonó el invoice. Se registra la confirmación.
 */
const confirmClientPaymentForFinal = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { paymentNotes } = req.body;
    const paymentProofFile = req.file; // Opcional: comprobante de pago

    const inspection = await Inspection.findByPk(inspectionId, { include: [Work] });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    if (inspection.type !== 'final' || inspection.processStatus !== 'final_invoice_sent_to_client') {
      return res.status(400).json({ error: true, message: `Estado de proceso de inspección inválido (${inspection.processStatus}). Se esperaba 'final_invoice_sent_to_client'.` });
    }

    if (paymentProofFile) {
      const cloudinaryResult = await uploadBufferToCloudinary(paymentProofFile.buffer, {
        folder: `inspections/${inspection.workId}/${inspection.idInspection}/final_payment_proofs`,
        resource_type: 'raw', // o 'image' si es una imagen
        public_id: `payment_proof_${paymentProofFile.originalname.split('.')[0]}_${Date.now()}`
      });
      inspection.clientPaymentProofUrl = cloudinaryResult.secure_url;
      inspection.clientPaymentProofPublicId = cloudinaryResult.public_id;
    }

    inspection.processStatus = 'final_payment_confirmed';
    inspection.datePaymentConfirmedByClient = new Date();
    if (paymentNotes) inspection.notes = `${inspection.notes || ''}\nConfirmación Pago Cliente: ${paymentNotes}`.trim();
    await inspection.save();

    // Notificar internamente que el pago está confirmado y listo para notificar al inspector
     await sendNotifications('final_payment_confirmed_by_client', inspection.Work, req.app.get('io'), { inspectionId: inspection.idInspection });


    res.status(200).json({ message: 'Pago del cliente confirmado. Listo para notificar al inspector.', inspection });

  } catch (error) {
    console.error('Error en confirmClientPaymentForFinal:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al confirmar pago del cliente.' });
  }
};

/**
 * @description Se envía confirmación de pago al inspector para que termine la inspección.
 */
const notifyInspectorPaymentForFinal = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    // El email del inspector debería estar en la inspección o ser pasado en el body
    const { inspectorEmail } = req.body; // O buscar en inspection.notes si se guardó allí

    const inspection = await Inspection.findByPk(inspectionId, { 
        include: [{ model: Work, attributes: ['propertyAddress', 'idWork'], include: [{model: Permit, attributes: ['permitNumber']}] }] 
    });

    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    if (inspection.type !== 'final' || inspection.processStatus !== 'final_payment_confirmed') {
      return res.status(400).json({ error: true, message: `Estado de proceso de inspección inválido (${inspection.processStatus}). Se esperaba 'final_payment_confirmed'.` });
    }

    let finalInspectorEmail = inspectorEmail;
    if (!finalInspectorEmail && inspection.notes) {
        const emailMatch = inspection.notes.match(/(?:Inspector:|Email inspector:)\s*([\w@.-]+)/i);
        if (emailMatch && emailMatch[1]) finalInspectorEmail = emailMatch[1];
    }
    if (!finalInspectorEmail) {
        return res.status(400).json({ error: true, message: 'No se pudo determinar el email del inspector para la notificación.' });
    }


    const emailSubject = `Confirmación de Pago y Solicitud para Finalizar Inspección - Obra: ${inspection.Work.propertyAddress}`;
    let emailText = `Estimado Inspector,\n\nLe informamos que el cliente ha realizado el pago del invoice para la Inspección Final de la obra ubicada en ${inspection.Work.propertyAddress} (Permit N°: ${inspection.Work.Permit?.permitNumber || 'N/A'}).`;
    if (inspection.clientPaymentProofUrl) {
      emailText += `\n\nPuede ver el comprobante de pago aquí: ${inspection.clientPaymentProofUrl}`;
    }
    emailText += `\n\nPor favor, proceda con la inspección y envíenos el resultado.\n\nSaludos cordiales.`;
    
    let emailHtml = `<p>${emailText.replace(/\n/g, '<br>')}</p>`;
    const attachments = [];
    if (inspection.clientPaymentProofUrl) {
        attachments.push({
            filename: `Comprobante_Pago_${inspection.Work.propertyAddress.replace(/\s+/g, '_')}.pdf`, // Asume PDF o ajusta
            path: inspection.clientPaymentProofUrl,
        });
    }

    await sendEmail({
      to: finalInspectorEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      attachments,
    });

    inspection.processStatus = 'final_payment_notified_to_inspector';
    inspection.datePaymentNotifiedToInspector = new Date();
    await inspection.save();

    // El siguiente estado de la obra podría ser el mismo 'finalInspectionPending' o uno más específico
    // await inspection.Work.save(); // Si cambia el estado de la obra aquí

    await sendNotifications('final_payment_notified_to_inspector', inspection.Work, req.app.get('io'), { inspectionId: inspection.idInspection });

    res.status(200).json({ message: 'Notificación de pago enviada al inspector. Esperando resultado de la inspección.', inspection });

  } catch (error) {
    console.error('Error en notifyInspectorPaymentForFinal:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al notificar pago al inspector.' });
  }
};


// --- FIN: FUNCIONES PARA EL FLUJO DE INSPECCIÓN FINAL ---

// ... (resto de tus funciones existentes como registerInspectionResult, getInspectionsByWork, etc.)
// Asegúrate de que registerInspectionResult maneje el caso de type: 'final' y status: 'approved'
// para cambiar Work.status a 'maintenance' o el estado que corresponda.

/*
  En `registerInspectionResult`, cuando `inspection.type === 'final'` y `finalStatus === 'approved'`:
  work.status = 'maintenance'; // O el estado que defina "mantenimiento"
  await sendNotifications('final_inspection_approved_maintenance', work, req.app.get('io'), { inspectionId: inspection.idInspection });

  Y si `inspection.type === 'final'` y `finalStatus === 'rejected'`:
  work.status = 'finalRejected'; // Esto ya lo manejas
  await sendNotifications('final_inspection_rejected', work, req.app.get('io'), { inspectionId: inspection.idInspection, notes: inspection.notes });
*/





module.exports = {
  requestInitialInspection,
  registerInspectorResponse,
  sendDocumentToApplicant,
  registerSignedApplicantDocument,
  registerInspectionResult, // Asegúrate que este maneje el caso 'final' para 'maintenance'
  getInspectionsByWork,
  getInspectionById,
  requestReinspection, // Ya debería manejar 'finalRejected'
  markCorrectionByWorker,

  // Nuevas funciones para inspección final
  requestFinalInspection,
  registerInspectorInvoiceForFinal,
  sendInvoiceToClientForFinal,
  confirmDirectPaymentForFinal,
  confirmClientPaymentForFinal,
  notifyInspectorPaymentForFinal,
 
};