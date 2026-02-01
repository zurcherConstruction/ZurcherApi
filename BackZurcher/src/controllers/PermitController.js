const { Permit, Budget } = require('../data');
const { conn } = require('../data');
const { PDFDocument } = require('pdf-lib');

// ✅ HELPER: Comprimir PDF si es muy grande
const compressPdfIfNeeded = async (buffer, filename) => {
  const MAX_SIZE = 8 * 1024 * 1024; // 8 MB (dejamos margen antes del límite de 10 MB)
  const originalSize = buffer.length;
  
  // Si el PDF es menor a 8 MB, no comprimir
  if (originalSize <= MAX_SIZE) {
    console.log(`📄 ${filename}: ${(originalSize / 1024 / 1024).toFixed(2)} MB - No requiere compresión`);
    return buffer;
  }
  
  // console.log(`🗜️  ${filename}: ${(originalSize / 1024 / 1024).toFixed(2)} MB - Comprimiendo...`);
  
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    
    // Opciones de compresión
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });
    
    const compressedBuffer = Buffer.from(compressedBytes);
    const compressedSize = compressedBuffer.length;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    // console.log(`   📉 Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    // console.log(`   📉 Comprimido: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    // console.log(`   ✅ Reducción: ${reduction}%`);
    
    // Si aún es muy grande después de comprimir, mostrar advertencia
    if (compressedSize > 10 * 1024 * 1024) {
      console.warn(`   ⚠️  PDF aún muy grande después de comprimir (${(compressedSize / 1024 / 1024).toFixed(2)} MB > 10 MB)`);
      console.warn(`   💡 Considera dividir el PDF o contactar soporte`);
    }
    
    return compressedBuffer;
  } catch (error) {
    console.error(`   ❌ Error comprimiendo PDF:`, error.message);
    console.log(`   ⚠️  Usando PDF original sin comprimir`);
    return buffer; // Retornar original si falla la compresión
  }
};

