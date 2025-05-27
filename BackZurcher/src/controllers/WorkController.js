const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet, Receipt, ChangeOrder, FinalInvoice, MaintenanceVisit } = require('../data');
const { sendEmail } = require('../utils/notifications/emailService');
const convertPdfDataToUrl = require('../utils/convertPdfDataToUrl');
const { sendNotifications } = require('../utils/notifications/notificationManager');
const { uploadToCloudinary, deleteFromCloudinary, uploadBufferToCloudinary } = require('../utils/cloudinaryUploader'); // Asegúrate de importar la función de subida a Cloudinary
const multer = require('multer');
const path = require('path');
const {generateAndSaveChangeOrderPDF} = require('../utils/pdfGenerator')
const fs = require('fs'); 
const { v4: uuidv4 } = require('uuid');
const { Op, literal} = require('sequelize');
const {scheduleInitialMaintenanceVisits} = require('./MaintenanceController'); // Asegúrate de importar la función de programación de mantenimientos iniciales

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
    const worksInstances = await Work.findAll({
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'initialPayment', 'paymentProofAmount', 'date'],
        },
        {
          model: Permit,
          // Asegúrate de que 'expirationDate' esté aquí
          attributes: ['idPermit', 'propertyAddress', 'applicantName', 'expirationDate', 'applicantEmail'],
        },
          {
          model: FinalInvoice,
          as: 'finalInvoice', // <--- ASEGÚRATE DE QUE ESTÉ AQUÍ
          required: false // LEFT JOIN para obtener obras aunque no tengan factura final
        }
      ],
      // Podrías querer ordenar los trabajos, por ejemplo, por fecha de creación o actualización
      order: [['createdAt', 'DESC']], 
    });

    const worksWithDetails = worksInstances.map((workInstance) => {
      const workJson = workInstance.get({ plain: true }); // Convertir a objeto plano

      // Eliminar el campo startDate si no está asignado (lógica existente)
      if (!workJson.startDate) {
        delete workJson.startDate;
      }

      // --- Calcular y añadir estado de expiración del Permit si existe ---
      if (workJson.Permit && workJson.Permit.expirationDate) {
        let permitExpirationStatus = "valid";
        let permitExpirationMessage = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expirationDateString = typeof workJson.Permit.expirationDate === 'string' 
                                    ? workJson.Permit.expirationDate.split('T')[0] 
                                    : new Date(workJson.Permit.expirationDate).toISOString().split('T')[0];
        
        const expDateParts = expirationDateString.split('-');
        const year = parseInt(expDateParts[0], 10);
        const month = parseInt(expDateParts[1], 10) - 1; // Mes es 0-indexado
        const day = parseInt(expDateParts[2], 10);

        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          const expDate = new Date(year, month, day);
          expDate.setHours(0,0,0,0);

          if (!isNaN(expDate.getTime())) {
            if (expDate < today) {
              permitExpirationStatus = "expired";
              permitExpirationMessage = `Permiso asociado expiró el ${expDate.toLocaleDateString()}.`;
            } else {
              const thirtyDaysFromNow = new Date(today);
              thirtyDaysFromNow.setDate(today.getDate() + 30);
              if (expDate <= thirtyDaysFromNow) {
                permitExpirationStatus = "soon_to_expire";
                permitExpirationMessage = `Permiso asociado expira el ${expDate.toLocaleDateString()} (pronto a vencer).`;
              }
            }
          } else {
            console.warn(`Fecha de expiración de permiso inválida (post-parse) para work ${workJson.idWork}, permit ${workJson.Permit.idPermit}: ${expirationDateString}`);
          }
        } else {
           console.warn(`Formato de fecha de expiración de permiso inválido para work ${workJson.idWork}, permit ${workJson.Permit.idPermit}: ${expirationDateString}`);
        }
        // Añadir al objeto Permit DENTRO del workJson
        workJson.Permit.expirationStatus = permitExpirationStatus;
        workJson.Permit.expirationMessage = permitExpirationMessage;
      } else if (workJson.Permit) {
        // Si hay Permit pero no expirationDate
        workJson.Permit.expirationStatus = "valid"; 
        workJson.Permit.expirationMessage = "Permiso sin fecha de expiración especificada.";
      }
      // --- Fin del cálculo de expiración ---

      return workJson;
    });

    res.status(200).json(worksWithDetails);
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
          attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'paymentProofType', 'initialPayment', 'paymentProofAmount', 'date', 'applicantName','totalPrice', 'initialPaymentPercentage'],
        },
        {

          model: Permit,
          attributes: [
            'idPermit',
            'propertyAddress',
            'permitNumber',
            'applicantName',
            'applicantEmail',
            'pdfData',
            'optionalDocs',
            'expirationDate',
          ],
        },
        {
          model: Material,
          attributes: ['idMaterial', 'name', 'quantity', 'cost'],
        },
        {
          model: Inspection,
          as: 'inspections', // <--- ASEGÚRATE DE QUE ESTE ALIAS ES EL CORRECTO (definido en data/index.js)
          attributes: [ // <--- ATRIBUTOS ACTUALIZADOS DEL MODELO INSPECTION
           'idInspection',
            'type',
            'processStatus', 
            'finalStatus',   
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected', // <--- AÑADIR ESTE CAMPO
            'dateWorkerCorrected', // <--- AÑADIR ESTE CAMPO
            'createdAt', 
            'updatedAt', // Para saber cuándo se actualizó por última vez
          ],
          // Opcional: puedes ordenar las inspecciones si una obra puede tener múltiples
          order: [['createdAt', 'DESC']], 
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
          attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount'],
        },
        {
          model: Receipt,
          as: 'Receipts',
          required: false, // Para asegurar un LEFT JOIN
          on: {
            [Op.and]: [
              // Condición para el relatedModel
              literal(`"Receipts"."relatedModel" = 'Work'`),
              // Condición para el relatedId, casteando relatedId a UUID para comparar con Work.idWork
              literal(`"Work"."idWork" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'type', 'notes', 'fileUrl', 'publicId', 'mimeType', 'originalName','createdAt'],
        },
         {
          model: ChangeOrder,
          as: 'changeOrders', // <--- ESTA ES LA INCLUSIÓN CRUCIAL
          // Opcional: puedes ordenar las COs si lo deseas
          // order: [['createdAt', 'DESC']] 
        },
        { // --- AÑADIR ESTA SECCIÓN PARA FINALINVOICE ---
          model: FinalInvoice,
          as: 'finalInvoice', // Asegúrate que este alias 'as' coincida con la definición de la relación en data/index.js (Work.hasOne(FinalInvoice, { as: 'FinalInvoice', ... }))
          required: false, // Hace que sea un LEFT JOIN, así la obra se devuelve aunque no tenga factura final
          // Opcional: puedes incluir los WorkExtraItem de la FinalInvoice si son necesarios
          // include: [{ model: WorkExtraItem, as: 'extraItems' }] 
        }
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
    const { propertyAddress, status, startDate, notes, staffId, stoneExtractionCONeeded  } = req.body;

    let workInstance = await Work.findByPk(idWork); // Renombrado a workInstance para claridad
    if (!workInstance) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }
    // --- Guardar el estado anterior ---
    const oldStatus = workInstance.status;
    const oldStoneExtractionCONeeded = workInstance.stoneExtractionCONeeded; // Guardar valor anterior para log
    let statusChanged = false;

    // --- Actualizar los campos ---
    workInstance.propertyAddress = propertyAddress || workInstance.propertyAddress;

   if (status && status !== oldStatus) {
      workInstance.status = status;
      statusChanged = true;
      if (status === 'inProgress' && !workInstance.startDate) {
        workInstance.startDate = new Date();
      }
    } // Mover la lógica de mantenimiento fuera del if (status && status !== oldStatus)
      // para que se evalúe incluso si el estado 'maintenance' no cambió pero se está actualizando la obra.

    // --- LÓGICA DE MANTENIMIENTO ---
    // Si el estado final es 'maintenance'
    if (workInstance.status === 'maintenance') {
        // Establecer maintenanceStartDate si aún no tiene una, o si la política es actualizarla siempre.
        // Para asegurar que se establezca si es null, incluso si oldStatus era 'maintenance' (caso de corrección)
        if (!workInstance.maintenanceStartDate) { 
            workInstance.maintenanceStartDate = new Date();
            console.log(`[WorkController - updateWork] Work ${idWork} IS 'maintenance' and maintenanceStartDate was NULL. SETTING MaintenanceStartDate TO: ${workInstance.maintenanceStartDate}`);
        }

        // Llamar a programar visitas SOLO si el estado CAMBIÓ a 'maintenance' desde otro estado.
          if (status === 'maintenance' && oldStatus !== 'maintenance') {
            // Si acabamos de establecer maintenanceStartDate arriba y era null, esta es la primera vez.
            // O si ya tenía una fecha pero el estado cambió de no-mantenimiento a mantenimiento.
            console.log(`[WorkController - updateWork] DETECTED status change to 'maintenance' for work ${idWork}. Old status: ${oldStatus}. MaintenanceStartDate IS: ${workInstance.maintenanceStartDate}`);
            
            // --- GUARDAR WORK ANTES DE PROGRAMAR VISITAS ---
            await workInstance.save(); // Guardar los cambios en workInstance (status, maintenanceStartDate)
            console.log(`[WorkController - updateWork] Work ${idWork} saved before calling scheduleInitialMaintenanceVisits. Status: ${workInstance.status}, MaintenanceStartDate: ${workInstance.maintenanceStartDate}`);
            // --- FIN GUARDAR WORK ---

            console.log(`[WorkController - updateWork] ATTEMPTING to call scheduleInitialMaintenanceVisits for work ${idWork}`);
            try {
              await scheduleInitialMaintenanceVisits(idWork); 
              console.log(`[WorkController - updateWork] SUCCESSFULLY CALLED scheduleInitialMaintenanceVisits for work ${idWork}`);
            } catch (scheduleError) {
              console.error(`[WorkController - updateWork] ERROR CALLING scheduleInitialMaintenanceVisits for work ${idWork}:`, scheduleError);
            }
        }
    }
    workInstance.startDate = startDate || workInstance.startDate;
    workInstance.staffId = staffId || workInstance.staffId;
    workInstance.notes = notes || workInstance.notes;
 if (typeof stoneExtractionCONeeded === 'boolean') {
      workInstance.stoneExtractionCONeeded = stoneExtractionCONeeded;
      if (oldStoneExtractionCONeeded !== stoneExtractionCONeeded) {
        console.log(`[WorkController - updateWork] ID: ${idWork}, stoneExtractionCONeeded cambiado de ${oldStoneExtractionCONeeded} a ${stoneExtractionCONeeded}`);
      }
    }

    await workInstance.save();
    // --- Enviar notificaciones SOLO SI el estado cambió ---
    if (statusChanged) {
      console.log(`Work ${idWork}: Status changed from '${oldStatus}' to '${workInstance.status}'. Sending notifications...`);
      try {
        await sendNotifications(workInstance.status, workInstance, req.app.get('io'));
        console.log(`Notifications sent for status '${workInstance.status}'.`);
      } catch (notificationError) {
        console.error(`Error sending notifications for work ${idWork} status ${workInstance.status}:`, notificationError);
        if (notificationError.message.includes('Estado de notificación no configurado')) {
          console.warn(notificationError.message);
        }
      }
    } else if (status && status === oldStatus) {
       console.log(`Work ${idWork}: Status received ('${status}') is the same as current ('${oldStatus}'). No notifications sent.`);
    } else {
       console.log(`Work ${idWork}: Status not provided or not changed. No status notifications sent.`);
    }

    // --- RECARGAR LA OBRA CON SUS ASOCIACIONES ANTES DE DEVOLVERLA ---
    const updatedWorkWithAssociations = await Work.findByPk(idWork, {
      include: [
        { model: Budget, as: 'budget', attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'paymentProofType', 'initialPayment', 'date', 'applicantName','totalPrice', 'initialPaymentPercentage']},
        { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantName', 'pdfData', 'optionalDocs', 'expirationDate']},
        { model: Material, attributes: ['idMaterial', 'name', 'quantity', 'cost']},
        {
          model: Inspection,
          as: 'inspections', // <--- ASEGÚRATE DE QUE ESTE ALIAS ES EL CORRECTO (definido en data/index.js)
          attributes: [ // <--- ATRIBUTOS ACTUALIZADOS DEL MODELO INSPECTION
           'idInspection',
            'type',
            'processStatus', 
            'finalStatus',   
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected', // <--- AÑADIR ESTE CAMPO
            'dateWorkerCorrected', // <--- AÑADIR ESTE CAMPO
            'createdAt', 
            'updatedAt', // Para saber cuándo se actualizó por última vez
          ],
          // Opcional: puedes ordenar las inspecciones si una obra puede tener múltiples
          order: [['createdAt', 'DESC']], 
        },
        { model: InstallationDetail, as: 'installationDetails', attributes: ['idInstallationDetail', 'date', 'extraDetails', 'extraMaterials', 'images']},
        { model: MaterialSet, as: 'MaterialSets', attributes: ['idMaterialSet', 'invoiceFile', 'totalCost']},
        { model: Image, as: 'images', attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount']},
       {
          model: Receipt,
          as: 'Receipts',
          required: false, // Para asegurar un LEFT JOIN
          on: {
            [Op.and]: [
              // Condición para el relatedModel
              literal(`"Receipts"."relatedModel" = 'Work'`),
              // Condición para el relatedId, casteando relatedId a UUID para comparar con Work.idWork
              literal(`"Work"."idWork" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'type', 'notes', 'fileUrl', 'publicId', 'mimeType', 'originalName','createdAt'],
        },
         { model: ChangeOrder, as: 'changeOrders' },
      ],
    });

    if (!updatedWorkWithAssociations) {
        // Esto sería muy raro si la actualización fue exitosa, pero es un chequeo de seguridad
        return res.status(404).json({ error: true, message: 'Obra no encontrada después de la actualización (inesperado)' });
    }
    
    // Procesar Receipts si es necesario (copiado de getWorkById)
    const finalWorkResponse = {
      ...updatedWorkWithAssociations.get({ plain: true }),
      Receipts: updatedWorkWithAssociations.Receipts ? convertPdfDataToUrl(updatedWorkWithAssociations.Receipts) : [],
    };


    // Devolver la obra actualizada CON asociaciones
    res.status(200).json(finalWorkResponse);

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
          as: 'inspections', // <--- ALIAS AÑADIDO
          attributes: [     // <--- ATRIBUTOS ACTUALIZADOS
            'idInspection',
            'type',
            'processStatus',
            'finalStatus',
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected', // <--- AÑADIR ESTE CAMPO
            'dateWorkerCorrected', // <--- AÑADIR ESTE CAMPO
            'createdAt',
            'updatedAt',
          ],
          order: [['createdAt', 'DESC']], // Opcional, pero consistente con otros includes
        },
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount'],
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
  console.log("Controlador addImagesToWork: INICIO");
  try {
    const { idWork } = req.params; // ID del trabajo
    const { stage, dateTime, comment, truckCount } = req.body; // Etapa, imagen en Base64 y fecha/hora
    console.log("Controlador addImagesToWork: Body:", req.body);
    console.log("Controlador addImagesToWork: File:", req.file);
    if (!req.file) {
      console.error("Controlador addImagesToWork: No se proporcionó ningún archivo.");
      return res.status(400).json({ error: true, message: 'No se proporcionó ningún archivo de imagen.' });
    }

    // Verificación adicional del tipo de archivo para esta ruta específica (imágenes)
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      console.error("Controlador addImagesToWork: Tipo de archivo no permitido:", req.file.mimetype);
      return res.status(400).json({ error: true, message: 'Tipo de archivo no permitido para esta operación. Solo se aceptan imágenes (JPG, PNG, GIF, WEBP).' });
    }
    // Verificar que el trabajo exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      console.error("Controlador addImagesToWork: Trabajo no encontrado:", idWork);
      // Si el archivo ya se guardó temporalmente por multer, elimínalo
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
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
    'trabajo cubierto',
    'inspeccion final'
    ];
    if (!validStages.includes(stage)) {
      console.error("Controlador addImagesToWork: Etapa no válida:", stage);
      return res.status(400).json({ error: true, message: 'Etapa no válida' });
    }
    console.log("Controlador addImagesToWork: Intentando subir a Cloudinary...");
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `works/${idWork}/${stage}`,
      resource_type: "image"
    });
    console.log("Controlador addImagesToWork: Resultado de Cloudinary:", cloudinaryResult.secure_url);
    
    // --- ASIGNAR EL RESULTADO DE Image.create A newImage ---
    const newImage = await Image.create({ // <--- CAMBIO AQUÍ
      idWork,
      stage,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      dateTime: dateTime,
      comment: comment,
      truckCount: truckCount,
    });
    console.log("Controlador addImagesToWork: Imagen guardada en DB.");
    const updatedWork = await Work.findByPk(idWork, {
     
      include: [
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount'],
        },
        {
          model: Permit,
          as: 'Permit', // Asegúrate que el alias 'as' coincida con tu definición de modelo si existe
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'pdfData', 'optionalDocs'],
        },
        {
          model: Inspection,
          as: 'inspections', // <--- ALIAS AÑADIDO
          attributes: [     // <--- ATRIBUTOS ACTUALIZADOS
            'idInspection',
            'type',
            'processStatus',
            'finalStatus',
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'createdAt',
            'updatedAt',
          ],
          order: [['createdAt', 'DESC']], // Opcional, pero consistente con otros includes
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
       
        // ... incluye cualquier otra asociación que UploadScreen pueda necesitar indirectamente
        // a través de currentWork o sus componentes hijos.
      ]
    });
    console.log("Controlador addImagesToWork: Trabajo actualizado obtenido.");
    res.status(201).json({
      message: 'Imagen agregada correctamente a Cloudinary y DB',
      work: updatedWork,
      createdImage: newImage 
    });

  } catch (error) {
    console.error('Controlador addImagesToWork: ERROR CAPTURADO:', error); // LOG DETALLADO DEL ERROR
    if (error instanceof multer.MulterError) {
        console.error('Error de Multer al agregar imagen:', error);
        return res.status(400).json({ error: true, message: `Error de Multer: ${error.message}` });
    } else if (error.http_code && error.http_code === 400) { // Error específico de Cloudinary por formato, etc.
        console.error('Error de Cloudinary (posiblemente formato):', error);
        return res.status(400).json({ error: true, message: `Error de Cloudinary: ${error.message}` });
    }
    // Error genérico
    res.status(500).json({ error: true, message: 'Error interno del servidor al subir imagen.' });
  }
};

