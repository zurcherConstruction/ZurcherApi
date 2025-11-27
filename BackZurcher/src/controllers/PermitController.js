const { Permit, Budget } = require('../data');

// NUEVO MÉTODO: Verificar Permit por Property Address
const checkPermitByPropertyAddress = async (req, res, next) => {
  try {
    const { propertyAddress } = req.query; // Espera propertyAddress como query param

    if (!propertyAddress) {
      return res.status(400).json({ error: true, message: "Property address es requerida para la verificación." });
    }

    const permit = await Permit.findOne({
      where: { propertyAddress },
      include: [{
        model: Budget,
        as: 'Budgets', // Asegúrate que el alias 'Budgets' esté definido en tu asociación Permit-Budget
        attributes: ['idBudget'], // Solo necesitamos saber si existe alguno
      }]
    });

    if (!permit) {
      return res.status(200).json({ exists: false, permit: null, hasBudget: false });
    }

    const hasBudget = permit.Budgets && permit.Budgets.length > 0;
    // Devolver el permit sin los datos de los Budgets para no inflar la respuesta, solo el ID del permit
    const permitData = permit.get({ plain: true });
    delete permitData.Budgets; // No necesitamos enviar la lista de Budgets

    res.status(200).json({
      exists: true,
      permit: permitData, // Devolver los datos del permit encontrado
      hasBudget: hasBudget,
      message: hasBudget ? "El permiso ya existe y tiene presupuestos asociados." : "El permiso ya existe pero no tiene presupuestos."
    });

  } catch (error) {
    console.error("Error al verificar el permiso por dirección:", error);
    next(error);
  }
};

