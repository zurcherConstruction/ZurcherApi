const { Work, Permit, Budget, Material, Inspection, Staff, InstallationDetail, MaterialSet } = require('../data');
const {sendEmail} = require('../utils/nodeMailer/emailService');
const { getNotificationDetails } = require('../utils/nodeMailer/notificationService');


const createWork = async (req, res) => {
  try {
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
      idPermit: budget.permit?.idPermit || null, // Asociar el permiso si existe
      notes: `Work create budget N° ${idBudget}`,
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
          as: 'budget', // Alias definido en la relación
          attributes: ['idBudget', 'propertyAddress', 'status', 'price'], // Campos relevantes del presupuesto
        },
        {
          model: Permit,
          
          attributes: ['idPermit', 'propertyAddress', 'applicantName'], // Campos relevantes del permiso
        },
      ],
    });
    res.status(200).json(works);
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
          attributes: ['idBudget', 'propertyAddress', 'status', 'price'],
        },
        {
          model: Permit,
          attributes: [
            'idPermit',
            'propertyAddress',
            'permitNumber',
            'applicantName',
            
            'pdfData', // Incluir el PDF
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
          model: InstallationDetail, // Incluir el modelo InstallationDetail
          as: 'installationDetails', // Alias definido en la relación
          attributes: ['idInstallationDetail', 'date', 'extraDetails', 'extraMaterials', 'images'], // Campos relevantes
        },
        {
          model: MaterialSet, // Incluir el modelo MaterialSet
          as: 'MaterialSets', // Alias definido en la relación
          attributes: ['idMaterialSet', 'invoiceFile', 'totalCost'], // Campos relevantes
        },
      
      ],
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    res.status(200).json(work);
  } catch (error) {
    console.error('Error al obtener la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Actualizar una obra
const updateWork = async (req, res) => {
  try {
    const { idWork } = req.params;
    const { propertyAddress, status, startDate,  notes } = req.body;

    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Actualizar los campos
    work.propertyAddress = propertyAddress || work.propertyAddress;
    work.status = status || work.status;
    work.startDate = startDate || work.startDate;
   
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

module.exports = {
  createWork,
  getWorks,
  getWorkById,
  updateWork,
  deleteWork,
  addInstallationDetail,
  attachInvoiceToWork,
};