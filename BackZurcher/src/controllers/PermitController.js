const { Permit } = require('../data');

// Crear un nuevo permiso
const createPermit = async (req, res) => {
  try {
      console.log("Datos recibidos en el cuerpo de la solicitud:", req.body);

      const { 
          permitNumber, applicationNumber, applicantName, applicantEmail, applicantPhone, documentNumber, constructionPermitFor, applicant, 
          propertyAddress, lot, block, propertyId, systemType, configuration, locationBenchmark, 
          elevation, drainfieldDepth, fillRequired, specificationsBy, approvedBy, dateIssued, 
          expirationDate, greaseInterceptorCapacity, dosingTankCapacity, gpdCapacity, 
          exavationRequired, squareFeetSystem, other, isATU, pump 
      } = req.body;

      const pdfData = req.file ? req.file.buffer : null; // Si se sube un archivo PDF

      const permit = await Permit.create({
          permitNumber, applicationNumber, applicantName, applicantEmail, applicantPhone, documentNumber, constructionPermitFor, applicant, 
          propertyAddress, lot, block, propertyId, systemType, configuration, locationBenchmark, 
          elevation, drainfieldDepth, fillRequired, specificationsBy, approvedBy, dateIssued, 
          expirationDate, greaseInterceptorCapacity, dosingTankCapacity, gpdCapacity, 
          exavationRequired, squareFeetSystem, other, isATU, pump, pdfData
      });

      res.status(201).json(permit);
  } catch (error) {
      console.error("Error al crear el permiso:", error);
      res.status(500).json({ error: true, message: "Error interno del servidor" });
  }
};

// Obtener todos los permisos
const getPermits = async (req, res) => {
  try {
    const permits = await Permit.findAll({
    attributes: { exclude: ['pdfData'] },
    })
    res.status(200).json(permits);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener un permiso por ID
const getPermitById = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: true, message: 'Permiso no encontrado' });
    }

    res.status(200).json(permit);
  } catch (error) {
    console.error('Error al obtener el permiso:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Actualizar un permiso
const updatePermit = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const updates = req.body;
    const pdfData = req.file ? req.file.buffer : null;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: true, message: 'Permiso no encontrado' });
    }

    Object.assign(permit, updates);
    if (pdfData) permit.pdfData = pdfData;

    await permit.save();
    res.status(200).json(permit);
  } catch (error) {
    console.error('Error al actualizar el permiso:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Descargar el PDF asociado a un permiso
const downloadPermitPdf = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit);

    if (!permit || !permit.pdfData) {
      return res.status(404).json({ error: true, message: 'PDF no encontrado' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=permit-${id}.pdf`);
    res.send(permit.pdfData);
  } catch (error) {
    console.error('Error al descargar el PDF:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const getContactList = async (req, res) => {
  try {
    const { idPermit } = req.params; // Obtener el ID del permiso desde los parámetros de la URL (si existe)

    // Configurar la condición de búsqueda
    const whereCondition = idPermit ? { idPermit } : {}; // Si idPermit está presente, filtrar por él; de lo contrario, no filtrar

    // Buscar los contactos asociados al permiso (o todos si no se pasa idPermit)
    const contacts = await Permit.findAll({
      where: whereCondition, // Aplicar la condición de búsqueda
      attributes: ['applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress'],
    });

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({
        error: true,
        message: idPermit
          ? 'No se encontraron contactos para el permiso especificado'
          : 'No se encontraron contactos',
      });
    }

    // Filtrar o transformar los datos
    const filteredContacts = contacts.map((contact) => ({
      applicantName: contact.applicantName || 'No especificado',
      applicantEmail: contact.applicantEmail || 'No especificado',
      applicantPhone: contact.applicantPhone || 'No especificado',
      propertyAddress: contact.propertyAddress || 'No especificado',
    }));

    res.status(200).json({
      error: false,
      message: idPermit
        ? 'Listado de contactos para el permiso obtenido exitosamente'
        : 'Listado de todos los contactos obtenido exitosamente',
      data: filteredContacts,
    });
  } catch (error) {
    console.error('Error al obtener el listado de contactos:', error);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
    });
  }
};



module.exports = {
  createPermit,
  getPermits,
  getPermitById,
  updatePermit,
  downloadPermitPdf,
  getContactList
};