// Crear un nuevo permiso
const createPermit = async (req, res, next) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    // ✅ Validaciones básicas mejoradas
    if (!req.body.applicantName || !req.body.propertyAddress) {
      return res.status(400).json({ error: true, message: "Faltan campos obligatorios: applicantName y propertyAddress." });
    }
    
    // ✅ NUEVA VALIDACIÓN: Permit Number es obligatorio
    if (!req.body.permitNumber || req.body.permitNumber.trim() === '') {
      return res.status(400).json({ 
        error: true, 
        message: "Permit Number is required. Please provide a valid permit number." 
      });
    }
    
    // ✅ NUEVA VALIDACIÓN: Verificar que el Permit Number no exista
    const existingPermit = await Permit.findOne({
      where: { permitNumber: req.body.permitNumber.trim() }
    });
    
    if (existingPermit) {
      return res.status(409).json({ 
        error: true, 
        message: `Permit Number '${req.body.permitNumber}' already exists. Please use a different number.`,
        existingPermitId: existingPermit.idPermit
      });
    }

    const { 
      permitNumber,
      applicationNumber,
      applicantName,
      applicantEmail,
      applicantPhone,
      documentNumber,
      constructionPermitFor,
      applicant,
      propertyAddress,
      lot,
      block,
      propertyId,
      systemType,
      isPBTS, // 🆕 NUEVO: Indicador PBTS para ATU
      notificationEmails, // 🆕 NUEVO: Emails adicionales
      configuration,
      locationBenchmark,
      drainfieldDepth,
      expirationDate,
      dosingTankCapacity,
      gpdCapacity,
      excavationRequired,
      squareFeetSystem,
      other,
      pump,
    } = req.body;
    
    // ✅ Procesar notificationEmails (puede venir como string o array)
    let processedNotificationEmails = [];
    if (notificationEmails) {
      if (typeof notificationEmails === 'string') {
        // Si viene como string separado por comas
        processedNotificationEmails = notificationEmails
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);
      } else if (Array.isArray(notificationEmails)) {
        processedNotificationEmails = notificationEmails
          .map(email => email.trim())
          .filter(email => email.length > 0);
      }
    }

    let expirationStatus = "valid"; // Estado por defecto
    let expirationMessage = "";

    if (expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
      const expDateParts = expirationDate.split('-');
      // Asegurarse de que los componentes de la fecha son números válidos
      const year = parseInt(expDateParts[0], 10);
      const month = parseInt(expDateParts[1], 10) -1; // Mes es 0-indexado en JS Date
      const day = parseInt(expDateParts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) {
         // Si la fecha no es válida, podrías decidir qué hacer.
         // Por ahora, la dejaremos como 'valid' y el frontend/DB podría manejar el error de formato.
         // O podrías devolver un error aquí si el formato es estrictamente necesario.
         console.warn(`Fecha de expiración con formato inválido recibida: ${expirationDate}`);
         // Alternativamente, podrías forzar un error:
         // return res.status(400).json({
         //   error: true,
         //   message: `La fecha de expiración proporcionada ('${expirationDate}') no es válida.`
         // });
      } else {
        const expDate = new Date(year, month, day);
        expDate.setHours(0,0,0,0);

        if (isNaN(expDate.getTime())) {
          // Esto podría ocurrir si, por ejemplo, se pasa '2023-02-30'
          console.warn(`Fecha de expiración inválida (post-parse): ${expirationDate}`);
          // Considera devolver un error si la fecha es completamente inválida
        } else {
          if (expDate < today) {
            expirationStatus = "expired";
            expirationMessage = `El permiso expiró el ${expDate.toLocaleDateString()}.`;
            console.warn(`Advertencia Backend: ${expirationMessage}`);
          } else {
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            if (expDate <= thirtyDaysFromNow) {
              expirationStatus = "soon_to_expire";
              expirationMessage = `El permiso expira el ${expDate.toLocaleDateString()} (pronto a vencer).`;
              console.warn(`Advertencia Backend: ${expirationMessage}`);
            }
          }
        }
      }
    }

    // Manejar los archivos enviados - SUBIR A CLOUDINARY
    const cloudinary = require('cloudinary').v2;
    let permitPdfUrl = null;
    let permitPdfPublicId = null;
    let optionalDocsUrl = null;
    let optionalDocsPublicId = null;

    if (req.files?.pdfData && req.files.pdfData[0]) {
      console.log('📤 Subiendo Permit PDF a Cloudinary...');
      // Convertir buffer a base64 para Cloudinary
      const base64File = req.files.pdfData[0].buffer.toString('base64');
      const uploadResult = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${base64File}`,
        {
          folder: 'permits',
          resource_type: 'raw',
          format: 'pdf',
          public_id: `permit_${permitNumber.trim().replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
        }
      );
      permitPdfUrl = uploadResult.secure_url;
      permitPdfPublicId = uploadResult.public_id;
      console.log('✅ Permit PDF subido a Cloudinary:', permitPdfUrl);
    }

    if (req.files?.optionalDocs && req.files.optionalDocs[0]) {
      console.log('📤 Subiendo Optional Docs a Cloudinary...');
      const base64File = req.files.optionalDocs[0].buffer.toString('base64');
      const uploadResult = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${base64File}`,
        {
          folder: 'permits/optional',
          resource_type: 'raw',
          format: 'pdf',
          public_id: `optional_${permitNumber.trim().replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
        }
      );
      optionalDocsUrl = uploadResult.secure_url;
      optionalDocsPublicId = uploadResult.public_id;
      console.log('✅ Optional Docs subido a Cloudinary:', optionalDocsUrl);
    }

    // Crear el permiso en la base de datos
    const permitDataToCreate = {
      permitNumber: permitNumber.trim(), // ✅ Limpiar espacios
      applicationNumber,
      applicantName,
      applicantEmail,
      applicantPhone,
      documentNumber,
      constructionPermitFor,
      applicant,
      propertyAddress,
      lot,
      block,
      propertyId,
      systemType,
      isPBTS: isPBTS === 'true' || isPBTS === true, // 🆕 Convertir a boolean
      notificationEmails: processedNotificationEmails, // 🆕 Emails procesados
      configuration,
      locationBenchmark,
      drainfieldDepth,
      expirationDate: expirationDate || null,
      dosingTankCapacity,
      gpdCapacity,
      excavationRequired,
      squareFeetSystem,
      other,
      pump,
      // ✅ URLs de Cloudinary en vez de BLOBs
      permitPdfUrl,
      permitPdfPublicId,
      optionalDocsUrl,
      optionalDocsPublicId,
    };

    const permit = await Permit.create(permitDataToCreate);

    console.log("Permiso creado correctamente:", permit.idPermit);
    
    // Añadir el estado de expiración a la respuesta
    const permitResponse = permit.get({ plain: true });
    permitResponse.expirationStatus = expirationStatus;
    if (expirationMessage) {
      permitResponse.expirationMessage = expirationMessage;
    }

    res.status(201).json(permitResponse);
  } catch (error) {
    console.error("Error al crear el permiso (en controller):", error.message, error.stack);
    if (error.name === 'SequelizeDatabaseError' && error.original?.code === '22007') { 
        return res.status(400).json({ error: true, message: "El formato de la fecha de expiración es incorrecto para la base de datos."});
    }
    next(error);
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
const getPermitById = async (req, res, next) => { // Asegúrate de tener next si usas un manejador de errores global
  try {
    const { idPermit } = req.params;
    const permitInstance = await Permit.findByPk(idPermit);

    if (!permitInstance) {
      return res.status(404).json({ error: true, message: 'Permiso no encontrado' });
    }

    const permit = permitInstance.get({ plain: true }); // Obtener objeto plano para modificarlo

    let expirationStatus = "valid";
    let expirationMessage = "";

    if (permit.expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      // permit.expirationDate de Sequelize es un string 'YYYY-MM-DD' o un objeto Date
      // Normalizar a string 'YYYY-MM-DD' para parseo consistente
      const expirationDateString = typeof permit.expirationDate === 'string' 
                                  ? permit.expirationDate.split('T')[0] 
                                  : new Date(permit.expirationDate).toISOString().split('T')[0];
      
      const expDateParts = expirationDateString.split('-');
      const year = parseInt(expDateParts[0], 10);
      const month = parseInt(expDateParts[1], 10) - 1; // Mes es 0-indexado en JS Date
      const day = parseInt(expDateParts[2], 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const expDate = new Date(year, month, day);
        expDate.setHours(0,0,0,0);

        if (!isNaN(expDate.getTime())) {
          if (expDate < today) {
            expirationStatus = "expired";
            expirationMessage = `El permiso asociado expiró el ${expDate.toLocaleDateString()}. No se debería crear un presupuesto.`;
          } else {
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            if (expDate <= thirtyDaysFromNow) {
              expirationStatus = "soon_to_expire";
              expirationMessage = `El permiso asociado expira el ${expDate.toLocaleDateString()} (pronto a vencer).`;
            }
          }
        } else {
          console.warn(`Fecha de expiración inválida (post-parse) para permit ${idPermit}: ${expirationDateString}`);
        }
      } else {
        console.warn(`Formato de fecha de expiración inválido para permit ${idPermit}: ${expirationDateString}`);
      }
    }

    // Añadir el estado de expiración al objeto permit que se devuelve
    permit.expirationStatus = expirationStatus;
    permit.expirationMessage = expirationMessage;

    res.status(200).json(permit);
  } catch (error) {
    console.error('Error al obtener el permiso:', error);
    // Si tienes un manejador de errores global, usa next(error)
    // De lo contrario, envía una respuesta de error
    if (next) {
      next(error);
    } else {
      res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
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

// *** NUEVO MÉTODO: Servir el PDF principal (pdfData) para visualización inline ***
const getPermitPdfInline = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit, {
      attributes: ['permitPdfUrl', 'pdfData', 'isLegacy'] // ✅ Incluir URL de Cloudinary
    });

    if (!permit) {
      return res.status(404).send('Permit no encontrado');
    }

    // ✅ PRIORIDAD 1: URL de Cloudinary (nuevo)
    if (permit.permitPdfUrl) {
      console.log(`🔗 Redirigiendo a Cloudinary URL para permit PDF: ${permit.permitPdfUrl}`);
      return res.redirect(permit.permitPdfUrl);
    }

    // ✅ FALLBACK: pdfData (BLOB legacy)
    if (!permit.pdfData) {
      return res.status(404).send('PDF principal no encontrado');
    }

    // --- DETECTAR SI ES LEGACY Y MANEJAR CLOUDINARY URLs EN pdfData ---
    const isLegacy = permit.isLegacy;
    
    if (isLegacy) {
      // Si es legacy y pdfData es una URL de Cloudinary (string o Buffer), redirigir
      let cloudinaryUrl = null;
      
      if (typeof permit.pdfData === 'string' && permit.pdfData.includes('cloudinary.com')) {
        cloudinaryUrl = permit.pdfData;
      } else if (Buffer.isBuffer(permit.pdfData)) {
        // Convertir Buffer a string para ver si es una URL de Cloudinary
        const bufferString = permit.pdfData.toString('utf8');
        if (bufferString.includes('cloudinary.com')) {
          cloudinaryUrl = bufferString;
        }
      }
      
      if (cloudinaryUrl) {
        console.log(`🔗 Redirigiendo a Cloudinary URL para permit PDF: ${cloudinaryUrl}`);
        return res.redirect(cloudinaryUrl);
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    // Sugiere mostrar inline en lugar de descargar
    res.setHeader('Content-Disposition', `inline; filename="permit_${idPermit}.pdf"`);
    res.send(permit.pdfData); // Enviar los datos binarios

  } catch (error) {
    console.error(`Error al obtener PDF principal del permit ${req.params.idPermit}:`, error);
    res.status(500).send('Error al obtener el PDF principal'); // Enviar texto simple
  }
};

// *** NUEVO MÉTODO: Servir el PDF opcional (optionalDocs) para visualización inline ***
const getPermitOptionalDocInline = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit, {
      attributes: ['optionalDocsUrl', 'optionalDocs', 'isLegacy'] // ✅ Incluir URL de Cloudinary
    });

    if (!permit) {
      return res.status(404).send('Permit no encontrado');
    }

    // ✅ PRIORIDAD 1: URL de Cloudinary (nuevo)
    if (permit.optionalDocsUrl) {
      console.log(`🔗 Redirigiendo a Cloudinary URL para optional docs: ${permit.optionalDocsUrl}`);
      return res.redirect(permit.optionalDocsUrl);
    }

    // ✅ FALLBACK: optionalDocs (BLOB legacy)
    if (!permit.optionalDocs) {
      return res.status(404).send('Documento opcional no encontrado');
    }

    // --- DETECTAR SI ES LEGACY Y MANEJAR CLOUDINARY URLs EN optionalDocs ---
    const isLegacy = permit.isLegacy;
    
    if (isLegacy) {
      // Si es legacy y optionalDocs es una URL de Cloudinary (string o Buffer), redirigir
      let cloudinaryUrl = null;
      
      if (typeof permit.optionalDocs === 'string' && permit.optionalDocs.includes('cloudinary.com')) {
        cloudinaryUrl = permit.optionalDocs;
      } else if (Buffer.isBuffer(permit.optionalDocs)) {
        // Convertir Buffer a string para ver si es una URL de Cloudinary
        const bufferString = permit.optionalDocs.toString('utf8');
        if (bufferString.includes('cloudinary.com')) {
          cloudinaryUrl = bufferString;
        }
      }
      
      if (cloudinaryUrl) {
        console.log(`🔗 Redirigiendo a Cloudinary URL para permit optional docs: ${cloudinaryUrl}`);
        return res.redirect(cloudinaryUrl);
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    // Sugiere mostrar inline
    res.setHeader('Content-Disposition', `inline; filename="optional_${idPermit}.pdf"`);
    res.send(permit.optionalDocs); // Enviar los datos binarios

  } catch (error) {
    console.error(`Error al obtener Doc Opcional del permit ${req.params.idPermit}:`, error);
    res.status(500).send('Error al obtener el documento opcional'); // Enviar texto simple
  }
};

// ========== NUEVO MÉTODO PARA EDITAR DATOS DE CLIENTE ==========

/**
 * Método para actualizar datos de cliente en Permit
 * PATCH /api/permits/:idPermit/client-data
 */
const updatePermitClientData = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const { applicantName, applicantEmail, applicantPhone, propertyAddress } = req.body;

    // Validaciones básicas
    if (!applicantName && !applicantEmail && !applicantPhone && !propertyAddress) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere al menos un campo para actualizar (applicantName, applicantEmail, applicantPhone, propertyAddress)'
      });
    }

    // Buscar el Permit
    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({
        error: true,
        message: 'Permiso no encontrado'
      });
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (applicantName) updateData.applicantName = applicantName;
    if (applicantEmail) updateData.applicantEmail = applicantEmail;
    if (applicantPhone) updateData.applicantPhone = applicantPhone;
    if (propertyAddress) updateData.propertyAddress = propertyAddress;

    // Actualizar el Permit
    await permit.update(updateData);

    console.log(`✅ Permit ${idPermit} datos de cliente actualizados:`, updateData);

    // Obtener el permit actualizado
    const updatedPermit = await Permit.findByPk(idPermit, {
      attributes: ['idPermit', 'applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress', 'permitNumber']
    });

    res.status(200).json({
      success: true,
      message: 'Datos de cliente del permiso actualizados correctamente',
      data: {
        permit: {
          idPermit: updatedPermit.idPermit,
          applicantName: updatedPermit.applicantName,
          applicantEmail: updatedPermit.applicantEmail,
          applicantPhone: updatedPermit.applicantPhone,
          propertyAddress: updatedPermit.propertyAddress,
          permitNumber: updatedPermit.permitNumber
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar datos de cliente del permiso:', error);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor al actualizar datos de cliente del permiso',
      details: error.message
    });
  }
};

