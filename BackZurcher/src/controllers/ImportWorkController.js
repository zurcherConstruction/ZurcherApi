const { Budget, Permit, Work, BudgetLineItem } = require('../data');
const { conn } = require('../data');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');
const { PDFDocument } = require('pdf-lib');

// Función para comprimir PDF si es necesario
const compressPdfIfNeeded = async (buffer, filename = 'PDF') => {
  const originalSize = buffer.length;
  const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
  const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

  if (originalSize <= MAX_SIZE) {
    console.log(`📄 ${filename}: ${originalSizeMB} MB - No requiere compresión`);
    return buffer;
  }

  try {
    console.log(`🗜️  ${filename}: ${originalSizeMB} MB - Comprimiendo...`);
    
    const pdfDoc = await PDFDocument.load(buffer);
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    const compressedBuffer = Buffer.from(compressedBytes);
    const compressedSize = compressedBuffer.length;
    const compressedSizeMB = (compressedSize / 1024 / 1024).toFixed(2);
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`   📉 Original: ${originalSizeMB} MB`);
    console.log(`   📉 Comprimido: ${compressedSizeMB} MB`);
    console.log(`   ✅ Reducción: ${reduction}%`);

    if (compressedSize > 10 * 1024 * 1024) {
      console.warn(`   ⚠️  PDF aún muy grande después de comprimir (${compressedSizeMB} MB > 10 MB)`);
      console.warn(`   💡 Considera dividir el PDF o contactar soporte`);
    }

    return compressedBuffer;
  } catch (error) {
    console.warn(`⚠️ Error al comprimir ${filename}, usando original:`, error.message);
    return buffer;
  }
};

