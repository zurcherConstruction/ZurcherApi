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


// --- Programar visitas de mantenimiento manualmente ---
const scheduleMaintenanceVisits = async (req, res) => {
  try {
    const { workId } = req.params;
    const { startDate, forceReschedule } = req.body; // Agregar flag para forzar reprogramación
    
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
    }

    // Verificar si ya existen visitas
    const existingVisitsCount = await MaintenanceVisit.count({ where: { workId } });
    
    if (existingVisitsCount > 0) {
      if (!forceReschedule) {
        return res.status(400).json({ 
          error: true, 
          message: 'Ya existen visitas programadas para esta obra. Use forceReschedule=true para reprogramar.',
          existingVisits: existingVisitsCount 
        });
      }
      
      // Si forceReschedule es true, eliminar visitas existentes
      await MaintenanceVisit.destroy({ where: { workId } });
      console.log(`Eliminadas ${existingVisitsCount} visitas existentes para reprogramar.`);
    }

    // Usar la fecha proporcionada o la fecha actual
    const baseDate = startDate ? new Date(startDate) : new Date();
    
    // Crear las 4 visitas de mantenimiento
    const visits = [];
    for (let i = 1; i <= 4; i++) {
      const scheduledDateForVisit = addMonths(baseDate, i * 6);
      const formattedScheduledDate = format(scheduledDateForVisit, 'yyyy-MM-dd');
      
      const newVisit = await MaintenanceVisit.create({
        workId,
        visitNumber: i,
        scheduledDate: formattedScheduledDate,
        status: 'pending_scheduling',
      });
      visits.push(newVisit);
    }

    // Actualizar la fecha de inicio de mantenimiento en la obra si se proporcionó
    if (startDate && !work.maintenanceStartDate) {
      work.maintenanceStartDate = startDate;
      await work.save();
    }

    res.status(201).json({ 
      message: 'Visitas de mantenimiento programadas correctamente.', 
      visits,
      work: work,
      rescheduled: existingVisitsCount > 0
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
        { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] }
      ]
    });

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

module.exports = {
  scheduleInitialMaintenanceVisits, // Exportar para uso interno
  scheduleMaintenanceVisits, // Nueva función para programar manualmente
  initializeHistoricalMaintenance, // Nueva función para mantenimiento histórico
  createMaintenanceVisit, // Nueva función para crear visita individual
  getMaintenanceVisitsForWork,
  updateMaintenanceVisit,
  addMediaToMaintenanceVisit,
  deleteMaintenanceMedia,
};