// 🆕 REEMPLAZAR PDF PRINCIPAL DEL PERMIT
const replacePermitPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: true, 
        message: "No se proporcionó ningún archivo PDF" 
      });
    }

    const permit = await Permit.findByPk(id);
    if (!permit) {
      return res.status(404).json({ 
        error: true, 
        message: "Permiso no encontrado" 
      });
    }

    // ✅ Eliminar PDF anterior de Cloudinary si existe
    if (permit.permitPdfPublicId) {
      try {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(permit.permitPdfPublicId, { resource_type: 'raw' });
        console.log(`✅ PDF anterior eliminado de Cloudinary: ${permit.permitPdfPublicId}`);
      } catch (error) {
        console.warn('⚠️ Error al eliminar PDF anterior de Cloudinary:', error.message);
      }
    }

    // ✅ Subir nuevo PDF a Cloudinary
    const cloudinary = require('cloudinary').v2;
    const base64File = req.file.buffer.toString('base64');
    const uploadResult = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${base64File}`,
      {
        folder: 'permits',
        resource_type: 'raw',
        format: 'pdf',
        public_id: `permit_${permit.permitNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
      }
    );

    console.log(`✅ Nuevo PDF subido a Cloudinary: ${uploadResult.secure_url}`);
    
    // ✅ Actualizar el permit con la nueva URL de Cloudinary
    await permit.update({
      permitPdfUrl: uploadResult.secure_url,
      permitPdfPublicId: uploadResult.public_id,
      pdfData: null, // Limpiar BLOB si existía
    });

    res.status(200).json({
      success: true,
      message: "PDF del permiso reemplazado exitosamente",
      permit: {
        idPermit: permit.idPermit,
        propertyAddress: permit.propertyAddress,
        permitNumber: permit.permitNumber,
        permitPdfUrl: uploadResult.secure_url
      }
    });

  } catch (error) {
    console.error('❌ Error al reemplazar PDF del permiso:', error);
    res.status(500).json({
      error: true,
      message: 'Error al reemplazar PDF del permiso',
      details: error.message
    });
  }
};

