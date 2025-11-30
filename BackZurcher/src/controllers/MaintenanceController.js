const { Work, MaintenanceVisit, MaintenanceMedia, Staff, Permit } = require('../data');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUploader');
const { Op } = require('sequelize');
const { addMonths, format, parseISO  } = require('date-fns'); // Para manipulación de fechas
const jwt = require('jsonwebtoken');
const { generateMaintenancePDF } = require('../utils/maintenancePdfGenerator');
const { sendEmail } = require('../utils/notifications/emailService');
const fs = require('fs');
const path = require('path');

// --- Lógica para Programar Mantenimientos Iniciales ---
const scheduleInitialMaintenanceVisits = async (workId) => {
  try {
    console.log(`[MaintenanceController - scheduleInitial] Called for workId: ${workId}`);
    const work = await Work.findByPk(workId);

    if (!work) {
      console.error(`[MaintenanceController - scheduleInitial] Work ${workId} NOT FOUND. Cannot schedule visits.`);
      return;
    }
    console.log(`[MaintenanceController - scheduleInitial] Found Work ${workId}. Status: ${work.status}, MaintenanceStartDate: ${work.maintenanceStartDate}`);

    if (work.status !== 'maintenance') {
      console.warn(`[MaintenanceController - scheduleInitial] Work ${workId} is not in 'maintenance' status (current: ${work.status}). Skipping visit scheduling.`);
      return;
    }
 if (!work.maintenanceStartDate) { // Esta condición ahora es menos probable que se cumpla si WorkController lo hizo bien
      console.error(`[MaintenanceController - scheduleInitial] Work ${workId} is in 'maintenance' but has NO maintenanceStartDate...`);
      return; 
    }

    const existingVisitsCount = await MaintenanceVisit.count({ where: { workId } });
    console.log(`[MaintenanceController - scheduleInitial] Work ${workId} currently has ${existingVisitsCount} visits.`);

    if (existingVisitsCount > 0) {
      console.log(`[MaintenanceController - scheduleInitial] Work ${workId} already has visits. Skipping initial scheduling.`);
      return;
    }

   // Usar parseISO para evitar problemas de timezone con strings YYYY-MM-DD
   const baseDate = parseISO(work.maintenanceStartDate + 'T12:00:00');
    console.log(`[MaintenanceController - scheduleInitial] Base date for scheduling: ${baseDate.toISOString()}`);

    for (let i = 1; i <= 4; i++) {
       const scheduledDateForVisit = addMonths(baseDate, i * 6); 
      // --- FIN DEL CAMBIO ---
      
      const formattedScheduledDate = format(scheduledDateForVisit, 'yyyy-MM-dd');
      
      console.log(`[MaintenanceController - scheduleInitial] Creating Visit ${i} for work ${workId}: Date ${formattedScheduledDate}`);
      
      const newVisit = await MaintenanceVisit.create({
        workId,
        visitNumber: i,
        scheduledDate: formattedScheduledDate,
        status: 'pending_scheduling',
      });
      console.log(`[MaintenanceController - scheduleInitial] CREATED Visit ${i} (ID: ${newVisit.id}) for work ${workId} on ${formattedScheduledDate}`);
    }
    console.log(`[MaintenanceController - scheduleInitial] Successfully scheduled 4 initial visits for work ${workId}.`);

  } catch (error) {
    console.error(`[MaintenanceController - scheduleInitial] CRITICAL ERROR scheduling visits for workId ${workId}:`, error);
  }
};

