const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet, Receipt, NotificationApp } = require('../data');
const { sendEmail } = require('../utils/notifications/emailService');
const { getNotificationDetails } = require('../utils/notifications/notificationService');
const { getNotificationDetailsApp } = require('../utils/notifications/notificationServiceApp');
const convertPdfDataToUrl = require('../utils/convertPdfDataToUrl');
const { sendNotifications } = require('../utils/notifications/notificationManager');


const createWork = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // <---- Agregar este console.log
    const { idBudget } = req.body;

    // Buscar el presupuesto con estado "approved"
    const budget = await Budget.findOne({
      where: { idBudget, status: 'approved' },
      include: [{ model: Permit }], // Incluir el permiso relacionado
    });

    if (!budget) {
      return res.status(404).json({ error: true, message: 'Presupuesto no encontrado o no aprobado' });
    }

    // Verificar si ya existe un Work asociado al Budget
    const existingWork = await Work.findOne({ where: { propertyAddress: budget.propertyAddress } });
    if (existingWork) {
      return res.status(400).json({ error: true, message: 'Ya existe una obra asociada a este presupuesto' });
    }

    // Crear la obra
    const work = await Work.create({
      propertyAddress: budget.propertyAddress,
      status: 'pending', // Estado inicial
      idBudget: budget.idBudget, // Asociar el presupuesto
      notes: `Work creado a partir del presupuesto N° ${idBudget}`,
    });

    // Enviar notificaciones (correo y push)
    console.log('Work creado:', work);
    await sendNotifications('pending', work, req.app.get('io'));

    res.status(201).json({ message: 'Obra creada correctamente', work });
  } catch (error) {
    console.error('Error al crear la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener todas las obras
const getWorks = async (req, res) => {
  try {
    const works = await Work.findAll({
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'initialPayment', 'date'],
        },
        {
          model: Permit,
          attributes: ['idPermit', 'propertyAddress', 'applicantName'],
        },
      ],
    });

    // Filtrar el campo startDate si no está asignado
    const filteredWorks = works.map((work) => {
      const plainWork = work.get({ plain: true }); // Convertir a objeto plano
      if (!plainWork.startDate) {
        delete plainWork.startDate; // Eliminar el campo si no está asignado
      }
      return plainWork;
    });

    res.status(200).json(filteredWorks);
  } catch (error) {
    console.error('Error al obtener las obras:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener una obra por ID
const getWorkById = async (req, res) => {
  try {
    const { idWork } = req.params;
    const work = await Work.findByPk(idWork, {
      include: [
        {

          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'paymentProofType', 'initialPayment', 'date', 'applicantName','totalPrice', 'initialPaymentPercentage'],
        },
        {

          model: Permit,
          attributes: [
            'idPermit',
            'propertyAddress',
            'permitNumber',
            'applicantName',
            'pdfData',
            'optionalDocs',
          ],
        },
        {
          model: Material,
          attributes: ['idMaterial', 'name', 'quantity', 'cost'],
        },
        {
          model: Inspection,
          attributes: [
            'idInspection',

            'type',
            'status',
            'dateRequested',
            'dateCompleted',
            'notes',
          ],
        },
        {
          model: InstallationDetail,
          as: 'installationDetails',
          attributes: ['idInstallationDetail', 'date', 'extraDetails', 'extraMaterials', 'images'],
        },
        {
          model: MaterialSet,
          as: 'MaterialSets',
          attributes: ['idMaterialSet', 'invoiceFile', 'totalCost'],
        },
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageData', 'comment', 'truckCount'],
        },
        {
          model: Receipt,
          as: 'Receipts',
          attributes: ['idReceipt', 'type', 'notes', 'fileUrl', 'publicId', 'mimeType', 'originalName','createdAt'],
        },
      ],
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }
    console.log("Receipts antes de procesar:", work.Receipts);
    // Convertir los datos de los comprobantes (Receipts) a URLs base64
    const workWithReceipts = {
      ...work.get({ plain: true }), // Convertir a objeto plano
      Receipts: work.Receipts ? convertPdfDataToUrl(work.Receipts) : [],
    };
    console.log("Receipts después de procesar:", workWithReceipts.Receipts);

    // Agregar información del presupuesto (Budget) si no está incluida en la relación
    if (!workWithReceipts.budget) {
      const budget = await Budget.findOne({ where: { propertyAddress: work.propertyAddress } });
      workWithReceipts.budget = budget
        ? {
          idBudget: budget.idBudget,
          propertyAddress: budget.propertyAddress,
          status: budget.status,

          initialPayment: budget.initialPayment,
          paymentInvoice: budget.paymentInvoice,
          date: budget.date,
        }
        : null;
    }

    // Enviar la respuesta con la obra y sus relaciones
    res.status(200).json(workWithReceipts);
  } catch (error) {
    console.error('Error al obtener la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Actualizar una obra
const updateWork = async (req, res) => {
  try {
    const { idWork } = req.params;
    const { propertyAddress, status, startDate, notes, staffId } = req.body;

    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }
    // --- Guardar el estado anterior ---
    const oldStatus = work.status;
    let statusChanged = false;

    // --- Actualizar los campos ---
    work.propertyAddress = propertyAddress || work.propertyAddress;

    // Manejar la actualización del estado y la fecha de inicio
    if (status && status !== oldStatus) {
      work.status = status;
      statusChanged = true;
      // Lógica especial para 'inProgress': solo establece startDate si no existe
      if (status === 'inProgress' && !work.startDate) {
        work.startDate = new Date();
      }
    }
    // Actualizar los campos
    work.propertyAddress = propertyAddress || work.propertyAddress;
    work.status = status || work.status;
    work.startDate = startDate || work.startDate; // Asignar la fecha de inicio;
    work.staffId = staffId || work.staffId; // Asignar el ID del empleado;
    work.notes = notes || work.notes;


    await work.save();

    // --- Enviar notificaciones SOLO SI el estado cambió ---
    if (statusChanged) {
      console.log(`Work ${idWork}: Status changed from '${oldStatus}' to '${work.status}'. Sending notifications...`);
      try {
        // Llamar a sendNotifications con el NUEVO estado y el objeto work actualizado
        // Asumimos que sendNotifications usa notificationService internamente
        await sendNotifications(work.status, work, req.app.get('io')); // Pasar io si es necesario para push
        console.log(`Notifications sent for status '${work.status}'.`);
      } catch (notificationError) {
        // Capturar errores específicos de la configuración de notificaciones
        console.error(`Error sending notifications for work ${idWork} status ${work.status}:`, notificationError);
        // Podrías decidir si continuar o devolver un error específico
        if (notificationError.message.includes('Estado de notificación no configurado')) {
          // No detener la operación principal, pero informar el problema
          console.warn(notificationError.message);
        } else {
          // Otro error inesperado al enviar notificaciones
          // Considera si esto debe fallar la solicitud completa o solo registrarse
        }
      }
    } else if (status && status === oldStatus) {
       console.log(`Work ${idWork}: Status received ('${status}') is the same as current ('${oldStatus}'). No notifications sent.`);
    } else {
       console.log(`Work ${idWork}: Status not provided or not changed. No status notifications sent.`);
    }

    // --- Eliminar la lógica redundante de notificación manual ---
    // await sendNotifications('assigned', notificationDetails, null, req.io); // INCORRECTO Y REDUNDANTE
    // const notificationDetails = await getNotificationDetails(status, work); // REDUNDANTE
    // console.log('Detalles de notificación:', notificationDetails); // REDUNDANTE
    // if (notificationDetails) { ... } // BUCLE DE EMAIL REDUNDANTE

    // Devolver la obra actualizada
    res.status(200).json(work);

  } catch (error) {
    console.error(`Error al actualizar la obra ${req.params.idWork}:`, error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al actualizar la obra' });
  }
};


// Eliminar una obra
const deleteWork = async (req, res) => {
  try {
    const { idWork } = req.params;

    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    await work.destroy();
    res.status(200).json({ message: 'Obra eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};
const addInstallationDetail = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { idWork } = req.params; // ID del Work al que se asociará el detalle
    const { date, extraDetails, extraMaterials, images } = req.body;

    // Verificar que el Work exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Crear el detalle de instalación
    const installationDetail = await InstallationDetail.create({
      idWork,
      date,
      extraDetails,
      extraMaterials,
      images,
    });

    // --- Actualizar el estado del Work a "installed" ---
    const oldStatus = work.status; // Guardar estado anterior por si acaso
    work.status = 'installed';
    await work.save();
    const statusChanged = work.status !== oldStatus; // Verificar si realmente cambió

    // --- INICIO: Enviar Notificación ---
    if (statusChanged) { // Solo notificar si el estado cambió a 'installed'
      console.log(`Work ${idWork}: Status changed to '${work.status}'. Sending 'installed' notifications...`);
      try {
        // Usar el estado 'installed' y el objeto work actualizado
        await sendNotifications(work.status, work, null, req.app.get('io')); // Pasas work, null para budget, y io
        console.log(`Notifications sent for status '${work.status}'.`);
      } catch (notificationError) {
        console.error(`Error sending notifications for work ${idWork} status ${work.status}:`, notificationError);
        // Manejar el error como en updateWork (opcionalmente)
        if (notificationError.message.includes('Estado de notificación no configurado')) {
          console.warn(notificationError.message);
        }
      }
    }
    // --- FIN: Enviar Notificación ---

    res.status(201).json({
      message: 'Detalle de instalación agregado correctamente y estado actualizado a installed.',
      installationDetail,
      work, // Devolver el work actualizado
    });
  } catch (error) {
    console.error('Error al agregar el detalle de instalación:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const attachInvoiceToWork = async (req, res) => {
  try {
    const { idWork } = req.params; // ID de la obra
    const { totalCost } = req.body; // Costo total enviado en el cuerpo de la solicitud

    // Verificar si se subió un archivo
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se subió ningún archivo' });
    }

    // Obtener el nombre del archivo subido
    const invoiceFile = req.file.filename;

    // Verificar que la obra exista
    const work = await Work.findByPk(idWork, {
      include: [
        {
          model: MaterialSet,
          as: 'MaterialSets',
        },
      ],
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Crear o actualizar el conjunto de materiales asociado a la obra
    let materialSet = work.MaterialSets[0]; // Asumimos que hay un único conjunto de materiales
    if (!materialSet) {
      materialSet = await MaterialSet.create({
        workId: idWork,
        invoiceFile,
        totalCost,
      });
    } else {
      materialSet.invoiceFile = invoiceFile;
      materialSet.totalCost = totalCost;
      await materialSet.save();
    }

    res.status(200).json({
      message: 'Factura y costo total guardados correctamente',
      materialSet,
    });
  } catch (error) {
    console.error('Error al guardar la factura y el costo total:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const getAssignedWorks = async (req, res) => {
  try {
    console.log("Datos del usuario autenticado (req.staff):", req.staff);

    // Obtener las obras asignadas al worker autenticado
    const works = await Work.findAll({
      where: { staffId: req.staff.id }, // Filtrar por el ID del usuario autenticado
      include: [
        {
          model: Permit,
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'pdfData', 'optionalDocs'],
        },
        {
          model: Material,
          attributes: ['idMaterial', 'name', 'quantity', 'cost'],
        },
        {
          model: Inspection,
          attributes: ['idInspection', 'type', 'status', 'dateRequested', 'dateCompleted', 'notes'],
        },
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageData', 'comment', 'truckCount'],
        },
      ],
    });

    if (works.length === 0) {
      return res.status(404).json({ error: false, message: 'No tienes tareas asignadas actualmente' });
    }

    res.status(200).json({ error: false, works });
  } catch (error) {
    console.error('Error al obtener las tareas asignadas:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const addImagesToWork = async (req, res) => {
  try {
    const { idWork } = req.params; // ID del trabajo
    const { stage, image, dateTime, comment, truckCount } = req.body; // Etapa, imagen en Base64 y fecha/hora

    // Verificar que el trabajo exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Trabajo no encontrado' });
    }

    // Validar que la etapa sea válida
    const validStages = [
    'foto previa del lugar',
    'materiales',
    'foto excavación',
    'camiones de arena',
    'sistema instalado',
    'extracción de piedras',
    'camiones de tierra',
    'inspeccion final'
    ];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: true, message: 'Etapa no válida' });
    }

    // Crear el registro de la imagen
    const imageRecord = await Image.create({
      idWork,
      stage,
      imageData: image, // Guardar la imagen en Base64
      dateTime: dateTime, // Guardar la fecha y hora
      comment: comment, // Guardar el comentario
      truckCount: truckCount, // Solo si se necesita en esta etapa
    });

    res.status(201).json({
      message: 'Imagen agregada correctamente',
      imageRecord,
    });
  } catch (error) {
    console.error('Error al agregar imagen al trabajo:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const deleteImagesFromWork = async (req, res) => {
  try {
    const { idWork, imageId } = req.params; // Obtener IDs de los parámetros de la URL

    console.log(`Recibida petición para eliminar imagen ID: ${imageId} del trabajo ID: ${idWork}`);

    // Verificar que el trabajo exista (opcional pero bueno para seguridad)
    const work = await Work.findByPk(idWork);
    if (!work) {
      console.log(`Trabajo no encontrado: ${idWork}`);
      return res.status(404).json({ error: true, message: 'Trabajo no encontrado' });
    }

    // Intentar eliminar la imagen por su ID, asegurándose que pertenece al work correcto
    const result = await Image.destroy({
      where: {
        id: imageId,
        idWork: idWork // Asegura que la imagen pertenezca al trabajo especificado
      }
    });

    // Verificar si se eliminó alguna fila
    if (result === 0) {
      console.log(`Imagen no encontrada o no pertenece al trabajo: Imagen ID ${imageId}, Trabajo ID ${idWork}`);
      // Podría ser 404 Not Found o 403 Forbidden si no pertenece al trabajo
      return res.status(404).json({ error: true, message: 'Imagen no encontrada o no pertenece a este trabajo' });
    }

    console.log(`Imagen ID: ${imageId} eliminada exitosamente.`);
    // Enviar respuesta de éxito sin contenido (estándar para DELETE)
    res.status(204).send();

  } catch (error) {
    console.error('Error al eliminar imagen del trabajo:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al eliminar imagen' });
  }
};



module.exports = {
  createWork,
  getWorks,
  getWorkById,
  updateWork,
  deleteWork,
  addInstallationDetail,
  attachInvoiceToWork,
  getAssignedWorks,
  addImagesToWork,
  deleteImagesFromWork
};