const deleteImagesFromWork = async (req, res) => {
  try {
    const { idWork, imageId } = req.params; // Obtener IDs de los parámetros de la URL

    console.log(`Recibida petición para eliminar imagen ID: ${imageId} del trabajo ID: ${idWork}`);



   const imageToDelete = await Image.findOne({
      where: { id: imageId, idWork: idWork }
    });

    if (!imageToDelete) {
      return res.status(404).json({ error: true, message: 'Imagen no encontrada o no pertenece a este trabajo' });
    }

    // Eliminar de Cloudinary si tiene publicId
    if (imageToDelete.publicId) {
      await deleteFromCloudinary(imageToDelete.publicId);
    }

    // Eliminar de la base de datos
    await imageToDelete.destroy();

    console.log(`Imagen ID: ${imageId} (Cloudinary public_id: ${imageToDelete.publicId}) eliminada exitosamente.`);
    res.status(204).send();

  } catch (error) {
    console.error('Error al eliminar imagen (Cloudinary):', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al eliminar imagen.' });
  }
};

// --- NUEVA FUNCIÓN PARA OBTENER OBRAS EN MANTENIMIENTO CON DETALLES DE PRÓXIMA VISITA ---
const getMaintenanceOverviewWorks = async (req, res) => {
  try {
    const worksInMaintenance = await Work.findAll({
      where: { status: 'maintenance' },
      include: [
         {
          model: Permit,
          as: 'Permit', // Asegúrate que el alias 'as' coincida con tu definición de modelo si existe
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName'],
        },
      
        {
          model: MaintenanceVisit,
          as: 'maintenanceVisits', // Asegúrate que este 'as' coincida con tu definición de asociación
          attributes: ['id', 'visitNumber', 'scheduledDate', 'status', 'actualVisitDate'],
          // Solo nos interesan las visitas que no están completadas o saltadas para determinar la "próxima"
          where: {
            status: { [Op.notIn]: ['completed', 'skipped'] }
          },
          order: [['scheduledDate', 'ASC']], // La más próxima primero
          required: false, // LEFT JOIN para incluir obras en mantenimiento aunque aún no tengan visitas programadas (raro, pero posible)
        },
        // Puedes añadir otros includes que sean relevantes para la vista de "obras en mantenimiento"
      ],
      order: [['propertyAddress', 'ASC']], // O por la fecha de la próxima visita si prefieres
    });

    const worksWithNextVisitDetails = worksInMaintenance.map(workInstance => {
      const work = workInstance.get({ plain: true });
      let nextMaintenanceDate = null;
      let nextVisitNumber = null;
      let nextVisitStatus = null;
      let nextVisitId = null;

      if (work.maintenanceVisits && work.maintenanceVisits.length > 0) {
        // La primera visita en la lista ordenada es la próxima
        const nextVisit = work.maintenanceVisits[0];
        nextMaintenanceDate = nextVisit.scheduledDate;
        nextVisitNumber = nextVisit.visitNumber;
        nextVisitStatus = nextVisit.status;
        nextVisitId = nextVisit.id;
      }

      // Eliminar el array completo de maintenanceVisits si solo quieres el resumen en esta vista
      // delete work.maintenanceVisits; 

      return {
        ...work, // Todos los campos de la obra y sus otros includes (Permit, Budget)
        nextMaintenanceDate,
        nextVisitNumber,
        nextVisitStatus,
        nextVisitId,
      };
    });

    res.status(200).json(worksWithNextVisitDetails);
  } catch (error) {
    console.error('Error al obtener obras en mantenimiento con detalles:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
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
  deleteImagesFromWork,
  getMaintenanceOverviewWorks,
 
};