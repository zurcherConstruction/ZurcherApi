const { Work, MaintenanceVisit, MaintenanceMedia, Staff } = require('../data');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUploader');
const { Op } = require('sequelize');
const { addMonths, format, parseISO  } = require('date-fns'); // Para manipulación de fechas

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

   const baseDate = new Date(work.maintenanceStartDate); // Usa el maintenanceStartDate de la obra
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
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] } // Incluir datos del staff asignado
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
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] } // Crucial for frontend update
      ]});

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
        const media = await MaintenanceMedia.findByPk(mediaId);

        if (!media) {
            return res.status(404).json({ error: true, message: 'Archivo multimedia no encontrado.' });
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


module.exports = {
  scheduleInitialMaintenanceVisits, // Exportar para uso interno
  getMaintenanceVisitsForWork,
  updateMaintenanceVisit,
  addMediaToMaintenanceVisit,
  deleteMaintenanceMedia,
};