// 🆕 Función auxiliar para combinar PDF firmado con adjunto
const combinePPIWithAttachment = async (signedPdfPath) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const attachmentPath = path.join(__dirname, '../templates/ppi/ppi-adjunto.pdf');
    
    if (!fs.existsSync(attachmentPath)) {
      console.warn('⚠️ No se encontró el archivo de adjunto PPI, continuando sin combinar');
      return signedPdfPath; // Retornar el PDF original sin modificar
    }

    // Leer ambos PDFs
    const signedPdfBytes = fs.readFileSync(signedPdfPath);
    const attachmentBytes = fs.readFileSync(attachmentPath);

    // Cargar PDFs con pdf-lib
    const signedPdf = await PDFDocument.load(signedPdfBytes);
    const attachmentPdf = await PDFDocument.load(attachmentBytes);

    // Copiar todas las páginas del adjunto al PDF firmado
    const attachmentPages = await signedPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
    attachmentPages.forEach((page) => {
      signedPdf.addPage(page);
    });

    // Guardar el PDF combinado
    const combinedPdfBytes = await signedPdf.save();
    const combinedPath = signedPdfPath.replace('.pdf', '_combined.pdf');
    fs.writeFileSync(combinedPath, combinedPdfBytes);

    console.log(`✅ PDF combinado creado: ${combinedPath}`);
    
    // Eliminar el PDF original sin combinar
    fs.unlinkSync(signedPdfPath);
    
    return combinedPath;
  } catch (error) {
    console.error('❌ Error al combinar PDF con adjunto:', error.message);
    return signedPdfPath; // En caso de error, retornar el PDF original
  }
};

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
    // console.log("Request body:", req.body);
    // console.log("Request files:", req.files);

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
    
    // ✅ NUEVA VALIDACIÓN: Verificar que el Permit Number no exista O que exista pero sin presupuesto
    const existingPermit = await Permit.findOne({
      where: { permitNumber: req.body.permitNumber.trim() },
      include: [{
        model: Budget,
        as: 'Budgets',
        attributes: ['idBudget'],
        required: false
      }]
    });
    
    if (existingPermit) {
      // Verificar si tiene presupuestos asociados
      const hasBudgets = existingPermit.Budgets && existingPermit.Budgets.length > 0;
      
      if (hasBudgets) {
        // Si tiene presupuestos, no permitir reusar
        return res.status(409).json({ 
          error: true, 
          message: `Permit Number '${req.body.permitNumber}' already exists and has associated budgets. Please use a different permit number.`,
          hasBudget: true
        });
      } else {
        // Si no tiene presupuestos, permitir reusar y devolver el permit existente
        console.log(`✅ Permit '${req.body.permitNumber}' existe pero sin presupuestos. Reutilizando...`);
        return res.status(200).json({
          success: true,
          message: `Permit '${req.body.permitNumber}' already exists but has no associated budgets. You can use it to create a budget.`,
          permit: existingPermit.get({ plain: true }),
          isExisting: true,
          hasBudget: false
        });
      }
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
      ppiInspectorType, // 🆕 NUEVO: Tipo de inspector PPI
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
      // console.log('📤 Subiendo Permit PDF a Cloudinary...');
      
      // ✅ COMPRIMIR PDF si es necesario
      const compressedBuffer = await compressPdfIfNeeded(
        req.files.pdfData[0].buffer,
        'Permit PDF'
      );
      
      // ✅ VALIDAR TAMAÑO DESPUÉS DE COMPRIMIR
      const finalSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
      const MAX_SIZE_MB = 10;
      
      if (compressedBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
        console.error(`❌ PDF demasiado grande: ${finalSizeMB} MB (máximo: ${MAX_SIZE_MB} MB)`);
        return res.status(400).json({
          error: true,
          message: `El PDF es demasiado grande (${finalSizeMB} MB). El tamaño máximo permitido es ${MAX_SIZE_MB} MB. Por favor, divide el PDF en partes más pequeñas o comprime el archivo antes de subirlo.`,
          sizeMB: parseFloat(finalSizeMB),
          maxSizeMB: MAX_SIZE_MB
        });
      }
      
      // Convertir buffer (comprimido o original) a base64 para Cloudinary
      const base64File = compressedBuffer.toString('base64');
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
      // console.log('📤 Subiendo Optional Docs a Cloudinary...');
      
      // ✅ COMPRIMIR PDF si es necesario
      const compressedBuffer = await compressPdfIfNeeded(
        req.files.optionalDocs[0].buffer,
        'Optional Docs'
      );
      
      // ✅ VALIDAR TAMAÑO DESPUÉS DE COMPRIMIR
      const finalSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
      const MAX_SIZE_MB = 10;
      
      if (compressedBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
        console.error(`❌ Optional Docs demasiado grande: ${finalSizeMB} MB (máximo: ${MAX_SIZE_MB} MB)`);
        return res.status(400).json({
          error: true,
          message: `El documento opcional es demasiado grande (${finalSizeMB} MB). El tamaño máximo permitido es ${MAX_SIZE_MB} MB. Por favor, divide el documento en partes más pequeñas o comprime el archivo antes de subirlo.`,
          sizeMB: parseFloat(finalSizeMB),
          maxSizeMB: MAX_SIZE_MB
        });
      }
      
      const base64File = compressedBuffer.toString('base64');
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
      // console.log('✅ Optional Docs subido a Cloudinary:', optionalDocsUrl);
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
      ppiInspectorType: ppiInspectorType || null, // 🆕 Tipo de inspector PPI
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

    // 🔍 Detectar si cambió el email
    const emailChanged = updates.applicantEmail && updates.applicantEmail !== permit.applicantEmail;

    Object.assign(permit, updates);
    if (pdfData) permit.pdfData = pdfData;

    await permit.save();

    // 🔄 Si cambió el email, actualizar en Budgets relacionados
    if (emailChanged) {
      const { Budget } = require('../data');
      await Budget.update(
        { applicantEmail: updates.applicantEmail },
        { where: { PermitIdPermit: idPermit } }
      );
      console.log(`✅ Email actualizado en ${idPermit} Permit y sus Budgets asociados`);
    }

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

    // 🔍 Detectar si cambió el email
    const emailChanged = applicantEmail && applicantEmail !== permit.applicantEmail;

    // Preparar datos para actualizar
    const updateData = {};
    if (applicantName) updateData.applicantName = applicantName;
    if (applicantEmail) updateData.applicantEmail = applicantEmail;
    if (applicantPhone) updateData.applicantPhone = applicantPhone;
    if (propertyAddress) updateData.propertyAddress = propertyAddress;

    // Actualizar el Permit
    await permit.update(updateData);

    console.log(`✅ Permit ${idPermit} datos de cliente actualizados:`, updateData);

    // 🔄 Si cambió el email, actualizar en Budgets relacionados
    if (emailChanged) {
      const { Budget } = require('../data');
      await Budget.update(
        { applicantEmail: applicantEmail },
        { where: { PermitIdPermit: idPermit } }
      );
      console.log(`✅ Email actualizado en Permit ${idPermit} y sus Budgets asociados`);
    }

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
    
    // ✅ COMPRIMIR PDF si es necesario
    const compressedBuffer = await compressPdfIfNeeded(
      req.file.buffer,
      'Replacement Permit PDF'
    );
    
    // ✅ VALIDAR TAMAÑO DESPUÉS DE COMPRIMIR
    const finalSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
    const MAX_SIZE_MB = 10;
    
    if (compressedBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
      console.error(`❌ PDF demasiado grande: ${finalSizeMB} MB (máximo: ${MAX_SIZE_MB} MB)`);
      return res.status(400).json({
        error: true,
        message: `El PDF es demasiado grande (${finalSizeMB} MB). El tamaño máximo permitido es ${MAX_SIZE_MB} MB. Por favor, comprime el archivo antes de subirlo.`,
        sizeMB: parseFloat(finalSizeMB),
        maxSizeMB: MAX_SIZE_MB
      });
    }
    
    const base64File = compressedBuffer.toString('base64');
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
    
    // ✅ COMPRIMIR PDF si es necesario
    const compressedBuffer = await compressPdfIfNeeded(
      req.file.buffer,
      'Replacement Optional Docs'
    );
    
    // ✅ VALIDAR TAMAÑO DESPUÉS DE COMPRIMIR
    const finalSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
    const MAX_SIZE_MB = 10;
    
    if (compressedBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
      console.error(`❌ Documento demasiado grande: ${finalSizeMB} MB (máximo: ${MAX_SIZE_MB} MB)`);
      return res.status(400).json({
        error: true,
        message: `El documento es demasiado grande (${finalSizeMB} MB). El tamaño máximo permitido es ${MAX_SIZE_MB} MB. Por favor, comprime el archivo antes de subirlo.`,
        sizeMB: parseFloat(finalSizeMB),
        maxSizeMB: MAX_SIZE_MB
      });
    }
    
    const base64File = compressedBuffer.toString('base64');
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
      attributes: ['idPermit', 'permitNumber', 'propertyAddress'],
      include: [{
        model: Budget,
        as: 'Budgets',
        attributes: ['idBudget'],
        required: false
      }]
    });

    if (permit) {
      const hasBudgets = permit.Budgets && permit.Budgets.length > 0;
      return res.status(200).json({
        exists: true,
        permitNumber: permit.permitNumber,
        propertyAddress: permit.propertyAddress,
        hasBudget: hasBudgets
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
      propertyAddress,
      ppiInspectorType, // 🆕 Tipo de inspector PPI
      // 🆕 Campos PPI Part 1
      ppiPropertyOwnerEmail,
      ppiPropertyOwnerPhone,
      // 🆕 Campos PPI Part 2
      city,
      state,
      zipCode,
      subdivision,
      unit,
      section,
      township,
      range,
      parcelNo,
      applicationNo,
      // 🆕 Campos PPI Part 3
      ppiAuthorizationType
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
    if (ppiInspectorType !== undefined) updateData.ppiInspectorType = ppiInspectorType || null;
    
    // 🆕 Campos PPI Part 1
    if (ppiPropertyOwnerEmail !== undefined) updateData.ppiPropertyOwnerEmail = ppiPropertyOwnerEmail;
    if (ppiPropertyOwnerPhone !== undefined) updateData.ppiPropertyOwnerPhone = ppiPropertyOwnerPhone;
    
    // 🆕 Campos PPI Part 2
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (subdivision !== undefined) updateData.subdivision = subdivision;
    if (unit !== undefined) updateData.unit = unit;
    if (section !== undefined) updateData.section = section;
    if (township !== undefined) updateData.township = township;
    if (range !== undefined) updateData.range = range;
    if (parcelNo !== undefined) updateData.parcelNo = parcelNo;
    if (applicationNo !== undefined) updateData.applicationNo = applicationNo;
    
    // 🆕 Campos PPI Part 3
    if (ppiAuthorizationType !== undefined) updateData.ppiAuthorizationType = ppiAuthorizationType;

    // Aplicar actualizaciones
    Object.assign(permit, updateData);
    await permit.save();

    // console.log(`✅ Permit ${idPermit} actualizado correctamente`);
    // console.log('📧 Email principal:', permit.applicantEmail);
    // console.log('📧 Emails adicionales:', permit.notificationEmails);

    // 🆕 SINCRONIZAR CAMPOS RELACIONADOS EN BUDGET Y WORK
    // Actualizar también los campos del Budget que están denormalizados
    const { Budget, Work } = require('../data');
    
    const budgetUpdateData = {};
    if (applicantName !== undefined) budgetUpdateData.applicantName = applicantName;
    if (applicantEmail !== undefined) budgetUpdateData.applicantEmail = applicantEmail; // 🔄 Sincronizar email
    if (propertyAddress !== undefined) budgetUpdateData.propertyAddress = propertyAddress;

    // Solo actualizar Budget si hay cambios en campos relevantes
    if (Object.keys(budgetUpdateData).length > 0) {
      const updatedBudgetsCount = await Budget.update(budgetUpdateData, {
        where: { PermitIdPermit: idPermit }
      });
      
      console.log(`🔄 Sincronizados ${updatedBudgetsCount[0]} Budget(s) asociados con el Permit`);
    }

    // 🆕 SINCRONIZAR CAMPOS EN WORK
    // Works que están relacionados via idPermit también necesitan sincronizar campos
    const workUpdateData = {};
    if (applicantName !== undefined) workUpdateData.applicantName = applicantName;
    if (applicantEmail !== undefined) workUpdateData.applicantEmail = applicantEmail;
    if (propertyAddress !== undefined) workUpdateData.propertyAddress = propertyAddress;

    // Solo actualizar Work si hay cambios en campos relevantes
    if (Object.keys(workUpdateData).length > 0) {
      const updatedWorksCount = await Work.update(workUpdateData, {
        where: { idPermit: idPermit }
      });
      
      console.log(`🔄 Sincronizados ${updatedWorksCount[0]} Work(s) asociados con el Permit`);
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

/**
 * 🆕 Generar PPI de preview/prueba para un Permit
 * Usa plantilla única (type-a) con campos de inspector vacíos
 */
const generatePPIPreview = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const inspectorType = 'type-a'; // 🆕 FIJO: Siempre usar Type-A

    console.log(`\n📋 === GENERANDO PPI PREVIEW ===`);
    console.log(`🔍 Permit ID: ${idPermit}`);
    console.log(`🔍 Inspector Type: ${inspectorType} (plantilla única)`);

    // Buscar el permit
    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    // 🔍 DEBUG: Ver qué trae el permit desde la DB
    console.log('🔍 permit.applicationNo desde DB:', permit.applicationNo);
    console.log('🔍 permit.city desde DB:', permit.city);
    
    // Verificar directamente en la DB si existe el dato
    const [rawResult] = await conn.query(
      `SELECT "applicationNo", city FROM "Permits" WHERE "idPermit" = :idPermit`,
      { replacements: { idPermit }, type: conn.QueryTypes.SELECT }
    );
    console.log('🔍 RAW Query applicationNo:', rawResult?.applicationNo);
    console.log('🔍 RAW Query city:', rawResult?.city);

    // Preparar datos del permit
    const permitData = {
      idPermit: permit.idPermit,
      permitNumber: permit.permitNumber,
      jobAddress: permit.propertyAddress,
      city: permit.city || '',
      state: permit.state || 'FL',
      zipCode: permit.zipCode || '',
      lot: permit.lot || '',
      block: permit.block || '',
      subdivision: permit.subdivision || '',
      unit: permit.unit || '',
      section: permit.section || '',
      township: permit.township || '',
      range: permit.range || '',
      parcelNo: permit.parcelNo || '',
      applicationNo: permit.applicationNo || '',
      ppiPropertyOwnerEmail: permit.ppiPropertyOwnerEmail || 'admin@zurcherseptic.com',
      ppiPropertyOwnerPhone: permit.ppiPropertyOwnerPhone || '(941) 505-5104',
      ppiAuthorizationType: permit.ppiAuthorizationType || 'initial'
    };

    // Preparar datos del cliente
    const clientData = {
      name: permit.applicantName || '',
      email: permit.applicantEmail || '',
      phone: permit.applicantPhone || ''
    };

    // Generar PPI
    const ServicePPI = require('../services/ServicePPI');
    const ppiPath = await ServicePPI.generatePPI(permitData, clientData, inspectorType);

    console.log(`✅ PPI Preview generado localmente: ${ppiPath}`);

    // 🆕 SUBIR A CLOUDINARY
    try {
      const { cloudinary } = require('../utils/cloudinaryConfig');
      const fs = require('fs');

      // 1️⃣ Eliminar PPI anterior de Cloudinary si existe
      if (permit.ppiCloudinaryPublicId) {
        console.log(`🗑️  Eliminando PPI anterior de Cloudinary: ${permit.ppiCloudinaryPublicId}`);
        try {
          await cloudinary.uploader.destroy(permit.ppiCloudinaryPublicId, { resource_type: 'raw' });
          console.log(`✅ PPI anterior eliminado de Cloudinary`);
        } catch (deleteError) {
          console.warn(`⚠️  Error eliminando PPI anterior de Cloudinary:`, deleteError.message);
        }
      }

      // 2️⃣ Subir nuevo PPI a Cloudinary
      console.log(`☁️  Subiendo PPI a Cloudinary...`);
      const uploadResult = await cloudinary.uploader.upload(ppiPath, {
        folder: 'zurcher/ppi',
        resource_type: 'raw',
        public_id: `ppi_permit_${idPermit}_${Date.now()}`,
        overwrite: false
      });

      console.log(`✅ PPI subido a Cloudinary: ${uploadResult.secure_url}`);

      // 3️⃣ Eliminar archivo local después de subir
      try {
        fs.unlinkSync(ppiPath);
        console.log(`🗑️  Archivo local eliminado: ${ppiPath}`);
      } catch (unlinkError) {
        console.warn(`⚠️  No se pudo eliminar archivo local:`, unlinkError.message);
      }

      // 4️⃣ Actualizar permit con URLs de Cloudinary
      await permit.update({
        ppiInspectorType: inspectorType,
        ppiGeneratedPath: uploadResult.secure_url, // Ahora guarda URL de Cloudinary
        ppiCloudinaryUrl: uploadResult.secure_url,
        ppiCloudinaryPublicId: uploadResult.public_id,
        ppiUploadedAt: new Date()
      });

      console.log(`✅ Permit actualizado con URLs de Cloudinary`);

      // Devolver URL de Cloudinary
      res.json({
        success: true,
        message: 'PPI generated and uploaded to Cloudinary successfully',
        ppiPath: uploadResult.secure_url,
        ppiCloudinaryUrl: uploadResult.secure_url,
        inspectorType: inspectorType,
        inspectorName: ServicePPI.getInspectorTypeName(inspectorType),
        downloadUrl: `${process.env.API_URL || 'http://localhost:3000'}/permits/${idPermit}/ppi/download`,
        viewUrl: `${process.env.API_URL || 'http://localhost:3000'}/permits/${idPermit}/ppi/view`
      });

    } catch (cloudinaryError) {
      console.error(`❌ Error subiendo PPI a Cloudinary:`, cloudinaryError);
      
      // FALLBACK: Si Cloudinary falla, guardar ruta local
      await permit.update({
        ppiInspectorType: inspectorType,
        ppiGeneratedPath: ppiPath,
        ppiUploadedAt: new Date()
      });

      // Devolver ruta relativa para frontend
      const relativePath = ppiPath.replace(/.*\/uploads\//, '/uploads/');

      res.json({
        success: true,
        message: 'PPI generated successfully (local fallback)',
        ppiPath: relativePath,
        inspectorType: inspectorType,
        inspectorName: ServicePPI.getInspectorTypeName(inspectorType),
        downloadUrl: `${process.env.API_URL || 'http://localhost:3000'}/permits/${idPermit}/ppi/download`,
        viewUrl: `${process.env.API_URL || 'http://localhost:3000'}/permits/${idPermit}/ppi/view`
      });
    }

  } catch (error) {
    console.error('❌ Error generando PPI preview:', error);
    res.status(500).json({ 
      error: 'Error generating PPI preview',
      details: error.message 
    });
  }
};

/**
 * 🆕 Descargar PPI generado (con soporte Cloudinary)
 */
const downloadPPI = async (req, res) => {
  try {
    const { idPermit } = req.params;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    const ppiUrl = permit.ppiCloudinaryUrl || permit.ppiGeneratedPath;

    if (!ppiUrl) {
      return res.status(404).json({ error: 'No PPI document found for this permit' });
    }

    const fs = require('fs');
    const path = require('path');
    const fileName = `PPI_${permit.ppiInspectorType}_Permit_${permit.permitNumber}.pdf`;

    // Si es URL de Cloudinary, descargar y enviar
    if (ppiUrl.startsWith('http')) {
      console.log(`☁️  Descargando PPI desde Cloudinary para download: ${ppiUrl}`);
      const axios = require('axios');
      
      try {
        const response = await axios.get(ppiUrl, { responseType: 'arraybuffer' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(Buffer.from(response.data));
        
      } catch (cloudinaryError) {
        console.error('❌ Error descargando desde Cloudinary:', cloudinaryError.message);
        return res.status(500).json({ error: 'Error downloading PPI from Cloudinary' });
      }
    } else {
      // Archivo local
      if (!fs.existsSync(ppiUrl)) {
        return res.status(404).json({ error: 'PPI file not found on server' });
      }

      res.download(ppiUrl, fileName, (err) => {
        if (err) {
          console.error('❌ Error descargando PPI:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading PPI' });
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Error en downloadPPI:', error);
    res.status(500).json({ 
      error: 'Error downloading PPI',
      details: error.message 
    });
  }
};

/**
 * 🆕 Ver PPI en el navegador (inline - con soporte Cloudinary)
 */
const viewPPIInline = async (req, res) => {
  try {
    const { idPermit } = req.params;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    const ppiUrl = permit.ppiCloudinaryUrl || permit.ppiGeneratedPath;

    if (!ppiUrl) {
      return res.status(404).json({ error: 'No PPI document found for this permit' });
    }

    const fs = require('fs');

    // Si es URL de Cloudinary, descargar y mostrar
    if (ppiUrl.startsWith('http')) {
      console.log(`☁️  Descargando PPI desde Cloudinary para view: ${ppiUrl}`);
      const axios = require('axios');
      
      try {
        const response = await axios.get(ppiUrl, { responseType: 'arraybuffer' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.send(Buffer.from(response.data));
        
      } catch (cloudinaryError) {
        console.error('❌ Error descargando desde Cloudinary:', cloudinaryError.message);
        return res.status(500).json({ error: 'Error viewing PPI from Cloudinary' });
      }
    } else {
      // Archivo local
      if (!fs.existsSync(ppiUrl)) {
        return res.status(404).json({ error: 'PPI file not found on server' });
      }

      const pdfBuffer = fs.readFileSync(ppiUrl);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.send(pdfBuffer);
    }

  } catch (error) {
    console.error('❌ Error en viewPPIInline:', error);
    res.status(500).json({ 
      error: 'Error viewing PPI',
      details: error.message 
    });
  }
};

/**
 * 🆕 Enviar PPI a DocuSign para firma del cliente
 * POST /permit/:idPermit/ppi/send-for-signature
 */
const sendPPIForSignature = async (req, res) => {
  let ppiPath = null;
  try {
    const { idPermit } = req.params;
    
    console.log(`\n📧 === ENVIANDO PPI A DOCUSIGN PARA FIRMA ===`);
    console.log(`🔍 Permit ID: ${idPermit}`);

    // Buscar el permit
    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    // Verificar email del cliente
    if (!permit.applicantEmail) {
      return res.status(400).json({ 
        error: 'No client email configured for this permit' 
      });
    }

    // 🆕 Verificar que existe PPI en Cloudinary o local
    const ppiUrl = permit.ppiCloudinaryUrl || permit.ppiGeneratedPath;
    
    if (!ppiUrl) {
      return res.status(400).json({ 
        error: 'No PPI document found. Please generate PPI first.' 
      });
    }

    const fs = require('fs');
    const path = require('path');
    
    // 🆕 Si es URL de Cloudinary, descargar temporalmente
    if (ppiUrl.startsWith('http')) {
      console.log(`☁️  Descargando PPI desde Cloudinary para DocuSign: ${ppiUrl}`);
      const axios = require('axios');
      const uploadsDir = path.join(__dirname, '../uploads/temp');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const response = await axios.get(ppiUrl, { responseType: 'arraybuffer' });
      ppiPath = path.join(uploadsDir, `ppi_docusign_${permit.idPermit}_${Date.now()}.pdf`);
      fs.writeFileSync(ppiPath, response.data);
      console.log(`✅ PPI descargado temporalmente: ${ppiPath}`);
    } else if (fs.existsSync(ppiUrl)) {
      ppiPath = ppiUrl;
      console.log(`✅ PPI encontrado localmente: ${ppiPath}`);
    } else {
      return res.status(404).json({ 
        error: 'PPI file not found. Please regenerate PPI.' 
      });
    }

    // Preparar información
    const propertyAddress = permit.propertyAddress || 'Property';
    const fileName = `PPI_Inspection_${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // Inicializar DocuSign
    const DocuSignService = require('../services/ServiceDocuSign');
    const docusignService = new DocuSignService();
    
    // Mensajes para DocuSign (NO se enviarán porque usaremos suppress_emails)
    const emailSubject = `🚨 URGENT: PPI Signature Required - ${propertyAddress}`;
    const emailMessage = `Property Owner signature required for PPI document.`;

    console.log(`📤 Enviando PPI a DocuSign (sin correo automático)...`);
    console.log(`📧 Cliente: ${permit.applicantEmail} - ${permit.applicantName}`);
    console.log(`📁 Archivo: ${fileName}`);

    // Enviar a DocuSign SIN correo automático
    const signatureResult = await docusignService.sendBudgetForSignature(
      ppiPath,
      permit.applicantEmail,
      permit.applicantName || 'Property Owner',
      fileName,
      emailSubject,
      emailMessage
    );

    console.log(`✅ PPI enviado a DocuSign exitosamente (Envelope ID: ${signatureResult.envelopeId})`);

    // Actualizar permit con info de DocuSign
    await permit.update({
      ppiDocusignEnvelopeId: signatureResult.envelopeId,
      ppiSentForSignatureAt: new Date(),
      ppiSignatureStatus: 'sent'
    });

    // 📧 AHORA SÍ ENVIAR NUESTRO CORREO PERSONALIZADO (después de tener envelopeId)
    console.log('📧 Enviando correo personalizado al cliente...');
    
    const { sendEmail } = require('../services/ServiceEmail');
    
    const clientMailOptions = {
      to: permit.applicantEmail,
      subject: `🚨 IMPORTANT: Property Owner Signature Required - PPI for ${propertyAddress}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 650px; margin: 0 auto; padding: 0; }
            .header { 
              background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center;
              border-radius: 0 0 20px 20px;
            }
            .header h1 { margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .urgent-banner {
              background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              margin: 0;
              border-bottom: 4px solid #c23616;
            }
            .content { 
              background-color: #ffffff; 
              padding: 40px 30px; 
            }
            .warning-box {
              background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%);
              border-left: 6px solid #ff6b35;
              padding: 25px;
              margin: 30px 0;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(255, 107, 53, 0.2);
            }
            .warning-box h3 {
              color: #ff6b35;
              margin-top: 0;
              font-size: 22px;
            }
            .requirement-box {
              background: linear-gradient(135deg, #fee 0%, #fdd 100%);
              border: 3px solid #ff4757;
              padding: 25px;
              margin: 25px 0;
              border-radius: 10px;
              text-align: center;
            }
            .requirement-box h3 {
              color: #c23616;
              margin-top: 0;
              font-size: 24px;
              text-transform: uppercase;
            }
            .info-box {
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
              border-left: 6px solid #2196f3;
              padding: 20px;
              margin: 25px 0;
              border-radius: 8px;
            }
            .steps {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              padding: 25px;
              border-radius: 10px;
              margin: 25px 0;
            }
            .steps h3 { 
              color: #ff6b35; 
              margin-top: 0;
              font-size: 22px;
            }
            .step {
              margin: 15px 0;
              padding-left: 10px;
            }
            .step-number {
              display: inline-block;
              background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
              color: white;
              width: 30px;
              height: 30px;
              line-height: 30px;
              text-align: center;
              border-radius: 50%;
              font-weight: bold;
              margin-right: 10px;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
              padding: 30px;
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border-radius: 15px;
            }
            .btn-sign {
              display: inline-block;
              background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
              color: white;
              padding: 20px 50px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: bold;
              font-size: 20px;
              box-shadow: 0 8px 25px rgba(255, 107, 53, 0.4);
              transition: all 0.3s ease;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .btn-sign:hover {
              transform: translateY(-3px);
              box-shadow: 0 12px 35px rgba(255, 107, 53, 0.5);
            }
            .footer {
              background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
              color: white;
              text-align: center;
              padding: 30px;
              font-size: 14px;
            }
            .highlight {
              background-color: #fff9c4;
              padding: 2px 6px;
              border-radius: 3px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="urgent-banner">
              🚨 URGENT: PROPERTY OWNER SIGNATURE REQUIRED 🚨
            </div>
            
            <div class="header">
              <h1>📋 Pre-Permit Inspection (PPI)<br/>Authorization Document</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; margin-bottom: 25px;">
                Dear <strong>${permit.applicantName || 'Property Owner'}</strong>,
              </p>
              
              <div class="requirement-box">
                <h3>⚠️ PROPERTY OWNER SIGNATURE REQUIRED ⚠️</h3>
                <p style="font-size: 18px; margin: 15px 0; line-height: 1.8;">
                  <strong style="color: #c23616;">This document MUST be signed exclusively by the PROPERTY OWNER.</strong><br/>
                  <span style="font-size: 16px;">No other person is authorized to sign this document.</span>
                </p>
              </div>
              
              <div class="warning-box">
                <h3>🛑 CRITICAL INFORMATION</h3>
                <p style="font-size: 17px; line-height: 1.8; margin: 10px 0;">
                  <strong>WITHOUT THIS SIGNED DOCUMENT, WE CANNOT REQUEST THE INSPECTION.</strong>
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin: 10px 0;">
                  The Pre-Permit Inspection (PPI) authorization is a <span class="highlight">MANDATORY REQUIREMENT</span> 
                  to proceed with the inspection process for your property at:
                </p>
                <p style="font-size: 18px; font-weight: bold; color: #ff6b35; margin: 15px 0; text-align: center;">
                  📍 ${propertyAddress}
                </p>
              </div>
              
              <div class="info-box">
                <p style="margin: 0; font-size: 16px; line-height: 1.6;">
                  <strong style="color: #1565c0;">📌 What is the PPI?</strong><br/>
                  The PPI (Pre-Permit Inspection) is an official document that authorizes our licensed inspector 
                  to conduct the required septic system inspection on your property. This inspection is 
                  <strong>mandatory</strong> before we can proceed with the permit application.
                </p>
              </div>
              
              <div class="steps">
                <h3>📝 How to Sign (Simple Steps):</h3>
                
                <div class="step">
                  <span class="step-number">1</span>
                  <strong style="font-size: 17px;">Click the orange "SIGN PPI DOCUMENT" button below</strong>
                </div>
                
                <div class="step">
                  <span class="step-number">2</span>
                  <strong style="font-size: 17px;">You will be redirected to DocuSign (secure platform)</strong>
                </div>
                
                <div class="step">
                  <span class="step-number">3</span>
                  <strong style="font-size: 17px;">Follow the instructions to sign electronically</strong>
                </div>
                
                <div class="step">
                  <span class="step-number">4</span>
                  <strong style="font-size: 17px;">Done! You will receive a confirmation email</strong>
                </div>
              </div>
              
              <div class="button-container">
                <p style="margin-bottom: 25px; font-size: 16px; color: #666;">
                  <strong>Ready to sign? Click the button below:</strong>
                </p>
                <a href="${process.env.API_URL || 'https://zurcherapi.up.railway.app'}/permit/${permit.idPermit}/ppi/sign" 
                   class="btn-sign">
                  ✍️ SIGN PPI DOCUMENT
                </a>
                <p style="margin-top: 20px; font-size: 14px; color: #999;">
                  💡 <strong>Note:</strong> This link does not expire. You can sign at your convenience.
                </p>
              </div>
              
              <div class="info-box" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-left-color: #4caf50;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6;">
                  <strong style="color: #2e7d32;">✅ After You Sign:</strong><br/>
                  Once we receive your signed PPI, we will immediately proceed to schedule the inspection 
                  with the county. You will be notified of the inspection date and any additional steps required.
                </p>
              </div>
              
              <p style="margin-top: 35px; margin-bottom: 25px; font-size: 16px; line-height: 1.6;">
                If you have any questions about this document or the signing process, please don't hesitate 
                to contact us. We're here to help!
              </p>
              
              <p style="margin-top: 30px; font-size: 16px;">
                Thank you for your prompt attention to this matter.
              </p>
              
              <p style="margin-top: 20px; font-size: 16px; font-weight: bold; color: #ff6b35;">
                Best regards,<br/>
                Zurcher Septic Team
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">ZURCHER SEPTIC</p>
              <p style="margin: 0 0 10px 0;">SEPTIC TANK DIVISION - License CFC1433240</p>
              <p style="margin: 0 0 10px 0;">
                📧 admin@zurcherseptic.com | 📞 (941) 505-5104
              </p>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #bdc3c7;">
                Professional Septic Installation & Maintenance<br/>
                Serving Florida with Excellence
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [{
        filename: fileName,
        path: ppiPath,
        contentType: 'application/pdf'
      }]
    };

    try {
      const clientEmailResult = await sendEmail(clientMailOptions);
      
      if (clientEmailResult.success) {
        console.log(`✅ Correo personalizado enviado exitosamente al cliente en ${clientEmailResult.duration}ms.`);
      } else {
        console.error(`❌ Error al enviar correo personalizado al cliente: ${clientEmailResult.error}`);
      }
    } catch (clientEmailError) {
      console.error(`❌ Error al enviar correo personalizado:`, clientEmailError);
      // No fallar la operación, DocuSign ya tiene el documento
    }

    res.json({
      success: true,
      message: 'PPI sent successfully. Client will receive an email with instructions to sign.',
      data: {
        permitId: permit.idPermit,
        envelopeId: signatureResult.envelopeId,
        signerEmail: permit.applicantEmail,
        signerName: permit.applicantName,
        fileName: fileName
      }
    });

  } catch (error) {
    console.error('❌ Error enviando PPI a DocuSign:', error);
    res.status(500).json({ 
      error: 'Error sending PPI for signature',
      details: error.message 
    });
  } finally {
    // 🗑️ Limpiar archivo temporal si existe
    if (ppiPath && ppiPath.includes('/temp/')) {
      const fs = require('fs');
      try {
        if (fs.existsSync(ppiPath)) {
          fs.unlinkSync(ppiPath);
          console.log(`🗑️  PPI temporal eliminado: ${ppiPath}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️  No se pudo eliminar PPI temporal:`, cleanupError.message);
      }
    }
  }
};

// 🆕 NUEVO: Generar enlace de firma on-demand para PPI y redirigir a DocuSign
const getPPISigningLinkAndRedirect = async (req, res) => {
  const { idPermit } = req.params;

  try {
    console.log('\n🔗 === GENERANDO ENLACE DE FIRMA PPI ON-DEMAND ===');
    console.log(`🔍 Permit ID: ${idPermit}`);

    // Buscar el permit
    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>❌ Documento no encontrado</h1>
            <p>El permit solicitado no existe.</p>
          </body>
        </html>
      `);
    }

    // Verificar que tiene documento de firma en DocuSign
    const envelopeId = permit.ppiDocusignEnvelopeId;
    
    if (!envelopeId) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>⚠️ Documento no disponible</h1>
            <p>Este PPI aún no ha sido enviado para firma.</p>
          </body>
        </html>
      `);
    }

    // Verificar si ya está firmado
    if (permit.ppiSignatureStatus === 'completed' || permit.ppiSignatureStatus === 'signed') {
      return res.status(200).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>✅ Documento ya firmado</h1>
            <p>Este PPI ya ha sido firmado exitosamente.</p>
            <p>Estado: Firmado</p>
          </body>
        </html>
      `);
    }

    console.log(`📧 Cliente: ${permit.applicantEmail} - ${permit.applicantName}`);
    console.log(`📋 Envelope ID: ${envelopeId}`);

    // Inicializar servicio DocuSign
    const DocuSignService = require('../services/ServiceDocuSign');
    const docuSignService = new DocuSignService();

    // Generar enlace de firma en este momento
    const result = await docuSignService.regenerateSigningLink(
      envelopeId,
      permit.applicantEmail,
      permit.applicantName || 'Property Owner'
    );

    console.log('✅ Enlace generado, redirigiendo a DocuSign...');
    console.log(`🔗 URL: ${result.signingUrl}`);

    // Redirigir directamente a DocuSign
    res.redirect(result.signingUrl);

  } catch (error) {
    console.error('❌ Error generando enlace de firma PPI:', error);

    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Error al generar enlace</h1>
          <p>Ocurrió un error al generar el enlace de firma del PPI.</p>
          <p style="color: #666; font-size: 14px;">${error.message}</p>
          <p>Por favor contacte con soporte.</p>
        </body>
      </html>
    `);
  }
};

// 🆕 NUEVO: Ver PPI firmado inline
const viewPPISignedInline = async (req, res) => {
  try {
    const { idPermit } = req.params;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    if (!permit.ppiSignedPdfUrl) {
      return res.status(404).json({ 
        error: 'No signed PPI found for this permit' 
      });
    }

    console.log(`☁️  Descargando PPI firmado desde Cloudinary para view: ${permit.ppiSignedPdfUrl}`);

    const axios = require('axios');
    const response = await axios.get(permit.ppiSignedPdfUrl, { 
      responseType: 'arraybuffer' 
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(response.data);
  } catch (error) {
    console.error('Error viewing signed PPI:', error);
    res.status(500).json({ 
      error: 'Error viewing signed PPI document',
      details: error.message 
    });
  }
};

// 🆕 NUEVO: Descargar PPI firmado
const downloadPPISigned = async (req, res) => {
  try {
    const { idPermit } = req.params;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    if (!permit.ppiSignedPdfUrl) {
      return res.status(404).json({ 
        error: 'No signed PPI found for this permit' 
      });
    }

    console.log(`☁️  Descargando PPI firmado desde Cloudinary: ${permit.ppiSignedPdfUrl}`);

    const axios = require('axios');
    const response = await axios.get(permit.ppiSignedPdfUrl, { 
      responseType: 'arraybuffer' 
    });

    // El PDF ya viene combinado con el adjunto desde el cron job
    // Crear nombre de archivo con propertyAddress sanitizado
    const propertyAddress = permit.propertyAddress || 'Unknown';
    const sanitizedAddress = propertyAddress
      .replace(/[^a-zA-Z0-9\s]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .substring(0, 50); // Limitar longitud
    
    const fileName = `PPI_${sanitizedAddress}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(response.data);
  } catch (error) {
    console.error('Error downloading signed PPI:', error);
    res.status(500).json({ 
      error: 'Error downloading signed PPI document',
      details: error.message 
    });
  }
};

// 🆕 NUEVO: Verificar estado de firma del PPI manualmente
const checkPPISignatureStatus = async (req, res) => {
  try {
    const { idPermit } = req.params;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    if (!permit.ppiDocusignEnvelopeId) {
      return res.status(400).json({ 
        error: 'No PPI signature document found for this permit' 
      });
    }

    console.log(`🔍 Verificando estado de firma del PPI para permit ${idPermit}...`);

    const DocuSignService = require('../services/ServiceDocuSign');
    const docuSignService = new DocuSignService();

    const signatureStatus = await docuSignService.isDocumentSigned(permit.ppiDocusignEnvelopeId);

    if (signatureStatus.signed) {
      console.log(`✅ PPI está firmado. Descargando...`);

      // Descargar y guardar el PDF firmado
      const fs = require('fs');
      const path = require('path');
      const tempDir = path.join(__dirname, '../uploads/temp');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `ppi_${permit.idPermit}_signed_${Date.now()}.pdf`);
      
      await docuSignService.downloadSignedDocument(permit.ppiDocusignEnvelopeId, tempFilePath);

      // 🆕 Combinar con archivo adjunto
      const combinedPdfPath = await combinePPIWithAttachment(tempFilePath);
      console.log(`   -> PPI combinado con adjunto: ${combinedPdfPath}`);

      // Subir a Cloudinary (usar el PDF combinado)
      const { cloudinary } = require('../utils/cloudinaryConfig');
      const uploadResult = await cloudinary.uploader.upload(combinedPdfPath, {
        folder: 'zurcher/ppi/signed',
        resource_type: 'raw',
        public_id: `ppi_signed_permit_${permit.idPermit}_${Date.now()}`,
        tags: [
          `permit-${permit.idPermit}`,
          'ppi',
          'signed'
        ]
      });

      // Actualizar permit
      await permit.update({
        ppiSignatureStatus: 'completed',
        ppiSignedAt: new Date(),
        ppiSignedPdfUrl: uploadResult.secure_url,
        ppiSignedPdfPublicId: uploadResult.public_id
      });

      // Limpiar archivo temporal combinado
      if (fs.existsSync(combinedPdfPath)) {
        fs.unlinkSync(combinedPdfPath);
      }

      res.json({
        success: true,
        message: 'PPI signature completed and document downloaded',
        data: {
          permitId: permit.idPermit,
          signatureStatus: 'completed',
          signedAt: permit.ppiSignedAt,
          signedPdfUrl: permit.ppiSignedPdfUrl
        }
      });
    } else {
      res.json({
        success: true,
        message: 'PPI signature is still pending',
        data: {
          permitId: permit.idPermit,
          signatureStatus: signatureStatus.status,
          currentStatus: permit.ppiSignatureStatus
        }
      });
    }
  } catch (error) {
    console.error('Error checking PPI signature status:', error);
    res.status(500).json({ 
      error: 'Error checking PPI signature status',
      details: error.message 
    });
  }
};

// 🆕 NUEVO: Verificar TODAS las firmas PPI pendientes (ejecución manual del cron)
const verifyAllPPISignatures = async (req, res) => {
  try {
    console.log('🔍 Iniciando verificación manual de TODAS las firmas PPI pendientes...');

    // Buscar todos los permits con PPI enviado para firma pero no completado
    const { Op } = require('sequelize');
    const pendingPPIs = await Permit.findAll({
      where: {
        ppiDocusignEnvelopeId: { [Op.ne]: null },
        ppiSignatureStatus: { [Op.notIn]: ['completed', 'signed'] }
      }
    });

    console.log(`📊 Encontrados ${pendingPPIs.length} PPIs pendientes de verificación`);

    if (pendingPPIs.length === 0) {
      return res.json({
        success: true,
        message: 'No hay PPIs pendientes de verificación',
        checked: 0,
        completed: 0,
        results: []
      });
    }

    const DocuSignService = require('../services/ServiceDocuSign');
    const docuSignService = new DocuSignService();
    const fs = require('fs');
    const path = require('path');
    const { cloudinary } = require('../utils/cloudinaryConfig');

    let completedCount = 0;
    const results = [];

    for (const permit of pendingPPIs) {
      try {
        console.log(`\n🔍 Verificando PPI de Permit #${permit.idPermit}...`);

        const signatureStatus = await docuSignService.isDocumentSigned(permit.ppiDocusignEnvelopeId);

        if (signatureStatus.signed) {
          console.log(`✅ PPI #${permit.idPermit} está firmado. Descargando...`);

          // Crear directorio temporal si no existe
          const tempDir = path.join(__dirname, '../uploads/temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(tempDir, `ppi_${permit.idPermit}_signed_${Date.now()}.pdf`);
          
          // Descargar documento firmado
          await docuSignService.downloadSignedDocument(permit.ppiDocusignEnvelopeId, tempFilePath);

          // Subir a Cloudinary
          const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'zurcher/ppi/signed',
            resource_type: 'raw',
            public_id: `ppi_signed_permit_${permit.idPermit}_${Date.now()}`,
            tags: [
              `permit-${permit.idPermit}`,
              'ppi',
              'signed'
            ]
          });

          // Actualizar permit
          await permit.update({
            ppiSignatureStatus: 'completed',
            ppiSignedAt: new Date(),
            ppiSignedPdfUrl: uploadResult.secure_url,
            ppiSignedPdfPublicId: uploadResult.public_id
          });

          // Limpiar archivo temporal
          fs.unlinkSync(tempFilePath);

          completedCount++;
          results.push({
            permitId: permit.idPermit,
            propertyAddress: permit.propertyAddress,
            status: 'completed',
            signedAt: permit.ppiSignedAt
          });

          console.log(`✅ PPI #${permit.idPermit} procesado y actualizado`);
        } else {
          console.log(`⏳ PPI #${permit.idPermit} aún pendiente (estado: ${signatureStatus.status})`);
          results.push({
            permitId: permit.idPermit,
            propertyAddress: permit.propertyAddress,
            status: 'pending',
            currentStatus: signatureStatus.status
          });
        }
      } catch (error) {
        console.error(`❌ Error procesando PPI #${permit.idPermit}:`, error.message);
        results.push({
          permitId: permit.idPermit,
          propertyAddress: permit.propertyAddress,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`\n✅ Verificación completada: ${completedCount} de ${pendingPPIs.length} PPIs firmados`);

    res.json({
      success: true,
      message: `Verificación completada: ${completedCount} PPIs firmados`,
      checked: pendingPPIs.length,
      completed: completedCount,
      results
    });

  } catch (error) {
    console.error('❌ Error en verificación masiva de firmas PPI:', error);
    res.status(500).json({
      success: false,
      error: 'Error verifying PPI signatures',
      details: error.message
    });
  }
};

// 🆕 NUEVO: Subir PPI firmado manualmente
const uploadManualSignedPPI = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { idPermit } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📤 Subiendo PPI firmado manual para Permit ${idPermit}...`);

    const permit = await Permit.findByPk(idPermit);
    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    // 🆕 Paso 1: Guardar el PDF subido temporalmente
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempUploadedPath = path.join(tempDir, `ppi_manual_${idPermit}_${Date.now()}.pdf`);
    fs.writeFileSync(tempUploadedPath, req.file.buffer);
    console.log(`   -> PDF manual guardado temporalmente: ${tempUploadedPath}`);

    // 🆕 Paso 2: Combinar con el adjunto
    const combinedPdfPath = await combinePPIWithAttachment(tempUploadedPath);
    console.log(`   -> PDF combinado con adjunto: ${combinedPdfPath}`);

    // 🆕 Paso 3: Leer el PDF combinado para subirlo
    const combinedBuffer = fs.readFileSync(combinedPdfPath);

    // Paso 4: Subir a Cloudinary el PDF combinado
    const { cloudinary } = require('../utils/cloudinaryConfig');
    const streamifier = require('streamifier');

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'zurcher/ppi/signed',
        resource_type: 'raw',
        public_id: `ppi_manual_signed_permit_${idPermit}_${Date.now()}`,
        tags: [`permit-${idPermit}`, 'ppi', 'signed', 'manual']
      },
      async (error, result) => {
        // Limpiar archivos temporales
        try {
          if (fs.existsSync(combinedPdfPath)) {
            fs.unlinkSync(combinedPdfPath);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Error limpiando archivo temporal:', cleanupError.message);
        }

        if (error) {
          console.error('❌ Error uploading to Cloudinary:', error);
          return res.status(500).json({ 
            error: 'Error uploading file to cloud storage',
            details: error.message 
          });
        }

        try {
          // Actualizar permit con PPI firmado
          await permit.update({
            ppiSignatureStatus: 'completed',
            ppiSignedAt: new Date(),
            ppiSignedPdfUrl: result.secure_url,
            ppiSignedPdfPublicId: result.public_id
          });

          console.log(`✅ PPI firmado manual (con adjunto) cargado para Permit ${idPermit}`);

          res.json({
            success: true,
            message: 'PPI signed manually uploaded successfully (with attachment)',
            data: {
              permitId: permit.idPermit,
              signatureStatus: 'completed',
              signedAt: permit.ppiSignedAt,
              signedPdfUrl: permit.ppiSignedPdfUrl
            }
          });
        } catch (dbError) {
          console.error('❌ Error updating database:', dbError);
          res.status(500).json({ 
            error: 'Error updating database',
            details: dbError.message 
          });
        }
      }
    );

    streamifier.createReadStream(combinedBuffer).pipe(uploadStream);

  } catch (error) {
    console.error('❌ Error uploading manual signed PPI:', error);
    res.status(500).json({ 
      error: 'Error uploading manual signed PPI',
      details: error.message 
    });
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
  generatePPIPreview, // 🆕 NUEVO: Generar PPI preview
  downloadPPI, // 🆕 NUEVO: Descargar PPI
  viewPPIInline, // 🆕 NUEVO: Ver PPI inline
  getPPISigningLinkAndRedirect, // 🆕 NUEVO: Redirigir a firma DocuSign
  sendPPIForSignature, // 🆕 NUEVO: Enviar PPI a DocuSign
  viewPPISignedInline, // 🆕 NUEVO: Ver PPI firmado inline
  downloadPPISigned, // 🆕 NUEVO: Descargar PPI firmado
  checkPPISignatureStatus, // 🆕 NUEVO: Verificar estado de firma del PPI
  verifyAllPPISignatures, // 🆕 NUEVO: Verificar TODAS las firmas PPI pendientes
  uploadManualSignedPPI // 🆕 NUEVO: Subir PPI firmado manualmente
};