// --- Obtener todas las visitas de mantenimiento para una obra ---
const getMaintenanceVisitsForWork = async (req, res) => {
  try {
    const { workId } = req.params;
    const visits = await MaintenanceVisit.findAll({
      where: { workId },
      include: [
        { model: MaintenanceMedia, as: 'mediaFiles' },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] }, // Incluir datos del staff asignado
        { 
          model: Work, 
          as: 'work',
          include: [
            { 
              model: Permit, 
              attributes: [
                'idPermit', 'permitNumber', 'expirationDate', 'systemType', 
                'applicantName', 'applicantEmail', 'applicantPhone',
                'propertyAddress', 
                'pdfData', 'optionalDocs', // Legacy Buffer fields
                'permitPdfUrl', 'permitPdfPublicId', 'optionalDocsUrl', 'optionalDocsPublicId', // ✅ Cloudinary URLs
                'gpdCapacity', 'squareFeetSystem', 'pump'
              ]
            }
          ]
        }
      ],
      order: [['visitNumber', 'ASC']],
    });
    // if (!visits || visits.length === 0) {
    //   return res.status(404).json({ message: 'No se encontraron visitas de mantenimiento para esta obra.' });
    // }
    res.status(200).json(visits);
  } catch (error) {
    console.error('Error al obtener visitas de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Actualizar una visita de mantenimiento (registrar fecha, notas, estado) ---
const updateMaintenanceVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    // Destructuring all potential fields from req.body
    // workId is received but generally not used to modify the visit's own workId.
    const { actualVisitDate, notes, status, staffId, scheduledDate, workId: receivedWorkId } = req.body;

    const visit = await MaintenanceVisit.findByPk(visitId);
    if (!visit) {
      return res.status(404).json({ error: true, message: 'Visita de mantenimiento no encontrada.' });
    }

    // Update fields if they were provided in the request body
    if (actualVisitDate !== undefined) {
        // Ensure actualVisitDate is null if an empty string is sent, or a valid date
        visit.actualVisitDate = actualVisitDate === '' ? null : actualVisitDate;
    }
    if (notes !== undefined) {
        visit.notes = notes;
    }
    if (status !== undefined) {
        visit.status = status; // Status is determined by frontend logic
    }
    if (scheduledDate !== undefined) { // For rescheduling
        visit.scheduledDate = scheduledDate; // Frontend sends 'yyyy-MM-dd'
    }
    
    // Track if staff assignment changed for email notification
    const previousStaffId = visit.staffId;
    const staffAssignmentChanged = req.body.hasOwnProperty('staffId') && previousStaffId !== staffId;
    const scheduledDateChanged = req.body.hasOwnProperty('scheduledDate') && scheduledDate !== undefined;
    
    // Handle staffId: allows assigning a new staff, or unassigning (setting to null)
    // if 'staffId' is explicitly part of the request body.
    if (req.body.hasOwnProperty('staffId')) {
        visit.staffId = staffId; // staffId can be a UUID or null
    }

    await visit.save();

    // Optional: Logic for 4th visit completion
    if (visit.visitNumber === 4 && visit.status === 'completed') {
      const work = await Work.findByPk(visit.workId); // visit.workId is the correct FK
      if (work) {
        console.log(`Ciclo de mantenimiento completado para la obra ${work.idWork}`);
        // Example: work.status = 'maintenance_completed';
        // await work.save();
      }
    }

    // Refetch the updated visit to include associations for the response
    const updatedVisit = await MaintenanceVisit.findByPk(visitId, {
        include: [
        { model: MaintenanceMedia, as: 'mediaFiles' }, // Good to keep for consistency
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] }, // Crucial for frontend update
        { 
          model: Work, 
          as: 'work',
          attributes: ['idWork', 'propertyAddress'],
          include: [
            { 
              model: Permit, 
              attributes: ['permitNumber', 'systemType', 'applicantName', 'pdfData', 'optionalDocs']
            }
          ]
        }
      ]});

    // Send email notification if staff was assigned or if date changed for existing assignment
    const shouldSendEmail = (staffAssignmentChanged && staffId) || (scheduledDateChanged && visit.staffId);
    
    if (shouldSendEmail && updatedVisit.assignedStaff) {
      try {
        const staff = updatedVisit.assignedStaff;
        const work = updatedVisit.work;
        const permit = work?.Permit;
        
        const scheduledDateFormatted = updatedVisit.scheduledDate 
          ? new Date(updatedVisit.scheduledDate + 'T12:00:00').toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'Por programar';

        // Preparar attachments con los PDFs del permiso
        const emailAttachments = [];
        
        if (permit?.pdfData) {
          emailAttachments.push({
            filename: `Permiso_${permit.permitNumber || 'Principal'}.pdf`,
            content: Buffer.isBuffer(permit.pdfData) ? permit.pdfData : Buffer.from(permit.pdfData, 'base64'),
            contentType: 'application/pdf'
          });
        }
        
        if (permit?.optionalDocs) {
          if (Buffer.isBuffer(permit.optionalDocs)) {
            emailAttachments.push({
              filename: `Documentacion_Adicional.pdf`,
              content: permit.optionalDocs,
              contentType: 'application/pdf'
            });
          } else if (typeof permit.optionalDocs === 'string') {
            emailAttachments.push({
              filename: `Documentacion_Adicional.pdf`,
              content: Buffer.from(permit.optionalDocs, 'base64'),
              contentType: 'application/pdf'
            });
          }
        }

        const emailSubject = `Nueva Visita de Mantenimiento Asignada - ${work?.propertyAddress || 'Obra'}`;
        const emailText = `Hola ${staff.name},\n\nSe te ha asignado una nueva visita de mantenimiento:\n\n` +
          `📍 Dirección: ${work?.propertyAddress || 'N/A'}\n` +
          `🔢 Visita #${updatedVisit.visitNumber}\n` +
          `📅 Fecha programada: ${scheduledDateFormatted}\n` +
          `📋 Estado: ${updatedVisit.status === 'scheduled' ? 'Programada' : updatedVisit.status === 'assigned' ? 'Asignada' : 'Pendiente'}\n` +
          (permit?.permitNumber ? `🎫 Permiso: ${permit.permitNumber}\n` : '') +
          (permit?.systemType ? `🔧 Sistema: ${permit.systemType}\n` : '') +
          (permit?.applicantName ? `👤 Cliente: ${permit.applicantName}\n` : '') +
          (updatedVisit.notes ? `\n📝 Notas: ${updatedVisit.notes}\n` : '') +
          `\nPor favor, revisa los detalles en la aplicación móvil.\n\nSaludos.`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h2 style="color: #1a365d; border-bottom: 3px solid #1a365d; padding-bottom: 10px;">
              🔧 Nueva Visita de Mantenimiento Asignada
            </h2>
            <p>Hola <strong>${staff.name}</strong>,</p>
            <p>Se te ha asignado una nueva visita de mantenimiento:</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>📍 Dirección:</strong></td>
                  <td style="padding: 8px 0;">${work?.propertyAddress || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>🔢 Visita:</strong></td>
                  <td style="padding: 8px 0;">#${updatedVisit.visitNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>📅 Fecha programada:</strong></td>
                  <td style="padding: 8px 0;"><strong style="color: #2d3748;">${scheduledDateFormatted}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>📋 Estado:</strong></td>
                  <td style="padding: 8px 0;">
                    <span style="background: #4299e1; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                      ${updatedVisit.status === 'scheduled' ? 'Programada' : updatedVisit.status === 'assigned' ? 'Asignada' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
                ${permit?.permitNumber ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>🎫 Permiso:</strong></td>
                  <td style="padding: 8px 0;">${permit.permitNumber}</td>
                </tr>` : ''}
                ${permit?.systemType ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>🔧 Sistema:</strong></td>
                  <td style="padding: 8px 0;">${permit.systemType}</td>
                </tr>` : ''}
                ${permit?.applicantName ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>👤 Cliente:</strong></td>
                  <td style="padding: 8px 0;">${permit.applicantName}</td>
                </tr>` : ''}
              </table>
            </div>
            
            ${updatedVisit.notes ? `
            <div style="background: #fff5e6; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📝 Notas:</strong></p>
              <p style="margin: 10px 0 0 0;">${updatedVisit.notes}</p>
            </div>` : ''}
            
            ${emailAttachments.length > 0 ? `
            <div style="background: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📎 Documentos adjuntos:</strong></p>
              <p style="margin: 10px 0 0 0;">Se han adjuntado los documentos del permiso para tu referencia.</p>
            </div>` : ''}
            
            <p style="margin-top: 30px;">Por favor, revisa los detalles en la <strong>aplicación móvil</strong>.</p>
            <p style="color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              Saludos,<br>
              <strong>Sistema de Mantenimiento</strong>
            </p>
          </div>
        `;

        await sendEmail({
          to: staff.email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
          attachments: emailAttachments,
        });

        console.log(`✅ Email enviado a ${staff.email} para visita ${visitId}`);
      } catch (emailError) {
        console.error('❌ Error al enviar email de asignación:', emailError);
        // No fallar la request si el email falla
      }
    }

    res.status(200).json({ message: 'Visita de mantenimiento actualizada.', visit: updatedVisit });
  } catch (error) {
    console.error('Error al actualizar visita de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Añadir media (imágenes/videos) a una visita de mantenimiento ---
const addMediaToMaintenanceVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    const files = req.files; // Array de archivos de Multer

    const visit = await MaintenanceVisit.findByPk(visitId);
    if (!visit) {
      return res.status(404).json({ error: true, message: 'Visita de mantenimiento no encontrada.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: true, message: 'No se proporcionaron archivos.' });
    }

    const uploadedMedia = [];
    for (const file of files) {
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : (file.mimetype.startsWith('image/') ? 'image' : 'raw');
      const cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
        folder: `maintenance/${visit.workId}/${visit.id}`,
        resource_type: resourceType,
      });

      const newMedia = await MaintenanceMedia.create({
        maintenanceVisitId: visit.id,
        mediaUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        mediaType: resourceType === 'raw' ? 'document' : resourceType, // Ajustar 'raw' a 'document'
        originalName: file.originalname,
      });
      uploadedMedia.push(newMedia);
    }
    
    const updatedVisit = await MaintenanceVisit.findByPk(visitId, {
        include: [{ model: MaintenanceMedia, as: 'mediaFiles' }]
    });

    res.status(201).json({ message: `${uploadedMedia.length} archivo(s) añadido(s) a la visita.`, visit: updatedVisit, addedMedia: uploadedMedia });
  } catch (error) {
    console.error('Error al añadir media a la visita de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Eliminar media de una visita de mantenimiento ---
const deleteMaintenanceMedia = async (req, res) => {
    try {
        const { mediaId } = req.params;
        const media = await MaintenanceMedia.findByPk(mediaId, {
            include: [
                {
                    model: MaintenanceVisit,
                    as: 'maintenanceVisit',
                    attributes: ['id', 'staffId', 'completed_by_staff_id']
                }
            ]
        });

        if (!media) {
            return res.status(404).json({ error: true, message: 'Archivo multimedia no encontrado.' });
        }

        // Verificar permisos: admin/owner/maintenance pueden eliminar cualquier foto
        // Workers solo pueden eliminar fotos de sus propias visitas asignadas
        const currentUserId = req.staff?.id;
        const userRole = req.staff?.rol || req.staff?.role;
        
        const isAdminOrOwner = ['admin', 'owner', 'maintenance'].includes(userRole?.toLowerCase());
        const isAssignedWorker = media.maintenanceVisit && (
            media.maintenanceVisit.staffId === currentUserId || 
            media.maintenanceVisit.completed_by_staff_id === currentUserId
        );

        if (!isAdminOrOwner && !isAssignedWorker) {
            return res.status(403).json({ 
                error: true, 
                message: 'No tienes permiso para eliminar esta foto.' 
            });
        }

        if (media.publicId) {
            await deleteFromCloudinary(media.publicId);
        }
        await media.destroy();

        res.status(200).json({ message: 'Archivo multimedia eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar archivo multimedia de mantenimiento:', error);
        res.status(500).json({ error: true, message: 'Error interno del servidor.' });
    }
};


// --- Programar visitas de mantenimiento manualmente ---
const scheduleMaintenanceVisits = async (req, res) => {
  try {
    const { workId } = req.params;
    const { startDate, forceReschedule } = req.body; // Agregar flag para forzar reprogramación
    
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }

    // Variables para tracking
    let visitsToDelete = [];
    let visitsToPreserve = [];
    
    // Verificar si ya existen visitas
    const existingVisits = await MaintenanceVisit.findAll({ 
      where: { workId },
      include: [{ model: MaintenanceMedia, as: 'mediaFiles' }]
    });
    
    if (existingVisits.length > 0) {
      if (!forceReschedule) {
        return res.status(400).json({ 
          error: true, 
          message: 'Ya existen visitas programadas para esta obra. Use forceReschedule=true para reprogramar.',
          existingVisits: existingVisits.length 
        });
      }
      
      // Si forceReschedule es true, identificar qué visitas se pueden eliminar
      for (const visit of existingVisits) {
        // Preservar visitas que tienen:
        // 1. Estado completado u omitido
        // 2. Fotos/documentos subidos
        // 3. Fecha de visita real registrada
        const hasMedia = visit.mediaFiles && visit.mediaFiles.length > 0;
        const isCompleted = visit.status === 'completed' || visit.status === 'skipped';
        const hasActualDate = visit.actualVisitDate !== null;
        
        if (hasMedia || isCompleted || hasActualDate) {
          visitsToPreserve.push(visit);
          console.log(`⚠️ Preservando visita #${visit.visitNumber} (tiene datos: media=${hasMedia}, status=${visit.status}, actualDate=${hasActualDate})`);
        } else {
          visitsToDelete.push(visit.id);
        }
      }
      
      // Eliminar solo las visitas sin datos importantes
      if (visitsToDelete.length > 0) {
        await MaintenanceVisit.destroy({ 
          where: { 
            id: visitsToDelete 
          } 
        });
        console.log(`🗑️ Eliminadas ${visitsToDelete.length} visitas sin datos para reprogramar.`);
      }
      
      if (visitsToPreserve.length > 0) {
        console.log(`✅ Preservadas ${visitsToPreserve.length} visitas con datos importantes.`);
      }
    }

    // Usar la fecha proporcionada o la fecha actual
    // Usar parseISO para evitar problemas de timezone con strings YYYY-MM-DD
    const baseDate = startDate ? parseISO(startDate + 'T12:00:00') : new Date();
    
    // Obtener números de visitas ya existentes (preservadas)
    const preservedVisitNumbers = await MaintenanceVisit.findAll({
      where: { workId },
      attributes: ['visitNumber'],
      raw: true
    });
    const existingNumbers = preservedVisitNumbers.map(v => v.visitNumber);
    console.log('📋 Números de visitas ya existentes:', existingNumbers);
    
    // Crear las 4 visitas de mantenimiento (solo las que no existen)
    const visits = [];
    for (let i = 1; i <= 4; i++) {
      // Si ya existe una visita con este número, saltarla
      if (existingNumbers.includes(i)) {
        console.log(`⏭️ Saltando visita #${i} (ya existe)`);
        continue;
      }
      
      const scheduledDateForVisit = addMonths(baseDate, i * 6);
      const formattedScheduledDate = format(scheduledDateForVisit, 'yyyy-MM-dd');
      
      const newVisit = await MaintenanceVisit.create({
        workId,
        visitNumber: i,
        scheduledDate: formattedScheduledDate,
        status: 'pending_scheduling',
      });
      visits.push(newVisit);
      console.log(`✅ Creada visita #${i} programada para ${formattedScheduledDate}`);
    }

    // Actualizar la fecha de inicio de mantenimiento en la obra si se proporcionó
    if (startDate && !work.maintenanceStartDate) {
      work.maintenanceStartDate = startDate;
      await work.save();
    }

    // Obtener todas las visitas actualizadas
    const allVisits = await MaintenanceVisit.findAll({
      where: { workId },
      include: [
        { model: MaintenanceMedia, as: 'mediaFiles' },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] }
      ],
      order: [['visitNumber', 'ASC']]
    });

    const responseMessage = visits.length > 0 
      ? `Se ${existingVisits.length > 0 ? 'reprogramaron' : 'programaron'} ${visits.length} visita(s) de mantenimiento.`
      : 'No se crearon nuevas visitas (todas ya existían).';

    res.status(201).json({ 
      message: responseMessage,
      visitsCreated: visits.length,
      visitsPreserved: existingVisits.length > 0 ? existingVisits.length - visitsToDelete.length : 0,
      visitsDeleted: visitsToDelete ? visitsToDelete.length : 0,
      allVisits: allVisits, // Devolver todas las visitas actualizadas
      work: work,
      rescheduled: existingVisits.length > 0
    });
  } catch (error) {
    console.error('Error al programar visitas de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Inicializar mantenimiento histórico para obras antiguas ---
const initializeHistoricalMaintenance = async (req, res) => {
  try {
    const { workId } = req.params;
    const { completionDate, generatePastVisits } = req.body;
    
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }

    // Verificar si ya existen visitas
    const existingVisitsCount = await MaintenanceVisit.count({ where: { workId } });
    if (existingVisitsCount > 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'Ya existen visitas para esta obra. Use la función de reprogramar en su lugar.' 
      });
    }

    const completionDateObj = new Date(completionDate);
    const currentDate = new Date();
    
    // Calcular cuántas visitas deberían haber ocurrido
    const monthsSinceCompletion = Math.floor(
      (currentDate - completionDateObj) / (1000 * 60 * 60 * 24 * 30)
    );
    const visitsDue = Math.min(Math.floor(monthsSinceCompletion / 6), 4);
    
    const visits = [];
    
    // Si generatePastVisits es true, crear visitas históricas como "overdue"
    if (generatePastVisits && visitsDue > 0) {
      for (let i = 1; i <= visitsDue; i++) {
        const scheduledDateForVisit = addMonths(completionDateObj, i * 6);
        const formattedScheduledDate = format(scheduledDateForVisit, 'yyyy-MM-dd');
        
        const newVisit = await MaintenanceVisit.create({
          workId,
          visitNumber: i,
          scheduledDate: formattedScheduledDate,
          status: 'overdue', // Estado especial para visitas vencidas
        });
        visits.push(newVisit);
      }
    }
    
    // Crear las visitas futuras restantes
    const remainingVisits = 4 - visitsDue;
    for (let i = visitsDue + 1; i <= 4; i++) {
      const scheduledDateForVisit = addMonths(completionDateObj, i * 6);
      const formattedScheduledDate = format(scheduledDateForVisit, 'yyyy-MM-dd');
      
      const newVisit = await MaintenanceVisit.create({
        workId,
        visitNumber: i,
        scheduledDate: formattedScheduledDate,
        status: 'pending_scheduling',
      });
      visits.push(newVisit);
    }

    // Actualizar la fecha de inicio de mantenimiento en la obra
    work.maintenanceStartDate = completionDate;
    await work.save();

    res.status(201).json({ 
      message: 'Mantenimiento histórico inicializado correctamente.', 
      visits,
      work: work,
      visitsDue,
      overdueVisits: generatePastVisits ? visitsDue : 0
    });
  } catch (error) {
    console.error('Error al inicializar mantenimiento histórico:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Crear una visita individual ---
const createMaintenanceVisit = async (req, res) => {
  try {
    const { workId } = req.params;
    const { scheduledDate, visitNumber, notes, assignedStaffId } = req.body;
    const currentUserId = req.staff.id; // Usuario que está creando la visita
    
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }

    // Verificar si ya existe una visita con ese número
    if (visitNumber) {
      const existingVisit = await MaintenanceVisit.findOne({ 
        where: { workId, visitNumber } 
      });
      if (existingVisit) {
        return res.status(400).json({ 
          error: true, 
          message: `Ya existe una visita con el número ${visitNumber}.` 
        });
      }
    }

    // Determinar quién será asignado a la visita
    let finalAssignedStaffId = assignedStaffId;
    
    if (assignedStaffId) {
      // Si se proporcionó un staff específico, verificar que existe
      const staffMember = await Staff.findByPk(assignedStaffId);
      if (!staffMember) {
        return res.status(400).json({ 
          error: true, 
          message: 'El miembro del staff seleccionado no existe.' 
        });
      }
    } else {
      // Si no se proporcionó staff, usar el usuario actual
      finalAssignedStaffId = currentUserId;
      console.log(`Asignando visita al usuario actual: ${currentUserId}`);
    }

    // Calcular el siguiente número de visita si no se proporciona
    const maxVisitNumber = await MaintenanceVisit.max('visitNumber', { where: { workId } }) || 0;
    const nextVisitNumber = visitNumber || (maxVisitNumber + 1);

    const newVisit = await MaintenanceVisit.create({
      workId,
      visitNumber: nextVisitNumber,
      scheduledDate: scheduledDate || null,
      assignedStaffId: finalAssignedStaffId,
      status: 'pending_scheduling',
      notes: notes || null,
    });

    // Obtener la visita creada con las asociaciones
    const createdVisit = await MaintenanceVisit.findByPk(newVisit.id, {
      include: [
        { model: MaintenanceMedia, as: 'mediaFiles' },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] },
        { 
          model: Work, 
          as: 'work',
          attributes: ['idWork', 'propertyAddress'],
          include: [
            { 
              model: Permit, 
              attributes: ['permitNumber', 'systemType', 'applicantName', 'pdfData', 'optionalDocs']
            }
          ]
        }
      ]
    });

    // Send email notification to assigned staff
    if (finalAssignedStaffId && createdVisit.assignedStaff) {
      try {
        const staff = createdVisit.assignedStaff;
        const workData = createdVisit.work;
        const permit = workData?.Permit;
        
        const scheduledDateFormatted = createdVisit.scheduledDate 
          ? new Date(createdVisit.scheduledDate + 'T12:00:00').toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'Por programar';

        // Preparar attachments con los PDFs del permiso
        const emailAttachments = [];
        
        if (permit?.pdfData) {
          emailAttachments.push({
            filename: `Permiso_${permit.permitNumber || 'Principal'}.pdf`,
            content: Buffer.isBuffer(permit.pdfData) ? permit.pdfData : Buffer.from(permit.pdfData, 'base64'),
            contentType: 'application/pdf'
          });
        }
        
        if (permit?.optionalDocs) {
          if (Buffer.isBuffer(permit.optionalDocs)) {
            emailAttachments.push({
              filename: `Documentacion_Adicional.pdf`,
              content: permit.optionalDocs,
              contentType: 'application/pdf'
            });
          } else if (typeof permit.optionalDocs === 'string') {
            emailAttachments.push({
              filename: `Documentacion_Adicional.pdf`,
              content: Buffer.from(permit.optionalDocs, 'base64'),
              contentType: 'application/pdf'
            });
          }
        }

        const emailSubject = `Nueva Visita de Mantenimiento Asignada - ${workData?.propertyAddress || 'Obra'}`;
        const emailText = `Hola ${staff.name},\n\nSe te ha asignado una nueva visita de mantenimiento:\n\n` +
          `📍 Dirección: ${workData?.propertyAddress || 'N/A'}\n` +
          `🔢 Visita #${createdVisit.visitNumber}\n` +
          `📅 Fecha programada: ${scheduledDateFormatted}\n` +
          `📋 Estado: Pendiente de programar\n` +
          (permit?.permitNumber ? `🎫 Permiso: ${permit.permitNumber}\n` : '') +
          (permit?.systemType ? `🔧 Sistema: ${permit.systemType}\n` : '') +
          (permit?.applicantName ? `👤 Cliente: ${permit.applicantName}\n` : '') +
          (createdVisit.notes ? `\n📝 Notas: ${createdVisit.notes}\n` : '') +
          `\nPor favor, revisa los detalles en la aplicación móvil.\n\nSaludos.`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h2 style="color: #1a365d; border-bottom: 3px solid #1a365d; padding-bottom: 10px;">
              🔧 Nueva Visita de Mantenimiento Asignada
            </h2>
            <p>Hola <strong>${staff.name}</strong>,</p>
            <p>Se te ha asignado una nueva visita de mantenimiento:</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>📍 Dirección:</strong></td>
                  <td style="padding: 8px 0;">${workData?.propertyAddress || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>🔢 Visita:</strong></td>
                  <td style="padding: 8px 0;">#${createdVisit.visitNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>📅 Fecha programada:</strong></td>
                  <td style="padding: 8px 0;"><strong style="color: #2d3748;">${scheduledDateFormatted}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>📋 Estado:</strong></td>
                  <td style="padding: 8px 0;">
                    <span style="background: #718096; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                      Pendiente de programar
                    </span>
                  </td>
                </tr>
                ${permit?.permitNumber ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>🎫 Permiso:</strong></td>
                  <td style="padding: 8px 0;">${permit.permitNumber}</td>
                </tr>` : ''}
                ${permit?.systemType ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>🔧 Sistema:</strong></td>
                  <td style="padding: 8px 0;">${permit.systemType}</td>
                </tr>` : ''}
                ${permit?.applicantName ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;"><strong>👤 Cliente:</strong></td>
                  <td style="padding: 8px 0;">${permit.applicantName}</td>
                </tr>` : ''}
              </table>
            </div>
            
            ${createdVisit.notes ? `
            <div style="background: #fff5e6; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📝 Notas:</strong></p>
              <p style="margin: 10px 0 0 0;">${createdVisit.notes}</p>
            </div>` : ''}
            
            ${emailAttachments.length > 0 ? `
            <div style="background: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📎 Documentos adjuntos:</strong></p>
              <p style="margin: 10px 0 0 0;">Se han adjuntado los documentos del permiso para tu referencia.</p>
            </div>` : ''}
            
            <p style="margin-top: 30px;">Por favor, revisa los detalles en la <strong>aplicación móvil</strong>.</p>
            <p style="color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              Saludos,<br>
              <strong>Sistema de Mantenimiento</strong>
            </p>
          </div>
        `;

        await sendEmail({
          to: staff.email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
          attachments: emailAttachments,
        });

        console.log(`✅ Email enviado a ${staff.email} para nueva visita ${newVisit.id}`);
      } catch (emailError) {
        console.error('❌ Error al enviar email de asignación:', emailError);
        // No fallar la request si el email falla
      }
    }

    res.status(201).json({ 
      message: 'Visita de mantenimiento creada correctamente.', 
      visit: createdVisit,
      assignedToCurrentUser: !assignedStaffId // Indicar si se asignó al usuario actual
    });
  } catch (error) {
    console.error('Error al crear visita de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Obtener mantenimientos asignados a un worker específico ---
const getAssignedMaintenances = async (req, res) => {
  try {
    const { workerId } = req.query;
    
    if (!workerId) {
      return res.status(400).json({ error: true, message: 'Se requiere workerId.' });
    }

    console.log('[getAssignedMaintenances] Buscando visitas para workerId:', workerId);

    // Traer TODAS las visitas del worker (incluyendo completadas)
    const visitsRaw = await MaintenanceVisit.findAll({
      where: {
        staffId: workerId
      },
      attributes: { 
        exclude: [] // ✅ Traer TODOS los campos de MaintenanceVisit (incluyendo system_video_url)
      },
      include: [
        { model: MaintenanceMedia, as: 'mediaFiles' },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] },
        { model: Work, as: 'work', attributes: ['idWork', 'status', 'maintenanceStartDate', 'propertyAddress'] }
      ],
      order: [['scheduledDate', 'ASC']],
    });

    // Convertir a objetos planos para manipular fácilmente
    const visits = visitsRaw.map(v => v.get({ plain: true }));

    // Recolectar direcciones para buscar Permits en una segunda consulta
    const addresses = Array.from(new Set(visits.map(v => v.work?.propertyAddress).filter(Boolean)));

    let permitsByAddress = {};
    if (addresses.length > 0) {
      const permits = await Permit.findAll({
        where: { propertyAddress: addresses },
        attributes: [
          'idPermit', 'propertyAddress', 'applicant', 'applicantName', 'systemType', 'permitNumber',
          'pdfData', 'optionalDocs', // ⚠️ Legacy fields (Buffer)
          'permitPdfUrl', 'permitPdfPublicId', 'optionalDocsUrl', 'optionalDocsPublicId' // ✅ Cloudinary URLs
        ]
      });
      permitsByAddress = permits.reduce((acc, p) => {
        acc[p.propertyAddress] = p.get({ plain: true });
        return acc;
      }, {});
    }

    // Adjuntar Permit (tanto en .permit como en .Permit) al objeto work para mantener compatibilidad
    for (const visit of visits) {
      const work = visit.work || {};
      const permit = work.propertyAddress ? permitsByAddress[work.propertyAddress] || null : null;
      // Añadir en ambas claves por compatibilidad con distintas partes del frontend
      work.permit = permit;
      work.Permit = permit;
      visit.work = work;
    }

    console.log('[getAssignedMaintenances] Encontradas', visits.length, 'visitas para el worker');
    
    // 🔍 DEBUG: Ver qué tiene la primera visita
    if (visits.length > 0) {
      console.log('🔍 DEBUG - Primera visita:', {
        id: visits[0].id,
        status: visits[0].status,
        mediaFilesCount: visits[0].mediaFiles?.length || 0,
        hasPermit: !!visits[0].work?.permit,
        permitPdfUrl: visits[0].work?.permit?.permitPdfUrl
      });
    }

    res.status(200).json({ message: 'Mantenimientos asignados obtenidos correctamente.', visits, count: visits.length });
  } catch (error) {
    console.error('Error al obtener mantenimientos asignados:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Generar token de corta duración para acceso al formulario ---
const generateMaintenanceToken = async (req, res) => {
  try {
    const { visitId } = req.params;
    const currentUserId = req.staff?.id;

    const visit = await MaintenanceVisit.findByPk(visitId, {
      include: [
        { 
          model: Staff, 
          as: 'assignedStaff', 
          attributes: ['id', 'name', 'email'] 
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({ error: true, message: 'Visita de mantenimiento no encontrada.' });
    }

    // Verificar permisos: solo el worker asignado o admin/owner/maintenance pueden generar token
    const userRole = req.staff?.role; // ✅ Corregido: 'role' no 'rol'
    const isAuthorized = 
      visit.staffId === currentUserId || // ✅ Corregido: usar staffId que es el campo correcto
      ['admin', 'owner', 'maintenance'].includes(userRole);

    if (!isAuthorized) {
      console.log('[generateMaintenanceToken] Autorización denegada:', {
        visitId: visit.id,
        visitStaffId: visit.staffId,
        currentUserId,
        userRole,
        isMatch: visit.staffId === currentUserId
      });
      return res.status(403).json({ error: true, message: 'No autorizado para generar token para esta visita.' });
    }

    // Generar token JWT de corta duración (15 minutos)
    const token = jwt.sign(
      {
        visitId: visit.id,
        staffId: visit.staffId,
        type: 'maintenance_form'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    res.status(200).json({ 
      message: 'Token generado correctamente.',
      token,
      visitId: visit.id,
      expiresIn: 900 // 15 minutos en segundos
    });
  } catch (error) {
    console.error('Error al generar token de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Completar formulario de mantenimiento ---
const completeMaintenanceVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    const files = req.files; // Objeto con arrays por fieldname cuando usamos upload.fields()
    const currentUserId = req.staff?.id;

    // LOG: Ver qué está llegando
    console.log('🔍 BACKEND - Datos recibidos para visitId:', visitId);
    console.log('🔍 BACKEND - actualVisitDate recibido:', req.body.actualVisitDate);
    console.log('🔍 BACKEND - markAsCompleted:', req.body.markAsCompleted);
    console.log('🔍 BACKEND - Archivos recibidos:', {
      maintenanceFiles: files?.maintenanceFiles?.length || 0,
      wellSample1: files?.wellSample1?.length || 0,
      wellSample2: files?.wellSample2?.length || 0,
      wellSample3: files?.wellSample3?.length || 0,
      systemVideo: files?.systemVideo?.length || 0
    });
    console.log('🔍 tank_inlet_level:', req.body.tank_inlet_level);
    console.log('🔍 tank_outlet_level:', req.body.tank_outlet_level);
    console.log('🔍 septic_access_clear:', req.body.septic_access_clear);
    console.log('🔍 needs_pumping:', req.body.needs_pumping);
    console.log('🔍 alarm_test:', req.body.alarm_test);
    console.log('🔍 pump_running:', req.body.pump_running);
    console.log('🔍 float_switches:', req.body.float_switches);
    console.log('🔍 alarm_working:', req.body.alarm_working);

    // Extraer todos los campos del formulario
    const {
      // Fecha de la visita
      actualVisitDate,
      
      // Niveles del tanque
      tank_inlet_level,
      tank_inlet_notes,
      tank_outlet_level,
      tank_outlet_notes,
      
      // Niveles (legacy - mantener por compatibilidad)
      level_inlet,
      level_outlet,
      
      // Inspección General
      strong_odors,
      strong_odors_notes,
      water_level_ok,
      water_level_notes,
      visible_leaks,
      visible_leaks_notes,
      area_around_dry,
      area_around_notes,
      septic_access_clear,
      septic_access_notes,
      cap_green_inspected,
      cap_green_notes,
      needs_pumping,
      needs_pumping_notes,
      
      // Sistema ATU
      blower_working,
      blower_working_notes,
      blower_filter_clean,
      blower_filter_notes,
      diffusers_bubbling,
      diffusers_bubbling_notes,
      discharge_pump_ok,
      discharge_pump_notes,
      clarified_water_outlet,
      clarified_water_notes,
      alarm_test,
      alarm_test_notes,
      
      // Lift Station
      pump_running,
      pump_running_notes,
      float_switches,
      float_switches_notes,
      alarm_working,
      alarm_working_notes,
      pump_condition,
      pump_condition_notes,
      alarm_panel_working,
      alarm_panel_notes,
      pump_working,
      pump_working_notes,
      float_switch_good,
      float_switch_notes,
      
      // PBTS
      well_samples, // JSON string
      
      // PBTS/ATU - Nuevos campos
      well_points_quantity,
      well_sample_1_observations,
      well_sample_1_notes,
      well_sample_2_observations,
      well_sample_2_notes,
      well_sample_3_observations,
      well_sample_3_notes,
      
      // Lift Station - Opcionales
      has_lift_station,
      
      // PBTS - Opcionales
      has_pbts,
      
      // VIDEO
      system_video_url,
      
      // Generales
      general_notes,
      markAsCompleted, // Indica si se debe cambiar el estado a 'completed'
      
      // Archivos asociados a campos específicos (JSON string con mapeo)
      fileFieldMapping, // Ej: {"file1.jpg": "strong_odors", "file2.mp4": "general"}
    } = req.body;

    const visit = await MaintenanceVisit.findByPk(visitId);
    if (!visit) {
      return res.status(404).json({ error: true, message: 'Visita de mantenimiento no encontrada.' });
    }

    // Verificar permisos
    const userRole = req.staff?.rol;
    const isAuthorized = 
      visit.staffId === currentUserId || 
      ['admin', 'owner', 'maintenance'].includes(userRole);

    if (!isAuthorized) {
      return res.status(403).json({ error: true, message: 'No autorizado para completar esta visita.' });
    }

    // Actualizar campos del formulario
    // Niveles del tanque (nuevos campos)
    visit.tank_inlet_level = tank_inlet_level || null;
    visit.tank_inlet_notes = tank_inlet_notes || null;
    visit.tank_outlet_level = tank_outlet_level || null;
    visit.tank_outlet_notes = tank_outlet_notes || null;
    
    // Niveles legacy (mantener por compatibilidad)
    visit.level_inlet = level_inlet || tank_inlet_level || null;
    visit.level_outlet = level_outlet || tank_outlet_level || null;
    
    // Inspección General
    visit.strong_odors = strong_odors === 'true' || strong_odors === true;
    visit.strong_odors_notes = strong_odors_notes || null;
    visit.water_level_ok = water_level_ok === 'true' || water_level_ok === true;
    visit.water_level_notes = water_level_notes || null;
    visit.visible_leaks = visible_leaks === 'true' || visible_leaks === true;
    visit.visible_leaks_notes = visible_leaks_notes || null;
    visit.area_around_dry = area_around_dry === 'true' || area_around_dry === true;
    visit.area_around_notes = area_around_notes || null;
    visit.septic_access_clear = septic_access_clear === 'true' || septic_access_clear === true || septic_access_clear === 'SI';
    visit.septic_access_notes = septic_access_notes || null;
    visit.cap_green_inspected = cap_green_inspected === 'true' || cap_green_inspected === true || cap_green_inspected === 'SI';
    visit.cap_green_notes = cap_green_notes || null;
    visit.needs_pumping = needs_pumping === 'true' || needs_pumping === true || needs_pumping === 'SI';
    visit.needs_pumping_notes = needs_pumping_notes || null;
    
    // Sistema ATU
    visit.blower_working = blower_working === 'true' || blower_working === true;
    visit.blower_working_notes = blower_working_notes || null;
    visit.blower_filter_clean = blower_filter_clean === 'true' || blower_filter_clean === true;
    visit.blower_filter_notes = blower_filter_notes || null;
    visit.diffusers_bubbling = diffusers_bubbling === 'true' || diffusers_bubbling === true;
    visit.diffusers_bubbling_notes = diffusers_bubbling_notes || null;
    visit.discharge_pump_ok = discharge_pump_ok === 'true' || discharge_pump_ok === true || discharge_pump_ok === 'SI';
    visit.discharge_pump_notes = discharge_pump_notes || null;
    visit.clarified_water_outlet = clarified_water_outlet === 'true' || clarified_water_outlet === true;
    visit.clarified_water_notes = clarified_water_notes || null;
    visit.alarm_test = alarm_test === 'true' || alarm_test === true || alarm_test === 'SI';
    visit.alarm_test_notes = alarm_test_notes || null;
    
    // Lift Station - OPCIONALES
    console.log('🔍 BACKEND - has_lift_station recibido:', has_lift_station, 'tipo:', typeof has_lift_station);
    visit.has_lift_station = has_lift_station === 'true' || has_lift_station === true;
    console.log('🔍 BACKEND - has_lift_station guardado:', visit.has_lift_station);
    visit.pump_running = pump_running === 'true' || pump_running === true || pump_running === 'SI';
    visit.pump_running_notes = pump_running_notes || null;
    visit.float_switches = float_switches === 'true' || float_switches === true || float_switches === 'SI';
    visit.float_switches_notes = float_switches_notes || null;
    visit.alarm_working = alarm_working === 'true' || alarm_working === true || alarm_working === 'SI';
    visit.alarm_working_notes = alarm_working_notes || null;
    visit.pump_condition = pump_condition === 'true' || pump_condition === true || pump_condition === 'SI';
    visit.pump_condition_notes = pump_condition_notes || null;
    visit.alarm_panel_working = alarm_panel_working === 'true' || alarm_panel_working === true;
    visit.alarm_panel_notes = alarm_panel_notes || null;
    visit.pump_working = pump_working === 'true' || pump_working === true;
    visit.pump_working_notes = pump_working_notes || null;
    visit.float_switch_good = float_switch_good === 'true' || float_switch_good === true;
    visit.float_switch_notes = float_switch_notes || null;
    
    // PBTS - OPCIONALES
    console.log('🔍 BACKEND - has_pbts recibido:', has_pbts, 'tipo:', typeof has_pbts);
    visit.has_pbts = has_pbts === 'true' || has_pbts === true;
    console.log('🔍 BACKEND - has_pbts guardado:', visit.has_pbts);
    
    // PBTS - parsear JSON
    if (well_samples) {
      try {
        visit.well_samples = typeof well_samples === 'string' ? JSON.parse(well_samples) : well_samples;
      } catch (e) {
        console.error('Error parsing well_samples:', e);
        visit.well_samples = [];
      }
    }
    
    // PBTS/ATU - Cantidad de well points
    if (well_points_quantity) {
      visit.well_points_quantity = parseInt(well_points_quantity, 10);
    }
    
    // PBTS - Observaciones y notas adicionales
    visit.well_sample_1_observations = well_sample_1_observations || null;
    visit.well_sample_1_notes = well_sample_1_notes || null;
    visit.well_sample_2_observations = well_sample_2_observations || null;
    visit.well_sample_2_notes = well_sample_2_notes || null;
    visit.well_sample_3_observations = well_sample_3_observations || null;
    visit.well_sample_3_notes = well_sample_3_notes || null;
    
    // Video del sistema
    visit.system_video_url = system_video_url || null;
    
    visit.general_notes = general_notes || null;
    
    // Solo marcar como completado si se indica explícitamente
    if (markAsCompleted === 'true' || markAsCompleted === true) {
      // Usar la fecha seleccionada por el usuario, o la fecha actual si no se proporcionó
      visit.actualVisitDate = actualVisitDate || new Date().toISOString().split('T')[0];
      visit.status = 'completed';
      visit.completed_by_staff_id = currentUserId;
    } else {
      // Guardar progreso sin completar - guardar la fecha si se proporcionó
      if (actualVisitDate) {
        visit.actualVisitDate = actualVisitDate;
      }
      if (visit.status === 'pending_scheduling' || visit.status === 'scheduled') {
        visit.status = 'assigned'; // Cambiar a 'en proceso'
      }
    }

    await visit.save();

    // Procesar imágenes de muestras PBTS/ATU específicas
    const sampleFields = ['wellSample1', 'wellSample2', 'wellSample3'];
    for (let i = 0; i < sampleFields.length; i++) {
      const fieldName = sampleFields[i];
      const fileArray = files?.[fieldName]; // Con upload.fields(), files es un objeto
      
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0]; // Tomar el primer archivo
        try {
          const cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
            folder: `maintenance/${visit.workId}/${visit.id}/well_samples`,
            resource_type: 'image',
          });
          
          // Guardar URL en el campo correspondiente
          const urlField = `well_sample_${i + 1}_url`;
          visit[urlField] = cloudinaryResult.secure_url;
        } catch (error) {
          console.error(`❌ Error subiendo muestra ${i + 1}:`, error);
        }
      }
    }
    
    await visit.save(); // Guardar nuevamente con las URLs de las muestras

    // Procesar video del sistema (systemVideo)
    const systemVideoArray = files?.systemVideo;
    console.log('🎬 DEBUG - systemVideoArray:', systemVideoArray ? `${systemVideoArray.length} archivo(s)` : 'undefined');
    
    if (systemVideoArray && systemVideoArray.length > 0) {
      const videoFile = systemVideoArray[0];
      try {
        console.log('🎬 Subiendo video del sistema:', videoFile.originalname, `(${Math.round(videoFile.size / 1024 / 1024)}MB)`);
        const cloudinaryResult = await uploadBufferToCloudinary(videoFile.buffer, {
          folder: `maintenance/${visit.workId}/${visit.id}/system_video`,
          resource_type: 'video',
        });
        
        visit.system_video_url = cloudinaryResult.secure_url;
        await visit.save();
        console.log('✅ Video del sistema guardado en DB:', cloudinaryResult.secure_url);
      } catch (error) {
        console.error('❌ Error subiendo video del sistema:', error);
      }
    } else {
      console.log('⚠️ No se recibió video del sistema en esta llamada');
    }

    // Procesar archivos subidos (maintenanceFiles)
    const uploadedMedia = [];
    const maintenanceFiles = files?.maintenanceFiles || []; // Extraer array de maintenanceFiles
    
    // Parsear el mapeo de archivos enviado desde el frontend (objeto: filename -> fieldName)
    let parsedFileMapping = {};
    try {
      parsedFileMapping = fileFieldMapping ? JSON.parse(fileFieldMapping) : {};
    } catch (e) {
      console.error('❌ Error parseando fileFieldMapping:', e);
    }
    
    console.log('📸 Archivos recibidos:', maintenanceFiles.length);
    console.log('📸 fileFieldMapping:', parsedFileMapping);
    
    if (maintenanceFiles.length > 0) {
      for (let i = 0; i < maintenanceFiles.length; i++) {
        const file = maintenanceFiles[i];
        // Obtener el fieldName del mapping usando el nombre del archivo
        const fieldName = parsedFileMapping[file.originalname] || 'general';
        
        console.log(`📸 Procesando archivo ${i + 1}/${maintenanceFiles.length}: ${file.originalname} -> campo: ${fieldName}`);
        
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : (file.mimetype.startsWith('image/') ? 'image' : 'raw');
        const cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
          folder: `maintenance/${visit.workId}/${visit.id}`,
          resource_type: resourceType,
        });

        const newMedia = await MaintenanceMedia.create({
          maintenanceVisitId: visit.id,
          mediaUrl: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id,
          mediaType: resourceType === 'raw' ? 'document' : resourceType,
          originalName: file.originalname,
          fieldName: fieldName, // Usar el fieldName del mapping
        });
        uploadedMedia.push(newMedia);
        console.log(`✅ Archivo guardado con fieldName: ${fieldName}`);
      }
    }

    // Obtener la visita actualizada con todas las relaciones
    const updatedVisit = await MaintenanceVisit.findByPk(visitId, {
      include: [
        { model: MaintenanceMedia, as: 'mediaFiles' },
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] },
        {
          model: Work,
          as: 'work',
          include: [
            {
              model: Permit,
              attributes: [
                'idPermit', 'permitNumber', 'expirationDate', 'systemType',
                'applicantName', 'applicantEmail', 'applicantPhone',
                'propertyAddress', 
                'pdfData', 'optionalDocs', // Legacy Buffer fields
                'permitPdfUrl', 'permitPdfPublicId', 'optionalDocsUrl', 'optionalDocsPublicId', // ✅ Cloudinary URLs
                'gpdCapacity', 'squareFeetSystem', 'pump', 'isPBTS'
              ]
            }
          ]
        }
      ]
    });

    const isCompleted = visit.status === 'completed';
    const message = isCompleted 
      ? 'Mantenimiento completado correctamente.' 
      : 'Progreso de mantenimiento guardado exitosamente.';

    console.log('✅ BACKEND - Enviando respuesta:', {
      message,
      visitId: updatedVisit.id,
      status: updatedVisit.status,
      actualVisitDate: updatedVisit.actualVisitDate,
      mediaFilesCount: updatedVisit.mediaFiles?.length || 0,
      uploadedFilesNow: uploadedMedia.length,
      systemVideoUrl: updatedVisit.system_video_url // ✅ Agregar para debug
    });

    res.status(200).json({ 
      message,
      visit: updatedVisit,
      uploadedFiles: uploadedMedia.length,
      status: visit.status,
      isCompleted
    });
  } catch (error) {
    console.error('Error al completar formulario de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// --- Obtener todas las visitas completadas (para Owner/Admin) ---
const getAllCompletedMaintenances = async (req, res) => {
  try {
    const { status, workId, startDate, endDate } = req.query;

    const whereClause = {};
    
    // ✅ Filtrar por estado(s) - puede ser un estado o múltiples separados por coma
    if (status && status !== 'all') {
      // Si contiene comas, dividir en array
      if (status.includes(',')) {
        const statusArray = status.split(',').map(s => s.trim());
        whereClause.status = { [Op.in]: statusArray };
      } else {
        whereClause.status = status;
      }
    }
    // Si status es 'all' o undefined, NO filtramos por status (devolvemos todas)

    // Filtrar por work específico
    if (workId) {
      whereClause.workId = workId;
    }

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      whereClause.actualVisitDate = {};
      if (startDate) {
        whereClause.actualVisitDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.actualVisitDate[Op.lte] = new Date(endDate);
      }
    }

    const visits = await MaintenanceVisit.findAll({
      where: whereClause,
      include: [
        { model: MaintenanceMedia, as: 'mediaFiles' },
        { 
          model: Staff, 
          as: 'assignedStaff', 
          attributes: ['id', 'name', 'email'] 
        },
        {
          model: Staff,
          as: 'completedByStaff',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Work,
          as: 'work',
          attributes: ['idWork', 'status', 'propertyAddress', 'maintenanceStartDate'],
          include: [
            {
              model: Permit,
              attributes: [
                'idPermit', 'permitNumber', 'systemType',
                'applicantName', 'applicantEmail', 'applicantPhone',
                'propertyAddress', 'pdfData', 'optionalDocs', 'isPBTS'
              ]
            }
          ]
        }
      ],
      order: [['actualVisitDate', 'DESC']],
    });

    res.status(200).json({
      message: 'Visitas obtenidas correctamente',
      visits,
      count: visits.length
    });
  } catch (error) {
    console.error('Error al obtener visitas completadas:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// ===== GENERAR Y DESCARGAR PDF DE VISITA DE MANTENIMIENTO =====
const downloadMaintenancePDF = async (req, res) => {
  try {
    const { visitId } = req.params;
    console.log(`📄 Generando PDF para visita: ${visitId}`);

    // Obtener datos completos de la visita
    const visit = await MaintenanceVisit.findByPk(visitId, {
      include: [
        {
          model: Work,
          as: 'work',
          include: [
            {
              model: Permit
            }
          ]
        },
        {
          model: Staff,
          as: 'assignedStaff',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Staff,
          as: 'completedByStaff',
          attributes: ['id', 'name', 'email']
        },
        {
          model: MaintenanceMedia,
          as: 'mediaFiles'
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({ error: true, message: 'Visita de mantenimiento no encontrada.' });
    }

    // Verificar permisos: worker asignado, completador, o admin/owner
    const currentUserId = req.staff?.id;
    const userRole = req.staff?.rol || req.staff?.role; // Puede ser 'rol' o 'role'
    
    console.log('🔍 DEBUG PDF Download:');
    console.log('  Current User ID:', currentUserId);
    console.log('  User Role:', userRole);
    console.log('  Visit Staff ID:', visit.staffId);
    console.log('  Completed By Staff ID:', visit.completed_by_staff_id);
    
    const isAuthorized = 
      visit.staffId === currentUserId || 
      visit.completed_by_staff_id === currentUserId ||
      ['admin', 'owner', 'maintenance', 'worker'].includes(userRole?.toLowerCase());

    if (!isAuthorized) {
      console.log('❌ Acceso denegado para usuario:', currentUserId, 'con rol:', userRole);
      return res.status(403).json({ 
        error: true, 
        message: 'No tienes permiso para descargar este reporte.' 
      });
    }

    console.log('✅ Acceso autorizado para usuario:', currentUserId, 'con rol:', userRole);

    // PERMITIR descargar PDF aunque no esté completada (para preview)
    // Solo advertir si no está completada
    if (visit.status !== 'completed') {
      console.log(`⚠️ Generando PDF de visita en progreso (status: ${visit.status})`);
    }

    // Generar el PDF
    const visitJSON = visit.toJSON();
    const pdfPath = await generateMaintenancePDF(visitJSON);

    // Verificar que el archivo existe
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ El archivo PDF no se generó correctamente');
      return res.status(500).json({ error: true, message: 'Error al generar el PDF.' });
    }

    // Enviar el archivo
    const fileName = `maintenance_visit_${visit.visit_number || visitId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Eliminar el archivo después de enviarlo (opcional)
    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            console.log(`🗑️ Archivo temporal eliminado: ${pdfPath}`);
          }
        } catch (err) {
          console.error('Error al eliminar archivo temporal:', err);
        }
      }, 1000); // Esperar 1 segundo antes de eliminar
    });

  } catch (error) {
    console.error('❌ Error al generar PDF de mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al generar PDF.' });
  }
};

module.exports = {
  scheduleInitialMaintenanceVisits, // Exportar para uso interno
  scheduleMaintenanceVisits, // Nueva función para programar manualmente
  initializeHistoricalMaintenance, // Nueva función para mantenimiento histórico
  createMaintenanceVisit, // Nueva función para crear visita individual
  getMaintenanceVisitsForWork,
  updateMaintenanceVisit,
  addMediaToMaintenanceVisit,
  deleteMaintenanceMedia,
  getAssignedMaintenances, // ⭐ Nueva función
  generateMaintenanceToken, // ⭐ Nueva función
  completeMaintenanceVisit, // ⭐ Nueva función
  getAllCompletedMaintenances, // ⭐ Para Owner/Admin
  downloadMaintenancePDF, // 📄 Generar PDF
};