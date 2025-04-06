const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet } = require('../data');
const {sendEmail} = require('../utils/nodeMailer/emailService');
const { getNotificationDetails } = require('../utils/nodeMailer/notificationService');


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

     // Buscar a los usuarios con roles "owner" y "admin"
     const staffToNotify = await Staff.findAll({
      where: {
        role: ['owner', 'admin'], // Roles a notificar
      },
    });

    // Enviar correos electrónicos a los usuarios correspondientes
    const notificationMessage = `El trabajo con ID ${work.id} y dirección ${work.propertyAddress} ha sido aprobado. Por favor, procedan a comprar los materiales necesarios.`;
    for (const staff of staffToNotify) {
      await sendEmail(staff, notificationMessage);
    }


    res.status(201).json({ message: 'Obra creada correctamente', work });
  } catch (error) {
    console.error('Error al crear la obra desde el presupuesto aprobado:', error);
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
          attributes: ['idBudget', 'propertyAddress', 'status', 'price', 'paymentInvoice', 'initialPayment', 'date'],
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
          attributes: ['idBudget', 'propertyAddress', 'status', 'price', 'paymentInvoice','initialPayment', 'date'],
        },
        {

          model: Permit,
          attributes: [
            'idPermit',
            'propertyAddress',
            'permitNumber',
            'applicantName',
            'pdfData',
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
          attributes: ['id', 'stage', 'dateTime','imageData', ],
        },
      ],
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Fetch the Budget separately using the propertyAddress
    const budget = await Budget.findOne({ where: { propertyAddress: work.propertyAddress } });

    // Add the budget information to the work object
    const workWithBudget = {
      ...work.get({ plain: true }), // Convert Sequelize object to plain JavaScript object
      budget: budget ? {
        idBudget: budget.idBudget,
        propertyAddress: budget.propertyAddress,
        status: budget.status,
        price: budget.price
      } : null
    };

    res.status(200).json(workWithBudget);
  } catch (error) {
    console.error('Error al obtener la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Actualizar una obra
const updateWork = async (req, res) => {
  try {
    const { idWork } = req.params;
    const { propertyAddress, status, startDate,  notes, staffId } = req.body;

    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }
    if (status && status === 'inProgress' && work.status !== 'inProgress') {
      work.status = status;
    
      // Solo asignar startDate si no está ya definido
      if (!work.startDate) {
        work.startDate = new Date();
      }
    }
    // Actualizar los campos
    work.propertyAddress = propertyAddress || work.propertyAddress;
    work.status = status || work.status;
   
    work.staffId = staffId || work.staffId; // Asignar el ID del empleado;
    work.notes = notes || work.notes;
  

    await work.save();

 // Obtener detalles de notificación
 const notificationDetails = await getNotificationDetails(status, work);
console.log('Detalles de notificación:', notificationDetails);

 if (notificationDetails) {
   const { staffToNotify, message } = notificationDetails;

   // Enviar correos electrónicos a los empleados correspondientes
   for (const staff of staffToNotify) {
    console.log('Enviando correo a:', staff.email);
    await sendEmail(staff, message);
  }
 }

    res.status(200).json(work);
  } catch (error) {
    console.error('Error al actualizar la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
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

    // Actualizar el estado del Work a "installed"
    work.status = 'installed';
    await work.save();

    res.status(201).json({
      message: 'Detalle de instalación agregado correctamente',
      installationDetail,
      work,
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
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'pdfData'],
        },
        {
          model: Material,
          attributes: ['idMaterial', 'name', 'quantity', 'cost'],
        },
        {
          model: Inspection,
          attributes: ['idInspection', 'type', 'status', 'dateRequested', 'dateCompleted', 'notes'],
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
    const { stage, image, dateTime } = req.body; // Etapa, imagen en Base64 y fecha/hora

    // Verificar que el trabajo exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Trabajo no encontrado' });
    }

    // Validar que la etapa sea válida
    const validStages = [
      'foto previa del lugar',
      'foto excavación',
      'foto tanque instalado',
      'fotos de cada camión de arena',
      'foto inspección final',
      'foto de extracción de piedras',
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
    const { idWork } = req.params; // ID del trabajo
    const { stage, imageUrls } = req.body; // Etapa y URLs de las imágenes a eliminar

    // Verificar que el trabajo exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Trabajo no encontrado' });
    }

    // Buscar el registro de imágenes para la etapa especificada
    const imageRecord = await Image.findOne({ where: { idWork, stage } });
    if (!imageRecord) {
      return res.status(404).json({ error: true, message: 'No se encontraron imágenes para esta etapa' });
    }

    // Filtrar las imágenes que no se quieren eliminar
    const updatedImageUrls = imageRecord.imageUrls.filter((url) => !imageUrls.includes(url));

    // Actualizar el registro de imágenes
    if (updatedImageUrls.length === 0) {
      // Si no quedan imágenes, eliminar el registro completo
      await imageRecord.destroy();
    } else {
      // Si quedan imágenes, actualizar el registro
      imageRecord.imageUrls = updatedImageUrls;
      await imageRecord.save();
    }

    res.status(200).json({
      message: 'Imágenes eliminadas correctamente',
      updatedImageUrls,
    });
  } catch (error) {
    console.error('Error al eliminar imágenes del trabajo:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
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