// 🆕 REEMPLAZAR DOCUMENTOS OPCIONALES DEL PERMIT
const replaceOptionalDocs = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: true, 
        message: "No se proporcionó ningún archivo PDF" 
      });
    }

    const permit = await Permit.findByPk(id);
    if (!permit) {
      return res.status(404).json({ 
        error: true, 
        message: "Permiso no encontrado" 
      });
    }

    // ✅ Eliminar OptionalDocs anterior de Cloudinary si existe
    if (permit.optionalDocsPublicId) {
      try {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(permit.optionalDocsPublicId, { resource_type: 'raw' });
        console.log(`✅ OptionalDocs anterior eliminado de Cloudinary: ${permit.optionalDocsPublicId}`);
      } catch (error) {
        console.warn('⚠️ Error al eliminar OptionalDocs anterior de Cloudinary:', error.message);
      }
    }

    // ✅ Subir nuevo OptionalDocs a Cloudinary
    const cloudinary = require('cloudinary').v2;
    const base64File = req.file.buffer.toString('base64');
    const uploadResult = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${base64File}`,
      {
        folder: 'permits/optional',
        resource_type: 'raw',
        format: 'pdf',
        public_id: `optional_${permit.permitNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
      }
    );

    console.log(`✅ Nuevo OptionalDocs subido a Cloudinary: ${uploadResult.secure_url}`);
    
    // ✅ Actualizar el permit con la nueva URL de Cloudinary
    await permit.update({
      optionalDocsUrl: uploadResult.secure_url,
      optionalDocsPublicId: uploadResult.public_id,
      optionalDocs: null, // Limpiar BLOB si existía
    });

    res.status(200).json({
      success: true,
      message: "Documentos opcionales reemplazados exitosamente",
      permit: {
        idPermit: permit.idPermit,
        propertyAddress: permit.propertyAddress,
        permitNumber: permit.permitNumber,
        optionalDocsUrl: uploadResult.secure_url
      }
    });

  } catch (error) {
    console.error('❌ Error al reemplazar documentos opcionales:', error);
    res.status(500).json({
      error: true,
      message: 'Error al reemplazar documentos opcionales',
      details: error.message
    });
  }
};