// === 📥 IMPORTAR TRABAJO EXISTENTE ===
// Función simplificada para importar trabajos ya comenzados
async function importExistingWork(req, res) {
  const transaction = await conn.transaction();
  
  try {
    console.log("--- 📥 IMPORTANDO TRABAJO EXISTENTE ---");
    
    // 1️⃣ PROCESAR DOCUMENTOS (Presupuesto firmado, Permit, etc.)
    
    const files = {
      presupuestoFirmado: req.files?.signedBudget?.[0],  // PDF ya firmado del presupuesto
      permit: req.files?.permitPdf?.[0],                 // PDF del permit
      documentosOpcionales: req.files?.optionalDocs?.[0] // Documentos adicionales
    };
    
    console.log("📄 Documentos:", {
      presupuesto: !!files.presupuestoFirmado,
      permit: !!files.permit,
      opcional: !!files.documentosOpcionales
    });
    
    // Función para subir documentos a Cloudinary
    const subirDocumentoACloudinary = async (archivo, carpeta, descripcion) => {
      if (!archivo?.buffer) return null;
      
      try {
        console.log(`📤 Subiendo ${descripcion} a Cloudinary...`);
        
        // ✅ COMPRIMIR PDF si es necesario
        const compressedBuffer = await compressPdfIfNeeded(archivo.buffer, descripcion);
        
        // ✅ VALIDAR TAMAÑO DESPUÉS DE COMPRIMIR
        const finalSizeMB = (compressedBuffer.length / 1024 / 1024).toFixed(2);
        const MAX_SIZE_MB = 10;
        
        if (compressedBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
          console.error(`❌ ${descripcion} demasiado grande: ${finalSizeMB} MB (máximo: ${MAX_SIZE_MB} MB)`);
          throw new Error(`El archivo "${descripcion}" es demasiado grande (${finalSizeMB} MB). El tamaño máximo permitido es ${MAX_SIZE_MB} MB. Por favor, comprime el archivo antes de subirlo.`);
        }
        
        const resultado = await uploadBufferToCloudinary(compressedBuffer, {
          folder: `legacy-imports/${carpeta}`,
          resource_type: 'auto',
          public_id: `${Date.now()}-${archivo.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
          format: 'pdf'
        });
        
        console.log(`✅ ${descripcion} subido exitosamente:`, resultado.secure_url);
        
        return {
          url: resultado.secure_url,
          publicId: resultado.public_id,
          originalName: archivo.originalname,
          size: archivo.size
        };
        
      } catch (error) {
        console.error(`❌ Error subiendo ${descripcion}:`, error);
        throw new Error(`Error subiendo ${descripcion}: ${error.message}`);
      }
    };
    
    // Subir todos los documentos a Cloudinary
    const documentosGuardados = {
      presupuesto: await subirDocumentoACloudinary(files.presupuestoFirmado, 'budgets', 'Presupuesto firmado'),
      permit: await subirDocumentoACloudinary(files.permit, 'permits', 'PDF del permit'),
      opcional: await subirDocumentoACloudinary(files.documentosOpcionales, 'docs', 'Documentos opcionales')
    };
    
    console.log("💾 Documentos subidos a Cloudinary correctamente");
    
    // 2️⃣ EXTRAER DATOS DEL FORMULARIO
    const {
      // === DATOS DEL CLIENTE ===
      permitNumber,           // Número del permit
      propertyAddress,        // Dirección de la propiedad
      applicantName,          // Nombre del cliente
      applicantEmail,         // Email del cliente
      applicantPhone,         // Teléfono del cliente
      
      // === DATOS TÉCNICOS ===
      systemType,            // Tipo de sistema septico
      excavationRequired,    // Si requiere excavación
      drainfieldDepth,       // Profundidad del drainfield
      gpdCapacity,          // Capacidad en galones por día
      lot,                  // Lote
      block,                // Bloque
      
      // === DATOS DEL PRESUPUESTO ===
      totalPrice,          // Monto total del presupuesto
      initialPaymentPercentage = 60, // Porcentaje del pago inicial
      discountAmount = 0,   // Descuento aplicado
      generalNotes,         // Notas generales
      
      // === ESTADO ACTUAL DEL TRABAJO ===
      hasInitialPayment = false, // Si ya pagó el inicial
      paymentAmount,        // Cuánto pagó
      
      // === METADATOS ===
      legacyId,            // ID del sistema anterior
      migrationNotes       // Notas sobre la importación
    } = req.body;

    // 3️⃣ VALIDACIONES BÁSICAS
    console.log('🔍 DEBUG req.body:', {
      permitNumber,
      propertyAddress,
      applicantName,
      totalPrice,
      lineItems: req.body.lineItems ? JSON.parse(req.body.lineItems) : 'NO_LINE_ITEMS'
    });
    
    if (!permitNumber) throw new Error('Número de permit requerido');
    if (!propertyAddress) throw new Error('Dirección requerida');
    if (!applicantName) throw new Error('Nombre del cliente requerido');
    
    // Calcular total basado en line items si no viene totalPrice
    let calculatedTotal = 0;
    if (req.body.lineItems) {
      const lineItems = JSON.parse(req.body.lineItems);
      calculatedTotal = lineItems.reduce((total, item) => {
        return total + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
      }, 0);
    }
    
    const finalTotal = totalPrice > 0 ? totalPrice : calculatedTotal;
    if (!finalTotal || finalTotal <= 0) {
      throw new Error(`Debe agregar elementos al presupuesto con precios. Total actual: $${finalTotal || 0}. LineItems: ${lineItems.length} items.`);
    }

    console.log("✅ Datos validados correctamente");

    // 4️⃣ VERIFICAR SI YA EXISTE UN PERMIT (por permitNumber o propertyAddress)
    console.log(`🔍 Verificando si ya existe un permit para:`);
    console.log(`   - Permit Number: ${permitNumber}`);
    console.log(`   - Property Address: ${propertyAddress}`);
    
    // Verificar si el usuario confirmó usar el permit existente
    const useExistingPermit = req.body.useExistingPermit === 'true' || req.body.useExistingPermit === true;
    
    // ✅ PRIMERO buscar por permitNumber (ya que es único y más específico)
    let existingPermit = await Permit.findOne({
      where: { permitNumber },
      transaction
    });
    
    if (existingPermit && !useExistingPermit) {
      // 🚨 Existe un permit con ese número y el usuario NO confirmó usarlo
      console.log(`⚠️  Permit existente encontrado por número (${permitNumber})`);
      await transaction.rollback();
      return res.status(409).json({
        error: true,
        code: 'PERMIT_EXISTS',
        conflictType: 'permitNumber',
        message: `Ya existe un Permit con el número "${permitNumber}"`,
        existingPermit: {
          idPermit: existingPermit.idPermit,
          permitNumber: existingPermit.permitNumber,
          propertyAddress: existingPermit.propertyAddress,
          applicantName: existingPermit.applicantName,
          systemType: existingPermit.systemType
        },
        question: '¿Deseas usar el Permit existente o cambiar el número de Permit?'
      });
    }
    
    // ✅ Si no existe por permitNumber, buscar por propertyAddress
    if (!existingPermit) {
      existingPermit = await Permit.findOne({
        where: { propertyAddress },
        transaction
      });
      
      if (existingPermit && !useExistingPermit) {
        // 🚨 Existe un permit con esa dirección y el usuario NO confirmó usarlo
        console.log(`⚠️  Permit existente encontrado por dirección (${propertyAddress})`);
        await transaction.rollback();
        return res.status(409).json({
          error: true,
          code: 'PERMIT_EXISTS',
          conflictType: 'propertyAddress',
          message: `Ya existe un Permit para la dirección "${propertyAddress}"`,
          existingPermit: {
            idPermit: existingPermit.idPermit,
            permitNumber: existingPermit.permitNumber,
            propertyAddress: existingPermit.propertyAddress,
            applicantName: existingPermit.applicantName,
            systemType: existingPermit.systemType
          },
          question: '¿Deseas usar el Permit existente o cambiar la dirección?'
        });
      }
    }
    
    let nuevoPermit;
    
    if (existingPermit && useExistingPermit) {
      // ✅ El usuario confirmó que quiere usar el existente
      console.log(`🔄 Usando permit existente confirmado por usuario: ${existingPermit.idPermit}`);
      console.log(`   📋 Permit number: ${existingPermit.permitNumber}`);
      console.log(`   📍 Property address: ${existingPermit.propertyAddress}`);
      nuevoPermit = existingPermit;
    } else {
      // ✅ No existe ninguno, crear uno nuevo
      console.log(`🆕 Creando nuevo permit con:`);
      console.log(`   - Permit Number: ${permitNumber}`);
      console.log(`   - Property Address: ${propertyAddress}`);
      
      nuevoPermit = await Permit.create({
        permitNumber,
        propertyAddress,
        applicantName,
        applicantEmail: applicantEmail || '',
        applicantPhone: applicantPhone || '',
        systemType: systemType || 'Solar',
        lot: lot || '',
        block: block || '',
        
        // ✅ Guardar URLs de Cloudinary en columnas correctas
        permitPdfUrl: documentosGuardados.permit?.url || null,
        permitPdfPublicId: documentosGuardados.permit?.publicId || null,
        optionalDocsUrl: documentosGuardados.opcional?.url || null,
        optionalDocsPublicId: documentosGuardados.opcional?.publicId || null,
        
        // Marcar como importado
        isLegacy: true
      }, { transaction });
      console.log(`✅ Permit creado exitosamente: ${nuevoPermit.idPermit}`);
    }

    console.log("✅ Permit disponible:", nuevoPermit.idPermit);

    // 5️⃣ CREAR PRESUPUESTO
    // Parsear line items si vienen como JSON string
    let lineItems = [];
    try {
      lineItems = req.body.lineItems ? JSON.parse(req.body.lineItems) : [];
    } catch (e) {
      lineItems = req.body.lineItems || [];
    }

    // Usar el total ya calculado arriba
    const porcentajePago = parseFloat(req.body.initialPaymentPercentage || 60);
    const descuento = parseFloat(req.body.discountAmount || 0);
    const montoInicial = (finalTotal * porcentajePago) / 100;

    console.log('🔍 DEBUG - Datos para crear presupuesto:', {
      PermitIdPermit: nuevoPermit.idPermit,
      propertyAddress,
      applicantName,
      status: 'signed',
      finalTotal,
      descuento,
      montoInicial,
      hasSignedPdf: !!documentosGuardados.presupuesto?.url,
      pdfUrl: documentosGuardados.presupuesto?.url || 'No PDF',
      isLegacy: true
    });

    // ✅ VERIFICAR SI YA EXISTE UN BUDGET CON ESA DIRECCIÓN
    console.log(`🔍 Verificando si ya existe un presupuesto para: ${propertyAddress}`);
    const existingBudget = await Budget.findOne({
      where: { propertyAddress },
      transaction
    });
    
    if (existingBudget) {
      throw new Error(`Ya existe un presupuesto para la dirección "${propertyAddress}". Si necesitas importar otro trabajo para esta dirección, por favor modifica la dirección (ejemplo: "${propertyAddress} - Unit 2" o "${propertyAddress} - Fase 2").`);
    }

    // ✅ Formatear fechas como YYYY-MM-DD para DATEONLY
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const expirationDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Determinar el estado basado en si el presupuesto tiene PDF firmado
    const budgetStatus = req.body.status || 'approved';
    const hasSignedPdf = !!documentosGuardados.presupuesto?.url;
    
    console.log(`🆕 Creando nuevo presupuesto para: ${propertyAddress}`);
    const nuevoPresupuesto = await Budget.create({
      PermitIdPermit: nuevoPermit.idPermit,
      propertyAddress,
      applicantName,
      date: currentDate,
      expirationDate: expirationDate,
      
      // Estado según lo que viene del formulario
      status: budgetStatus,
      
      // ✅ Si tiene PDF firmado, marcar como firma manual
      signatureMethod: hasSignedPdf ? 'manual' : 'none',
      manualSignedPdfPath: hasSignedPdf ? documentosGuardados.presupuesto.url : null,
      manualSignedPdfPublicId: hasSignedPdf ? documentosGuardados.presupuesto.publicId : null,
      
      // Montos
      subtotalPrice: finalTotal,
      totalPrice: finalTotal - descuento,
      discountAmount: descuento,
      initialPayment: montoInicial,
      initialPaymentPercentage: porcentajePago,
      
      // Guardar URL y Public ID de Cloudinary para el PDF firmado legacy
      legacySignedPdfUrl: documentosGuardados.presupuesto?.url || null,
      legacySignedPdfPublicId: documentosGuardados.presupuesto?.publicId || null,
      
      // Notas y metadata
      generalNotes: req.body.generalNotes || 'Presupuesto importado',
      isLegacy: true
    }, { transaction });
    
    console.log('🔍 DEBUG - Presupuesto creado con datos:', {
      idBudget: nuevoPresupuesto.idBudget,
      isLegacy: nuevoPresupuesto.isLegacy,
      status: nuevoPresupuesto.status,
      hasLegacyPdfUrl: !!nuevoPresupuesto.legacySignedPdfUrl,
      legacyPdfUrl: nuevoPresupuesto.legacySignedPdfUrl
    });

    console.log("✅ Presupuesto creado:", nuevoPresupuesto.idBudget);

    // 6️⃣ CREAR LINE ITEMS
    if (lineItems.length > 0) {
      for (const item of lineItems) {
        await BudgetLineItem.create({
          budgetId: nuevoPresupuesto.idBudget,
          name: item.name || 'Item importado',
          description: item.description || '',
          quantity: parseFloat(item.quantity || 1),
          unitPrice: parseFloat(item.unitPrice || 0),
          totalPrice: parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)
        }, { transaction });
      }
      console.log(`✅ ${lineItems.length} line items creados`);
    }

    console.log("✅ Presupuesto creado:", nuevoPresupuesto.idBudget);

    // 7️⃣ CREAR TRABAJO (si es necesario)
    let nuevoTrabajo = null;
    const workStatus = req.body.workStatus;
    
    if (workStatus && workStatus !== '') {
      nuevoTrabajo = await Work.create({
        idBudget: nuevoPresupuesto.idBudget,
        propertyAddress,
        status: workStatus === 'completed' ? 'paymentReceived' : workStatus, // Fix enum
        isLegacy: true,
        workDescription: `Trabajo importado - ${applicantName}`,
        startDate: req.body.workStartDate || null,
        endDate: req.body.workEndDate || null
      }, { transaction });

      console.log("✅ Trabajo creado:", nuevoTrabajo.idWork);
    }

    // 8️⃣ RESPUESTA FINAL
    const respuesta = {
      success: true,
      message: 'Trabajo legacy importado exitosamente',
      data: {
        budget: {
          idBudget: nuevoPresupuesto.idBudget,
          applicantName,
          propertyAddress,
          totalPrice: finalTotal,
          status: 'signed'
        },
        permit: {
          idPermit: nuevoPermit.idPermit,
          permitNumber
        },
        work: nuevoTrabajo ? {
          idWork: nuevoTrabajo.idWork,
          status: workStatus
        } : null
      }
    };

    // Commit solo al final del proceso exitoso
    await transaction.commit();
    
    console.log("🎉 TRABAJO IMPORTADO EXITOSAMENTE");
    res.status(201).json(respuesta);

  } catch (error) {
    // Solo hacer rollback si la transacción no ha sido committed
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('❌ Error importando trabajo:', error);
    
    // Detectar si es un error de tamaño de archivo
    if (error.message && error.message.includes('demasiado grande')) {
      // Extraer el tamaño del mensaje de error si está presente
      const sizeMatch = error.message.match(/\((\d+\.?\d*) MB\)/);
      const sizeMB = sizeMatch ? parseFloat(sizeMatch[1]) : null;
      
      return res.status(400).json({
        error: true,
        message: error.message,
        sizeMB: sizeMB,
        maxSizeMB: 10
      });
    }
    
    // Detectar si es un error de dirección duplicada
    if (error.message && error.message.includes('Ya existe un presupuesto para la dirección')) {
      return res.status(400).json({
        error: true,
        code: 'DUPLICATE_ADDRESS',
        message: error.message
      });
    }
    
    // Detectar errores de Sequelize de unicidad (por si acaso)
    if (error.name === 'SequelizeUniqueConstraintError') {
      let duplicateField = 'desconocido';
      let duplicateValue = '';
      
      // Intentar extraer el campo y valor del error
      if (error.parent?.constraint) {
        if (error.parent.constraint.includes('propertyAddress')) {
          duplicateField = 'dirección de propiedad';
        } else if (error.parent.constraint.includes('permitNumber')) {
          duplicateField = 'número de permit';
        }
      }
      
      if (error.parent?.detail) {
        const match = error.parent.detail.match(/=\((.*?)\)/);
        if (match) duplicateValue = match[1];
      }
      
      return res.status(400).json({
        error: true,
        code: 'DUPLICATE_ENTRY',
        message: `Ya existe un registro con ese ${duplicateField}${duplicateValue ? `: "${duplicateValue}"` : ''}. Por favor verifica los datos e intenta nuevamente.`
      });
    }
    
    // Otros errores
    res.status(500).json({
      error: true,
      message: 'Error al importar el trabajo',
      details: error.message
    });
  }
}

module.exports = {
  importExistingWork
};