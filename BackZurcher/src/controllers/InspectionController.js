const { Inspection, Work, Permit, Image, Budget } = require('../data'); // Asegúrate de importar Image
const { sendEmail } = require('../utils/notifications/emailService');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUploader');
const { sendNotifications } = require('../utils/notifications/notificationManager'); // Para notificaciones internas si es necesario

// --- INICIO: NUEVAS FUNCIONES PARA EL FLUJO DE INSPECCIÓN DETALLADO ---

/**
 * @description Inicia el proceso de inspección inicial para una obra.
 * Crea un registro de inspección, envía correo a inspectores con documentos.
 */
const requestInitialInspection = async (req, res) => {
  try {
    const { workId } = req.params;
    const { inspectorEmail, workImageId } = req.body; // Email de inspectores, ID de la imagen de obra a enviar

    if (!inspectorEmail || !workImageId) {
      return res.status(400).json({ error: true, message: 'Faltan datos: inspectorEmail o workImageId.' });
    }

    const work = await Work.findByPk(workId, {
      include: [
        { model: Permit, attributes: ['idPermit', 'pdfData', 'permitNumber','applicantEmail', 'applicantName'] }, // Necesitamos el Permit
        { model: Image, as: 'images', where: { id: workImageId }, limit: 1 } // Obtener la imagen específica
      ]
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }
    if (work.status !== 'installed') {
      return res.status(400).json({ error: true, message: `La obra debe estar en estado "installed" para solicitar inspección. Estado actual: ${work.status}` });
    }
    if (!work.Permit || !work.Permit.pdfData) {
      return res.status(400).json({ error: true, message: 'La obra no tiene un Permit con PDF asociado.' });
    }
    if (!work.images || work.images.length === 0) {
        return res.status(400).json({ error: true, message: 'Imagen de obra especificada no encontrada.' });
    }
    const workImage = work.images[0];

    // 1. Crear el registro de Inspección
    let inspection = await Inspection.create({
      workId,
      type: 'initial',
      processStatus: 'pending_request', // Estado inicial del proceso de inspección
      notes: `Solicitud inicial para ${work.propertyAddress}. Email inspector: ${inspectorEmail}`,
    });

    // 2. Preparar y enviar correo a inspectores
    const emailSubject = `Solicitud de Inspección Inicial - Obra: ${work.propertyAddress}`;
    const emailText = `Estimados Inspectores,\n\nAdjunto encontrarán la documentación para solicitar la inspección inicial de la obra ubicada en ${work.propertyAddress}.\n\n- Permit N°: ${work.Permit.permitNumber || 'N/A'}\n- Imagen de la obra.\n\nQuedamos atentos a su respuesta con la fecha programada y cualquier documento adicional requerido.\n\nSaludos cordiales.`;
    
    const attachments = [];
    if (work.Permit.pdfData) {
        attachments.push({
            filename: `Permit_${work.Permit.permitNumber || workId}.pdf`,
            content: Buffer.isBuffer(work.Permit.pdfData) ? work.Permit.pdfData : Buffer.from(work.Permit.pdfData, 'base64'), // Asume que pdfData es buffer o base64
            contentType: 'application/pdf'
        });
    }
    if (workImage.imageUrl) { // Asumimos que imageUrl es accesible y podemos adjuntarla (o enviar un link)
        // Para adjuntar directamente, necesitarías descargarla primero si es una URL externa.
        // Por simplicidad, aquí podrías optar por incluir la URL en el cuerpo del correo,
        // o si tu emailService puede adjuntar desde URL, úsalo.
        // Si es un buffer o puedes obtenerlo:
        // attachments.push({ filename: `WorkImage_${workImage.id}.jpg`, content: imageBuffer, contentType: 'image/jpeg' });
        // Por ahora, solo mencionaremos la imagen en el texto o enviaremos la URL.
        // Si quieres adjuntar la imagen de Cloudinary, necesitarías obtener su buffer.
    }

    await sendEmail({
      to: inspectorEmail,
      subject: emailSubject,
      text: emailText,
      html: `<p>${emailText.replace(/\n/g, '<br>')}</p><p>Imagen de la obra: <a href="${workImage.imageUrl}">Ver Imagen</a></p>`, // Ejemplo con link a la imagen
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
    const { notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se proporcionó el documento firmado.' });
    }

    const inspection = await Inspection.findByPk(inspectionId);
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

    res.status(200).json({ message: 'Documento firmado por el aplicante registrado.', inspection });

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
    const { finalStatus, dateInspectionPerformed, notes } = req.body; // 'approved' o 'rejected'

    if (!finalStatus || (finalStatus !== 'approved' && finalStatus !== 'rejected')) {
      return res.status(400).json({ error: true, message: 'El estado final (finalStatus) es inválido o no fue proporcionado.' });
    }
    if (!req.files || req.files.length === 0) { // Ahora es req.files
      return res.status(400).json({ error: true, message: 'No se proporcionaron documentos/capturas del resultado.' });
    }


    const inspection = await Inspection.findByPk(inspectionId, { include: [Work] });
    if (!inspection) {
      return res.status(404).json({ error: true, message: 'Registro de inspección no encontrado.' });
    }
    // Podrías añadir una validación de processStatus aquí, ej:
    // if (inspection.processStatus !== 'applicant_document_received' && inspection.processStatus !== 'inspection_completed_pending_result') { ... }


    const uploadedFilesInfo = [];
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

    // Decidir cuál archivo es el "principal" para los campos existentes
    // Por ejemplo, priorizar un PDF, o simplemente el primero.
    let primaryFile = uploadedFilesInfo.find(f => f.mimetype === 'application/pdf');
    if (!primaryFile && uploadedFilesInfo.length > 0) {
      primaryFile = uploadedFilesInfo[0]; // Tomar el primero si no hay PDF
    }

    if (primaryFile) {
      inspection.resultDocumentUrl = primaryFile.url;
      inspection.resultDocumentPublicId = primaryFile.publicId;
    } else {
      inspection.resultDocumentUrl = null;
      inspection.resultDocumentPublicId = null;
    }
    
    inspection.dateInspectionPerformed = dateInspectionPerformed || new Date(); // O la fecha que venga del body
    inspection.dateResultReceived = new Date();
    inspection.finalStatus = finalStatus;
    inspection.processStatus = finalStatus === 'approved' ? 'result_approved' : 'result_rejected';
    
    let fileNotes = 'Archivos de resultado adjuntos:\n';
    uploadedFilesInfo.forEach(f => {
      fileNotes += `- ${f.originalName} (${f.url})\n`;
    });
    
    inspection.notes = `${notes || ''}\n${fileNotes}`.trim();
    await inspection.save();

    const work = inspection.Work;
    if (work) {
      work.status = finalStatus === 'approved' ? 'approvedInspection' : 'rejectedInspection';
      await work.save();
    }

    res.status(200).json({ 
        message: `Resultado de inspección (${finalStatus}) registrado con ${uploadedFilesInfo.length} archivo(s).`, 
        inspection,
        workStatus: work ? work.status : null
    });

  } catch (error) {
    console.error('Error en registerInspectionResult:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al registrar resultado de inspección.' });
  }
};

// --- FIN: NUEVAS FUNCIONES ---


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


// NOTA: Las funciones genéricas createInspection y updateInspection originales
// podrían eliminarse o adaptarse si este nuevo flujo más detallado las reemplaza.
// Por ahora las comento para evitar conflictos si decides mantenerlas para otros usos.

/*
const createInspection = async (req, res) => { ... } // Tu createInspection original
const updateInspection = async (req, res) => { ... } // Tu updateInspection original
*/

module.exports = {
  requestInitialInspection,
  registerInspectorResponse,
  sendDocumentToApplicant,
  registerSignedApplicantDocument,
  registerInspectionResult,
  getInspectionsByWork,
  getInspectionById,
  // createInspection, // Descomenta si aún necesitas la versión genérica
  // updateInspection, // Descomenta si aún necesitas la versión genérica
};