// Obtener todos los permits (si necesitas este método, puede quedar aquí)

// 🆕 NUEVO MÉTODO: Verificar si un número de permit ya existe
const checkPermitNumber = async (req, res, next) => {
  try {
    const { permitNumber } = req.params;

    if (!permitNumber || permitNumber.trim() === '') {
      return res.status(400).json({ 
        error: true, 
        message: "Permit number is required" 
      });
    }

    const permit = await Permit.findOne({
      where: { permitNumber: permitNumber.trim() },
      attributes: ['idPermit', 'permitNumber', 'propertyAddress']
    });

    if (permit) {
      return res.status(200).json({
        exists: true,
        permitId: permit.idPermit,
        permitNumber: permit.permitNumber,
        propertyAddress: permit.propertyAddress
      });
    } else {
      return res.status(200).json({
        exists: false
      });
    }

  } catch (error) {
    console.error("Error al verificar permit number:", error);
    next(error);
  }
};

// 🆕 NUEVO: Actualizar campos editables del Permit (completo)
const updatePermitFields = async (req, res, next) => {
  try {
    const { idPermit } = req.params;
    const {
      permitNumber,
      lot,
      block,
      systemType,
      isPBTS,
      drainfieldDepth,
      expirationDate,
      gpdCapacity,
      excavationRequired,
      squareFeetSystem,
      pump,
      applicantEmail, // Email principal
      notificationEmails, // Emails secundarios
      applicantName,
      applicantPhone,
      propertyAddress
    } = req.body;

    console.log(`🔧 Actualizando Permit ${idPermit}...`);
    console.log('📋 Datos recibidos:', req.body);

    // Buscar el permit
    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({
        error: true,
        message: 'Permit no encontrado'
      });
    }

    const { Op } = require('sequelize');

    // 🔍 Validar permitNumber único si se está cambiando
    if (permitNumber && permitNumber.trim() !== permit.permitNumber) {
      const existingPermit = await Permit.findOne({
        where: { 
          permitNumber: permitNumber.trim(),
          idPermit: { [Op.ne]: idPermit } // Excluir el actual
        }
      });

      if (existingPermit) {
        return res.status(400).json({
          error: true,
          message: `El número de permit '${permitNumber}' ya está en uso`,
          field: 'permitNumber'
        });
      }
    }

    // 🔍 Validar propertyAddress única si se está cambiando
    if (propertyAddress && propertyAddress.trim() !== permit.propertyAddress) {
      const existingPermitByAddress = await Permit.findOne({
        where: { 
          propertyAddress: propertyAddress.trim(),
          idPermit: { [Op.ne]: idPermit } // Excluir el actual
        }
      });

      if (existingPermitByAddress) {
        return res.status(400).json({
          error: true,
          message: `La dirección '${propertyAddress}' ya existe en otro permit`,
          field: 'propertyAddress'
        });
      }
    }

    // 🔍 Procesar notificationEmails (puede venir como string o array)
    let processedNotificationEmails = permit.notificationEmails || [];
    if (notificationEmails !== undefined) {
      if (typeof notificationEmails === 'string') {
        try {
          processedNotificationEmails = JSON.parse(notificationEmails);
        } catch (e) {
          // Si no es JSON, separar por comas
          processedNotificationEmails = notificationEmails
            .split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0);
        }
      } else if (Array.isArray(notificationEmails)) {
        processedNotificationEmails = notificationEmails.filter(email => email && email.trim().length > 0);
      }
    }

    // 📝 Actualizar campos
    const updateData = {};

    if (permitNumber !== undefined) updateData.permitNumber = permitNumber.trim();
    if (lot !== undefined) updateData.lot = lot;
    if (block !== undefined) updateData.block = block;
    if (systemType !== undefined) updateData.systemType = systemType;
    if (isPBTS !== undefined) updateData.isPBTS = isPBTS === 'true' || isPBTS === true;
    if (drainfieldDepth !== undefined) updateData.drainfieldDepth = drainfieldDepth;
    if (expirationDate !== undefined) updateData.expirationDate = expirationDate || null;
    if (gpdCapacity !== undefined) updateData.gpdCapacity = gpdCapacity;
    if (excavationRequired !== undefined) updateData.excavationRequired = excavationRequired;
    if (squareFeetSystem !== undefined) updateData.squareFeetSystem = squareFeetSystem;
    if (pump !== undefined) updateData.pump = pump;
    if (applicantEmail !== undefined) updateData.applicantEmail = applicantEmail;
    if (applicantName !== undefined) updateData.applicantName = applicantName;
    if (applicantPhone !== undefined) updateData.applicantPhone = applicantPhone;
    if (propertyAddress !== undefined) updateData.propertyAddress = propertyAddress;
    if (notificationEmails !== undefined) updateData.notificationEmails = processedNotificationEmails;

    // Aplicar actualizaciones
    Object.assign(permit, updateData);
    await permit.save();

    console.log(`✅ Permit ${idPermit} actualizado correctamente`);
    console.log('📧 Email principal:', permit.applicantEmail);
    console.log('📧 Emails adicionales:', permit.notificationEmails);

    // 🆕 SINCRONIZAR CAMPOS RELACIONADOS EN BUDGET
    // Actualizar también los campos del Budget que están denormalizados
    const { Budget } = require('../data');
    
    const budgetUpdateData = {};
    if (applicantName !== undefined) budgetUpdateData.applicantName = applicantName;
    if (propertyAddress !== undefined) budgetUpdateData.propertyAddress = propertyAddress;

    // Solo actualizar Budget si hay cambios en campos relevantes
    if (Object.keys(budgetUpdateData).length > 0) {
      const updatedBudgetsCount = await Budget.update(budgetUpdateData, {
        where: { PermitIdPermit: idPermit }
      });
      
      console.log(`🔄 Sincronizados ${updatedBudgetsCount[0]} Budget(s) asociados con el Permit`);
    }

    res.status(200).json({
      success: true,
      message: 'Permit actualizado correctamente',
      permit: permit.get({ plain: true })
    });

  } catch (error) {
    console.error('❌ Error al actualizar permit:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: true,
        message: 'El número de permit ya existe',
        field: 'permitNumber'
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: true,
        message: error.errors.map(e => e.message).join(', '),
        validationErrors: error.errors
      });
    }

    next(error);
  }
};

module.exports = {
  createPermit,
  getPermits,
  getPermitById,
  updatePermit,
  downloadPermitPdf,
  getPermitPdfInline, 
  getPermitOptionalDocInline,
  getContactList,
  checkPermitByPropertyAddress,
  checkPermitNumber, // 🆕 NUEVO
  updatePermitClientData, // NUEVO MÉTODO
  updatePermitFields, // 🆕 NUEVO: Actualizar campos completos del Permit
  replacePermitPdf, // 🆕 NUEVO: Reemplazar PDF principal
  replaceOptionalDocs, // 🆕 NUEVO: Reemplazar documentos opcionales
};