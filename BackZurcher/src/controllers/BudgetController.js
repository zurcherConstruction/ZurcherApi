const { Budget, Permit, Work, Income, BudgetItem, BudgetLineItem, Receipt, conn } = require('../data');
const { cloudinary } = require('../utils/cloudinaryConfig.js');
const { sendNotifications } = require('../utils/notifications/notificationManager.js');
const fs = require('fs');
const multer = require('multer');
const upload = multer();
const path = require('path');
const { sendEmail } = require('../utils/notifications/emailService.js');
const { generateAndSaveBudgetPDF } = require('../utils/pdfGenerators');
const SignNowService = require('../services/ServiceSignNow');
require('dotenv').config();
// AGREGAR esta función auxiliar después de los imports:
function getPublicPdfUrl(localPath, req) {
  if (!localPath) return null;
  
  // 🧪 TEST: Verificar que API_URL se lee correctamente
  console.log('🔍 DEBUG: process.env.API_URL =', process.env.API_URL);
  
  // Extraer la parte relativa de la ruta
  const relativePath = localPath.replace(path.join(__dirname, '../'), '');
  
  // ✅ USAR API_URL en lugar de BACKEND_URL
  const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
  const publicUrl = `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
  
  console.log('🔗 DEBUG: URL generada =', publicUrl);
  
  return publicUrl;
}

const BudgetController = {
  async createBudget(req, res) {
    const transaction = await conn.transaction();
    let newBudgetId = null; // Variable para guardar el ID fuera del try/catch principal

    try {
      console.log("--- Iniciando createBudget (Backend PDF Gen) ---");
      // ... (Extracción de req.body, validaciones, búsqueda de Permit) ...
      const {
        permitId, date, expirationDate, status = 'pending', discountDescription,
        discountAmount = 0, generalNotes, initialPaymentPercentage: initialPaymentPercentageInput, lineItems
      } = req.body;

      if (!permitId) throw new Error('permitId es requerido.');
      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        throw new Error('Se requiere al menos un item en lineItems.');
      }

      const permit = await Permit.findByPk(permitId, {
        attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'lot', 'block'], // Incluir campos necesarios
        transaction
      });
      if (!permit) throw new Error(`Permit con ID ${permitId} no encontrado.`);

      // --- Procesar Items y Calcular Subtotal ---
      let calculatedSubtotal = 0;
      const lineItemsDataForCreation = [];
      for (const incomingItem of lineItems) {
        console.log("Procesando incomingItem:", incomingItem); // Log para depurar

        // *** 1. Parsear y Validar Quantity PRIMERO ***
        const quantityNum = parseFloat(incomingItem.quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          console.error("Error de validación de cantidad:", incomingItem);
          throw new Error(`Item inválido: quantity (${incomingItem.quantity}) debe ser un número positivo.`);
        }

        // *** 2. Inicializar itemDataForCreation con datos básicos y quantity validada ***
        let itemDataForCreation = {
          quantity: quantityNum, // Usar el número parseado y validado
          notes: incomingItem.notes || null,
          marca: incomingItem.marca || null,
          capacity: incomingItem.capacity || null,
          description: null,
          // budgetId se añadirá después
        };

        // *** 3. Determinar Precio y otros detalles ***
        let priceAtTime = 0;
        if (incomingItem.budgetItemId) { // Item del catálogo
          const budgetItemDetails = await BudgetItem.findByPk(incomingItem.budgetItemId, { transaction });
          if (!budgetItemDetails || !budgetItemDetails.isActive) throw new Error(`Item base ID ${incomingItem.budgetItemId} no encontrado o inactivo.`);
          priceAtTime = parseFloat(budgetItemDetails.unitPrice);
          itemDataForCreation.budgetItemId = incomingItem.budgetItemId;
          itemDataForCreation.name = incomingItem.name || budgetItemDetails.name; // Usar nombre del catálogo como base
          itemDataForCreation.category = incomingItem.category || budgetItemDetails.category; // Usar categoría del catálogo como base
          itemDataForCreation.description = incomingItem.description || budgetItemDetails.description || null;
        } else if (incomingItem.name && incomingItem.category && incomingItem.unitPrice !== undefined) { // Item manual
          const manualPrice = parseFloat(incomingItem.unitPrice);
          if (isNaN(manualPrice) || manualPrice < 0) throw new Error(`Item manual inválido (${incomingItem.name}): unitPrice debe ser un número no negativo.`);
          priceAtTime = manualPrice;
          itemDataForCreation.budgetItemId = null;
          itemDataForCreation.name = incomingItem.name; // Usar nombre manual
          itemDataForCreation.category = incomingItem.category; // Usar categoría manual
          itemDataForCreation.description = incomingItem.description || null;
        } else {
          console.error("Datos insuficientes para item:", incomingItem);
          throw new Error(`Item inválido: falta info (budgetItemId o name/category/unitPrice).`);
        }

        // *** 4. Asignar precios y calcular total de línea ***
        itemDataForCreation.unitPrice = priceAtTime;
        itemDataForCreation.priceAtTimeOfBudget = priceAtTime; // Guardar precio histórico
        itemDataForCreation.lineTotal = priceAtTime * itemDataForCreation.quantity; // Calcular total de línea

        // *** 5. Acumular subtotal y guardar datos para creación ***
        calculatedSubtotal += parseFloat(itemDataForCreation.lineTotal || 0);
        lineItemsDataForCreation.push(itemDataForCreation); // Guardar datos completos para crear después
      }
      console.log(`${lineItemsDataForCreation.length} items procesados. Subtotal calculado: ${calculatedSubtotal}`);
      // --- Calcular Totales Finales ---
      const finalDiscount = parseFloat(discountAmount) || 0;
      const finalTotal = calculatedSubtotal - finalDiscount;

      // *** CORRECCIÓN: Interpretar initialPaymentPercentageInput ***
      let actualPercentage = 60; // Valor por defecto
      if (initialPaymentPercentageInput === 'total') {
        actualPercentage = 100;
      } else {
        const parsedPercentage = parseFloat(initialPaymentPercentageInput);
        if (!isNaN(parsedPercentage)) {
          actualPercentage = parsedPercentage;
        }
        // Si no es 'total' ni un número válido, se queda con el default 60
      }
      console.log(`Porcentaje de pago inicial interpretado: ${actualPercentage}%`);
      // *** FIN CORRECCIÓN ***

      // *** Usar actualPercentage para el cálculo ***
      const calculatedInitialPayment = finalTotal * (actualPercentage / 100);
      console.log(`Totales calculados: Subtotal=${calculatedSubtotal}, Total=${finalTotal}, InitialPayment=${calculatedInitialPayment}`);

      // --- Crear Budget ---
      const newBudget = await Budget.create({
        PermitIdPermit: permit.idPermit,
        date: date || new Date(),
        expirationDate: expirationDate || null,
        status,
        discountDescription,
        discountAmount: finalDiscount,
        generalNotes,
        initialPaymentPercentage: actualPercentage,
        applicantName: permit.applicantName,
        propertyAddress: permit.propertyAddress,
        subtotalPrice: calculatedSubtotal,
        totalPrice: finalTotal,
        initialPayment: calculatedInitialPayment,
        // pdfPath se actualizará después
      }, { transaction });
      newBudgetId = newBudget.idBudget; // Guardar ID para usar fuera del try/catch
      console.log(`Budget base creado con ID: ${newBudgetId}. Estado: ${status}`);

      // --- Crear BudgetLineItems ---
      const createdLineItemsForPdf = []; // Guardar datos planos para PDF
      for (const itemDataForCreation of lineItemsDataForCreation) {
        itemDataForCreation.budgetId = newBudgetId;
        const createdItem = await BudgetLineItem.create(itemDataForCreation, { transaction });
        createdLineItemsForPdf.push(createdItem.toJSON()); // Guardar para PDF
      }
      console.log(`${lineItemsDataForCreation.length} BudgetLineItems creados.`);

      // --- Confirmar la Transacción Principal ---
      await transaction.commit();
      console.log(`--- Transacción principal para crear Budget ID ${newBudgetId} confirmada. ---`);

      // --- Enviar Notificaciones (ya estaba funcionando) ---
      const notificationDetails = {
        propertyAddress: permit.propertyAddress,
        idBudget: newBudgetId,
        applicantEmail: permit.applicantEmail || null,
      };
      await sendNotifications('budgetCreated', notificationDetails, null, req.io);
      console.log(`Notificaciones 'budgetCreated' enviadas para Budget ID ${newBudgetId}.`);

      // --- Generar PDF y Actualizar Ruta (Fuera de la transacción original) ---
      let generatedPdfPath = null;
      try {
        console.log(`Intentando generar PDF post-creación para Budget ID ${newBudgetId}...`);
        // Necesitamos los datos completos del budget recién creado
        const budgetForPdf = await Budget.findByPk(newBudgetId, {
          attributes: [
            'idBudget',
            'propertyAddress',
            'applicantName',
            'date',
            'expirationDate',
            'initialPayment',
            'status',
            'paymentInvoice',
            'paymentProofType',
            'discountDescription',
            'discountAmount',
            'subtotalPrice',
            'totalPrice',
            'generalNotes',
            'pdfPath',
            'PermitIdPermit',
            'createdAt',
            'updatedAt',
            'initialPaymentPercentage' // <-- Asegúrate de incluir este campo
          ],
          include: [
            { model: Permit, attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'permitNumber', 'lot', 'block'] },
            // No necesitamos incluir lineItems aquí, ya los tenemos en createdLineItemsForPdf
          ]
        });

        if (!budgetForPdf) throw new Error("No se encontró el budget recién creado para generar PDF.");
        // --- DEBUG CONTROLLER ---
        console.log('DEBUG CONTROLLER - Datos leídos de BD para PDF:', budgetForPdf.toJSON ? budgetForPdf.toJSON() : budgetForPdf);
        // --- FIN DEBUG ---

        const budgetDataForPdf = {
          ...budgetForPdf.toJSON(),
          lineItems: createdLineItemsForPdf // Usar los datos planos guardados
        };
        // --- DEBUG CONTROLLER 2 ---
        console.log('DEBUG CONTROLLER - Datos FINALES pasados a PDF Gen:', budgetDataForPdf);
        // --- FIN DEBUG ---
        generatedPdfPath = await generateAndSaveBudgetPDF(budgetDataForPdf);

        // ✅ CONVERTIR RUTA LOCAL A URL PÚBLICA
        const pdfPublicUrl = getPublicPdfUrl(generatedPdfPath, req);

        console.log(`PDF generado en: ${generatedPdfPath}`);
        console.log(`URL pública: ${pdfPublicUrl}`);

        // Actualizar el registro Budget con la URL pública
        await budgetForPdf.update({ pdfPath: pdfPublicUrl });
        console.log("Ruta del PDF actualizada para Budget ID", budgetForPdf.idBudget);

      } catch (pdfError) {
        console.error(`Error al generar o guardar PDF para Budget ID ${newBudgetId} (post-creación):`, pdfError);
        // No revertimos, solo loggeamos el error. El presupuesto ya existe.
        // Considera enviar una notificación de error si es necesario.
      }

      // --- Responder al Frontend ---
      // Volver a buscar para obtener la ruta del PDF actualizada
      const finalBudgetResponseData = await Budget.findByPk(newBudgetId, {
        include: [
          { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName', 'lot', 'block'] },
          { model: BudgetLineItem, as: 'lineItems' }
        ]
      });

      if (!finalBudgetResponseData) {
        // Esto sería muy raro
        return res.status(404).json({ error: 'Presupuesto creado pero no encontrado para la respuesta final.' });
      }

      const responseData = finalBudgetResponseData.toJSON();
      // Añadir URLs dinámicas
      if (responseData.Permit) {
        const baseUrl = `${req.protocol}://${req.get('host')}/permits`;
        responseData.Permit.pdfDataUrl = `${baseUrl}/${responseData.Permit.idPermit}/view/pdf`;
        responseData.Permit.optionalDocsUrl = `${baseUrl}/${responseData.Permit.idPermit}/view/optional`;
      }
      // Añadir URL del PDF del budget si se generó
      if (responseData.pdfPath && fs.existsSync(responseData.pdfPath)) {
        responseData.budgetPdfUrl = `${req.protocol}://${req.get('host')}/budgets/${newBudgetId}/pdf`; // Ruta para descargar
      } else if (generatedPdfPath) {
        // Si se generó pero fs.existsSync falla (raro), intentar construir la URL igualmente
        responseData.budgetPdfUrl = `${req.protocol}://${req.get('host')}/budgets/${newBudgetId}/pdf`;
      }


      console.log(`Enviando respuesta exitosa para Budget ID ${newBudgetId}`);
      res.status(201).json(responseData);

    } catch (error) {
      console.error("Error FATAL durante createBudget:", error);
      // Revertir si la transacción principal no terminó
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          console.log("Transacción principal de createBudget revertida.");
        } catch (rollbackError) {
          console.error("Error al intentar revertir la transacción:", rollbackError);
        }
      }
      const errorMessage = error.errors?.map(e => e.message).join(', ') || error.message || 'Error al crear el presupuesto.';
      res.status(400).json({ error: errorMessage });
    }
  },

  async sendBudgetToSignNow(req, res) {
    const { idBudget } = req.params;
    const transaction = await conn.transaction();

    try {
      console.log('\n🚀 === INICIANDO ENVÍO DE BUDGET A SIGNNOW ===');
      console.log(`📋 ID Presupuesto: ${idBudget}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`👤 Usuario solicitante: ${req.user?.email || 'No identificado'}`);

      // Buscar el presupuesto con información del solicitante
      console.log('🔍 Buscando presupuesto en la base de datos...');
      const budget = await Budget.findByPk(idBudget, {
        include: [{
          model: Permit,
          attributes: ['applicantEmail', 'applicantName', 'propertyAddress']
        }],
        transaction
      });

      if (!budget) {
        console.error(`❌ ERROR: Presupuesto ${idBudget} no encontrado`);
        await transaction.rollback();
        return res.status(404).json({
          error: true,
          message: 'Presupuesto no encontrado'
        });
      }

      console.log('✅ Presupuesto encontrado:');
      console.log(`   - ID: ${budget.idBudget}`);
      console.log(`   - PDF Path: ${budget.pdfPath}`);
      console.log(`   - Status: ${budget.status}`);
      console.log(`   - Permit Data:`, budget.Permit);

      // Verificar que el PDF existe
      if (!budget.pdfPath) {
        console.error('❌ ERROR: No hay PDF generado para este presupuesto');
        await transaction.rollback();
        return res.status(400).json({
          error: true,
          message: 'No hay PDF generado para este presupuesto. Genere el PDF primero.'
        });
      }

       let localPdfPath;
      if (budget.pdfPath.startsWith('http')) {
        const pdfFileName = budget.pdfPath.split('/').pop();
        // Asumiendo que los PDFs de presupuestos se guardan en 'uploads/budgets'
        localPdfPath = path.join(__dirname, '..', 'uploads', 'budgets', pdfFileName);
        console.log(`ℹ️  URL de PDF convertida a ruta local: ${localPdfPath}`);
      } else {
        localPdfPath = budget.pdfPath; // Ya es una ruta local
        console.log(`ℹ️  Usando ruta de PDF local existente: ${localPdfPath}`);
      }

      // Verificar que el archivo PDF existe físicamente
      if (!fs.existsSync(budget.pdfPath)) {
        console.error(`❌ ERROR: Archivo PDF no existe en la ruta: ${budget.pdfPath}`);
        await transaction.rollback();
        return res.status(400).json({
          error: true,
          message: 'El archivo PDF no existe en el servidor'
        });
      }

      console.log(`✅ Archivo PDF existe, tamaño: ${fs.statSync(budget.pdfPath).size} bytes`);

      // Verificar que existe información del solicitante
      if (!budget.Permit?.applicantEmail) {
        console.error('❌ ERROR: No se encontró email del solicitante');
        console.log('Datos del Permit:', budget.Permit);
        await transaction.rollback();
        return res.status(400).json({
          error: true,
          message: 'No se encontró email del solicitante en el permiso asociado'
        });
      }

      console.log('✅ Información del firmante:');
      console.log(`   - Email: ${budget.Permit.applicantEmail}`);
      console.log(`   - Nombre: ${budget.Permit.applicantName}`);
      console.log(`   - Dirección: ${budget.Permit.propertyAddress}`);

      // Inicializar servicio de SignNow
      console.log('🔧 Inicializando servicio SignNow...');
      const SignNowService = require('../services/ServiceSignNow');
      const signNowService = new SignNowService();

      // Preparar información para el documento
      const propertyAddress = budget.Permit?.propertyAddress || budget.propertyAddress || 'Property';
      const fileName = `Budget_${budget.idBudget}_${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      console.log(`📁 Nombre del archivo para SignNow: ${fileName}`);

      // Enviar documento para firma
      console.log('📤 Enviando documento a SignNow...');
      const signNowResult = await signNowService.sendBudgetForSignature(
        budget.pdfPath,
        fileName,
        budget.Permit.applicantEmail,
        budget.Permit.applicantName || 'Valued Client'
      );

      console.log('✅ Resultado exitoso de SignNow:');
      console.log(JSON.stringify(signNowResult, null, 2));

      // Actualizar presupuesto con información de SignNow
      console.log('💾 Actualizando presupuesto en la base de datos...');
      const updateData = {
       signNowDocumentId: signNowResult.documentId, // Reutilizar este campo para SignNow
        status: 'sent_for_signature',
        sentForSignatureAt: new Date()
      };

      console.log('Datos a actualizar:', updateData);

      await budget.update(updateData, { transaction });
      await transaction.commit();
      console.log('✅ Transacción confirmada');

      // Enviar notificación interna de que se envió a SignNow
      try {
       
        await sendNotifications('budgetSentToSignNow', {
          propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
          applicantEmail: budget.Permit.applicantEmail,
          applicantName: budget.Permit.applicantName,
          idBudget: budget.idBudget,
          documentId: signNowResult.documentId
        }, null, req.io);
        console.log('📧 Notificaciones internas enviadas');
      } catch (notificationError) {
        console.log('⚠️ Error enviando notificaciones internas:', notificationError.message);
        // No fallar la operación principal por esto
      }

      const responseData = {
        error: false,
        message: 'Presupuesto enviado a SignNow exitosamente. El cliente recibirá un email para firmar el documento.',
        data: {
          budgetId: budget.idBudget,
          documentId: signNowResult.documentId,
          inviteId: signNowResult.inviteId,
          status: 'sent_for_signature',
          signerEmail: budget.Permit.applicantEmail,
          signerName: budget.Permit.applicantName,
          fileName: fileName,
          sentAt: new Date().toISOString()
        }
      };

      console.log('📤 Enviando respuesta exitosa:');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('=== FIN EXITOSO DE ENVÍO A SIGNNOW ===\n');

      res.status(200).json(responseData);

    } catch (error) {
      await transaction.rollback();
      console.log('\n💥 === ERROR FATAL EN ENVÍO A SIGNNOW ===');
      console.error('Error completo:', error);
      console.error('Stack trace:', error.stack);
      console.log('================================\n');

      res.status(500).json({
        error: true,
        message: 'Error interno del servidor',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Verificar estado de firma del presupuesto
  async checkSignatureStatus(req, res) {
    const { idBudget } = req.params;

    try {
      console.log(`--- Verificando estado de firma para presupuesto ${idBudget} ---`);

      // Buscar el presupuesto
      const budget = await Budget.findByPk(idBudget);

      if (!budget) {
        return res.status(404).json({
          error: true,
          message: 'Presupuesto no encontrado'
        });
      }

      if (!budget.signNowDocumentId) {
        return res.status(400).json({
          error: true,
          message: 'Este presupuesto no ha sido enviado para firma',
          data: {
            budgetId: budget.idBudget,
            status: budget.status,
            isSigned: false
          }
        });
      }

      // Inicializar servicio de SignNow
      const SignNowService = require('../services/ServiceSignNow');
      const signNowService = new SignNowService();

      // Verificar estado del documento
      const signatureStatus = await signNowService.isDocumentSigned(budget.signNowDocumentId);

      console.log('📊 Estado de firma:', signatureStatus);

      // Actualizar estado en la base de datos si está firmado
      if (signatureStatus.isSigned && budget.status !== 'signed') {
        await budget.update({
          status: 'signed',
          signedAt: new Date()
        });
      }

      res.status(200).json({
        error: false,
        message: 'Estado de firma obtenido exitosamente',
        data: {
          budgetId: budget.idBudget,
          documentId: budget.signNowDocumentId,
          isSigned: signatureStatus.isSigned,
          status: signatureStatus.status,
          signatures: signatureStatus.signatures,
          invites: signatureStatus.invites,
          currentBudgetStatus: signatureStatus.isSigned ? 'signed' : budget.status
        }
      });

    } catch (error) {
      console.error('❌ Error verificando estado de firma:', error);

      res.status(500).json({
        error: true,
        message: 'Error verificando estado de firma',
        details: error.message
      });
    }
  },


  // Descargar documento firmado
  async downloadSignedBudget(req, res) {
    const { idBudget } = req.params;

    try {
      console.log(`--- Descargando documento firmado para presupuesto ${idBudget} ---`);

      // Buscar el presupuesto
      const budget = await Budget.findByPk(idBudget);

      if (!budget) {
        return res.status(404).json({
          error: true,
          message: 'Presupuesto no encontrado'
        });
      }

      if (!budget.signNowDocumentId) {
        return res.status(400).json({
          error: true,
          message: 'Este presupuesto no ha sido enviado para firma'
        });
      }

      // Inicializar servicio de SignNow
      const SignNowService = require('../services/ServiceSignNow');
      const signNowService = new SignNowService();

      // Verificar si está firmado
      const signatureStatus = await signNowService.isDocumentSigned(budget.signNowDocumentId);

      if (!signatureStatus.isSigned) {
        return res.status(400).json({
          error: true,
          message: 'El documento aún no ha sido firmado',
          data: {
            budgetId: budget.idBudget,
            status: signatureStatus.status,
            signatures: signatureStatus.signatures
          }
        });
      }

      // Crear path para el archivo firmado
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'signed-budgets');

      // Crear directorio si no existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const signedFileName = `Budget_${budget.idBudget}_signed.pdf`;
      const signedFilePath = path.join(uploadsDir, signedFileName);

      // Descargar documento firmado
      await signNowService.downloadSignedDocument(budget.signNowDocumentId, signedFilePath);

      // Actualizar presupuesto con path del archivo firmado
      await budget.update({
        signedPdfPath: signedFilePath,
        status: 'signed',
        signedAt: new Date()
      });

      // Enviar archivo al cliente
      res.download(signedFilePath, signedFileName, (err) => {
        if (err) {
          console.error('Error enviando archivo:', err);
          res.status(500).json({
            error: true,
            message: 'Error descargando archivo firmado'
          });
        }
      });

    } catch (error) {
      console.error('❌ Error descargando documento firmado:', error);

      res.status(500).json({
        error: true,
        message: 'Error descargando documento firmado',
        details: error.message
      });
    }
  },


  // Asegúrate de que getBudgetById incluya los lineItems:
  async getBudgetById(req, res) {
    try {
      const { idBudget } = req.params;
      console.log(`Buscando Budget con ID: ${idBudget}`);

      const budget = await Budget.findByPk(idBudget, {
        include: [
          {
            model: Permit,
            attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'systemType', 'drainfieldDepth', 'excavationRequired', 'lot', 'block', 'pdfData', 'optionalDocs', 'expirationDate', 'applicantPhone'],
          },
          {
            model: BudgetLineItem,
            as: 'lineItems',
            include: [
              {
                model: BudgetItem,
                as: 'itemDetails',
                attributes: ['id', 'name', 'category', 'marca', 'capacity', 'unitPrice', 'description'],
              },
            ],
          },
        ],
      });

      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // Convertir el presupuesto y sus relaciones a objetos planos
      const budgetData = budget.toJSON();

      // Mapear los datos de itemDetails directamente en los lineItems
      budgetData.lineItems = budgetData.lineItems.map(lineItem => ({
        ...lineItem,
        name: lineItem.name || lineItem.itemDetails?.name || null,
        category: lineItem.category || lineItem.itemDetails?.category || null,
        marca: lineItem.marca || lineItem.itemDetails?.marca || null,
        capacity: lineItem.capacity || lineItem.itemDetails?.capacity || null,
        unitPrice: lineItem.unitPrice || lineItem.itemDetails?.unitPrice || null,
        description: lineItem.description || lineItem.itemDetails?.description || null,
      }));

      // *** CAMBIO 2: Añadir URLs dinámicamente si el Permit existe ***
      // Añadir URLs dinámicamente si el Permit existe
      if (budgetData.Permit) {
        const baseUrl = `${req.protocol}://${req.get('host')}/permits`;
        budgetData.Permit.pdfDataUrl = `${baseUrl}/${budgetData.Permit.idPermit}/view/pdf`;
        budgetData.Permit.optionalDocsUrl = `${baseUrl}/${budgetData.Permit.idPermit}/view/optional`;
      }

      res.status(200).json(budgetData);
    } catch (error) {
      console.error(`Error al obtener el presupuesto ID: ${req.params.idBudget}:`, error);
      res.status(500).json({ error: 'Error interno del servidor al obtener el presupuesto.' });
    }
  },



  async getBudgets(req, res) { // O como se llame tu función para obtener la lista
    try {
      const budgetsInstances = await Budget.findAll({
        include: [
          {
            model: Permit,
            // Asegúrate de incluir expirationDate y otros campos necesarios del Permit
            attributes: ['idPermit', 'propertyAddress', 'systemType', 'expirationDate', 'applicantEmail', 'pdfData', 'optionalDocs', 'applicantPhone', 'applicantName', 'permitNumber', 'lot', 'block']
          }
        ],
        order: [['date', 'DESC']]
      });

      const budgetsWithDetails = budgetsInstances.map(budgetInstance => {
        const budgetJson = budgetInstance.toJSON(); // Convertir a objeto plano

        // Calcular y añadir estado de expiración del Permit si existe
        if (budgetJson.Permit && budgetJson.Permit.expirationDate) {
          let permitExpirationStatus = "valid";
          let permitExpirationMessage = "";
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const expirationDateString = typeof budgetJson.Permit.expirationDate === 'string'
            ? budgetJson.Permit.expirationDate.split('T')[0]
            : new Date(budgetJson.Permit.expirationDate).toISOString().split('T')[0];

          const expDateParts = expirationDateString.split('-');
          const year = parseInt(expDateParts[0], 10);
          const month = parseInt(expDateParts[1], 10) - 1; // Mes es 0-indexado
          const day = parseInt(expDateParts[2], 10);

          if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const expDate = new Date(year, month, day);
            expDate.setHours(0, 0, 0, 0);

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
              console.warn(`Fecha de expiración de permiso inválida (post-parse) para budget ${budgetJson.idBudget}, permit ${budgetJson.Permit.idPermit}: ${expirationDateString}`);
            }
          } else {
            console.warn(`Formato de fecha de expiración de permiso inválido para budget ${budgetJson.idBudget}, permit ${budgetJson.Permit.idPermit}: ${expirationDateString}`);
          }
          // Añadir al objeto Permit DENTRO del budgetJson
          budgetJson.Permit.expirationStatus = permitExpirationStatus;
          budgetJson.Permit.expirationMessage = permitExpirationMessage;
        } else if (budgetJson.Permit) {
          // Si hay Permit pero no expirationDate, marcar como válido o desconocido
          budgetJson.Permit.expirationStatus = "valid";
          budgetJson.Permit.expirationMessage = "";
        }

        // Transformar pdfPath a budgetPdfUrl
        if (budgetJson.pdfPath && fs.existsSync(budgetJson.pdfPath)) {
          budgetJson.budgetPdfUrl = `${req.protocol}://${req.get('host')}/budgets/${budgetJson.idBudget}/pdf`;
        } else {
          budgetJson.budgetPdfUrl = null;
        }
        return budgetJson; // Devolver el objeto budgetJson modificado
      });

      res.status(200).json(budgetsWithDetails);

    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ error: 'Error al obtener los presupuestos.' });
    }
  },


  async updateBudget(req, res) {
    const { idBudget } = req.params;
    const transaction = await conn.transaction();
    let generatedPdfPath = null;

    try {
      console.log(`--- Iniciando actualización para Budget ID: ${idBudget} ---`);
      //console.log("Datos recibidos en req.body:", req.body);

      // --- 1. Buscar el Budget Existente ---
      const budget = await Budget.findByPk(idBudget, {
        include: [
          {
            model: Permit,
            attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'permitNumber', 'lot', 'block', 'expirationDate'] // Incluir campos necesarios para PDF
          },
          {
            model: BudgetLineItem, // Incluir para recalcular y generar PDF
            as: 'lineItems'
          }
        ],
        transaction
      });

      if (!budget) {
        await transaction.rollback();
        console.error(`Error: Presupuesto ID ${idBudget} no encontrado.`);
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
      console.log(`Presupuesto ID ${idBudget} encontrado.`);

      // --- 2. Extraer Datos de la Solicitud ---
      const {
        date,
        expirationDate,
        status,
        applicantName,
        propertyAddress,
        discountDescription,
        discountAmount,
        generalNotes,
        initialPaymentPercentage: initialPaymentPercentageInput,
        lineItems
      } = req.body;

      // --- 3. Validaciones Preliminares ---
      const hasGeneralUpdates = date || expirationDate !== undefined || status || applicantName || propertyAddress || discountDescription !== undefined || discountAmount !== undefined || generalNotes !== undefined || initialPaymentPercentageInput !== undefined; // Corregido: initialPaymentPercentageInput
      const hasLineItemUpdates = lineItems && Array.isArray(lineItems);

      if (!hasGeneralUpdates && !hasLineItemUpdates) {
        await transaction.rollback();
        console.warn(`Advertencia: No se proporcionaron campos ni items para actualizar Budget ID ${idBudget}.`);
        return res.status(400).json({ error: 'No se proporcionaron campos o items para actualizar' });
      }

      if (status === "approved" && !budget.paymentInvoice) {
        await transaction.rollback();
        console.error(`Error: Intento de aprobar Budget ID ${idBudget} sin comprobante de pago.`);
        return res.status(400).json({ error: 'Debe cargar el comprobante de pago antes de aprobar el presupuesto.' });
      }

      // --- 4. Actualizar Campos Generales del Budget ---
      console.log("Actualizando campos generales...");
      const generalUpdateData = {};
      if (date) generalUpdateData.date = date;
      // Manejar expirationDate: si no viene, no se cambia; si viene null/vacío, se pone null
      if (expirationDate !== undefined) generalUpdateData.expirationDate = expirationDate || null;
      if (status) generalUpdateData.status = status;
      if (applicantName) generalUpdateData.applicantName = applicantName;
      if (propertyAddress) generalUpdateData.propertyAddress = propertyAddress;
      if (discountDescription !== undefined) generalUpdateData.discountDescription = discountDescription;
      // Asegurar que discountAmount sea numérico
      if (discountAmount !== undefined) generalUpdateData.discountAmount = parseFloat(discountAmount) || 0;
      if (generalNotes !== undefined) generalUpdateData.generalNotes = generalNotes;
      // Asegurar que initialPaymentPercentage sea numérico
      let actualPercentageForUpdate = undefined; // Solo actualiza si viene en el input
      if (initialPaymentPercentageInput !== undefined) {
        if (initialPaymentPercentageInput === 'total') {
          actualPercentageForUpdate = 100;
        } else {
          const parsedPercentage = parseFloat(initialPaymentPercentageInput);
          if (!isNaN(parsedPercentage)) {
            actualPercentageForUpdate = parsedPercentage;
          } else {
            actualPercentageForUpdate = 60; // Default si viene algo inválido que no sea 'total'
          }
        }
        generalUpdateData.initialPaymentPercentage = actualPercentageForUpdate; // Añadir al objeto de actualización
        console.log(`Porcentaje de pago inicial para actualizar: ${actualPercentageForUpdate}%`);
      }

      // Aplicar actualizaciones generales al objeto budget en memoria (importante para cálculos posteriores)
      Object.assign(budget, generalUpdateData);
      // Guardar actualizaciones generales en la BD
      await budget.update(generalUpdateData, { transaction });
      console.log(`Campos generales para Budget ID ${idBudget} actualizados en BD.`);

      // --- 5. Sincronizar BudgetLineItems (Eliminar y Recrear si se enviaron nuevos) ---
      let calculatedSubtotal = 0;
      let finalLineItemsForPdf = []; // Array para guardar los items que irán al PDF

      if (hasLineItemUpdates) {
        console.log("Sincronizando Line Items (Eliminar y Recrear)...");
        await BudgetLineItem.destroy({ where: { budgetId: idBudget }, transaction });
        console.log(`Items existentes para Budget ID ${idBudget} eliminados.`);

        const createdLineItems = [];
        for (const incomingItem of lineItems) {
          console.log("=== DEBUGGING INCOMING ITEM ===");
          console.log("incomingItem:", incomingItem);
          console.log("incomingItem.budgetItemId:", incomingItem.budgetItemId);

          let priceAtTime = 0;
          let itemDataForCreation = {
            budgetId: idBudget,
            quantity: parseFloat(incomingItem.quantity) || 0,
            notes: incomingItem.notes || null,
            marca: incomingItem.marca || null,
            capacity: incomingItem.capacity || null,
            description: null,
          };

          console.log("itemDataForCreation inicial:", itemDataForCreation);

          // Validar quantity
          if (isNaN(itemDataForCreation.quantity) || itemDataForCreation.quantity <= 0) {
            console.error("Error: Item inválido encontrado:", incomingItem);
            throw new Error(`Item inválido: quantity debe ser un número positivo.`);
          }

          if (incomingItem.budgetItemId) {
            // Item del catálogo
            console.log("Procesando item del catálogo...");
            const budgetItemDetails = await BudgetItem.findByPk(incomingItem.budgetItemId, { transaction });
            console.log("budgetItemDetails encontrado:", budgetItemDetails);

            if (!budgetItemDetails || !budgetItemDetails.isActive) {
              console.error("Error: Item base no encontrado o inactivo:", incomingItem.budgetItemId);
              throw new Error(`El item base con ID ${incomingItem.budgetItemId} no se encontró o no está activo.`);
            }

            priceAtTime = parseFloat(budgetItemDetails.unitPrice);
            itemDataForCreation.budgetItemId = incomingItem.budgetItemId;
            itemDataForCreation.name = incomingItem.name || budgetItemDetails.name;
            itemDataForCreation.category = incomingItem.category || budgetItemDetails.category;
            itemDataForCreation.description = incomingItem.description || budgetItemDetails.description || null;
            console.log("itemDataForCreation después de asignar budgetItemId:", itemDataForCreation);
          } else if (incomingItem.name && incomingItem.category && incomingItem.unitPrice !== undefined) {
            // Item manual
            const manualPrice = parseFloat(incomingItem.unitPrice);
            if (isNaN(manualPrice) || manualPrice < 0) {
              console.error("Error: Precio inválido para item manual:", incomingItem);
              throw new Error(`Item manual inválido: unitPrice debe ser un número no negativo.`);
            }
            priceAtTime = manualPrice;
            itemDataForCreation.budgetItemId = null;
            itemDataForCreation.name = incomingItem.name;
            itemDataForCreation.category = incomingItem.category;
            itemDataForCreation.description = incomingItem.description || null;
          } else {
            // Item inválido
            console.error("Error: Item inválido, falta información:", incomingItem);
            throw new Error(`Item inválido: debe tener 'budgetItemId' o ('name', 'category', 'unitPrice').`);
          }

          // Asignar precios y calcular total de línea
          itemDataForCreation.unitPrice = priceAtTime;
          itemDataForCreation.priceAtTimeOfBudget = priceAtTime;
          itemDataForCreation.lineTotal = priceAtTime * itemDataForCreation.quantity;

          // Antes de crear el item:
          console.log("itemDataForCreation FINAL antes de crear:", itemDataForCreation);
          const newItem = await BudgetLineItem.create(itemDataForCreation, { transaction });
          console.log("newItem creado:", newItem.toJSON());
          console.log("=== FIN DEBUG ITEM ===");

          calculatedSubtotal += parseFloat(newItem.lineTotal || 0);
          createdLineItems.push(newItem);
        }

        finalLineItemsForPdf = createdLineItems.map(item => item.toJSON());
        console.log(`${createdLineItems.length} items recreados para Budget ID ${idBudget}.`);
      } else {
        // ✅ CORRECCIÓN: Si no hay cambios en items, calcular desde items existentes
        console.log("No hay cambios en items, calculando subtotal desde items existentes...");
        const existingLineItems = await BudgetLineItem.findAll({
          where: { budgetId: idBudget },
          transaction
        });

        calculatedSubtotal = existingLineItems.reduce((sum, item) => {
          return sum + parseFloat(item.lineTotal || 0);
        }, 0);

        finalLineItemsForPdf = existingLineItems.map(item => item.toJSON());
        console.log(`Subtotal calculado desde ${existingLineItems.length} items existentes: ${calculatedSubtotal}`);
      }

      // --- 6. Recalcular y Actualizar Totales Finales y Pago Inicial en el Budget ---
      console.log("Recalculando totales finales...");
      // Usar los valores actualizados en el objeto 'budget' en memoria
      const finalDiscount = parseFloat(budget.discountAmount) || 0;
      const finalTotal = calculatedSubtotal - finalDiscount;
      // *** CORRECCIÓN: Usar el porcentaje actualizado en memoria para el cálculo ***
      const percentageForCalculation = parseFloat(budget.initialPaymentPercentage) || 60; // Lee el valor ya actualizado (o el original si no se actualizó)
      console.log(`DEBUG: Calculando Initial Payment con: finalTotal=${finalTotal}, Percentage=${percentageForCalculation}`);
      const calculatedInitialPayment = finalTotal * (percentageForCalculation / 100);
      console.log(`DEBUG: Initial Payment Calculado = ${calculatedInitialPayment}`);
      // *** FIN CORRECCIÓN ***

      // ...

      // Actualizar el objeto budget en memoria con los nuevos totales
      Object.assign(budget, {
        subtotalPrice: calculatedSubtotal,
        totalPrice: finalTotal,
        initialPayment: calculatedInitialPayment // Este es el initialPayment calculado
      });

      // Guardar los nuevos totales en la BD (sin pdfPath aún)
      await budget.update({
        subtotalPrice: calculatedSubtotal,
        totalPrice: finalTotal,
        initialPayment: calculatedInitialPayment
      }, { transaction });
      console.log(`Totales finales para Budget ID ${idBudget} actualizados: Subtotal=${calculatedSubtotal}, Total=${finalTotal}, InitialPayment=${calculatedInitialPayment}`);

      // --- 7. Lógica Condicional por Estado ---
      // --- NUEVO: 7. Generar/Regenerar PDF SIEMPRE que haya cambios ---

      const updateKeys = Object.keys(req.body).filter(key => key !== 'lineItems');
      // Verificamos si la única clave presente es 'generalNotes'.
      const isOnlyGeneralNotesUpdate = updateKeys.length === 1 && updateKeys[0] === 'generalNotes';
      if ((hasGeneralUpdates || hasLineItemUpdates) && !isOnlyGeneralNotesUpdate) {
        console.log("Detectados cambios (no solo notas). Regenerando PDF...");
        try {
          const budgetDataForPdf = {
            ...budget.toJSON(), // Usar datos actualizados en memoria
            initialPaymentPercentage: budget.initialPaymentPercentage, // Asegurarse que esté
            lineItems: finalLineItemsForPdf
          };

          console.log("Datos para PDF:", JSON.stringify(budgetDataForPdf, null, 2));
          generatedPdfPath = await generateAndSaveBudgetPDF(budgetDataForPdf);

          // ✅ CONVERTIR RUTA LOCAL A URL PÚBLICA
          const pdfPublicUrl = getPublicPdfUrl(generatedPdfPath, req);

          console.log(`PDF regenerado en ruta local: ${generatedPdfPath}`);
          console.log(`PDF regenerado y ruta actualizada en BD para Budget ID ${idBudget}: ${pdfPublicUrl}`);

          // Actualizar la ruta del PDF en la BD DENTRO de la transacción
          await budget.update({ pdfPath: pdfPublicUrl }, { transaction });
          console.log(`PDF regenerado y ruta actualizada en BD para Budget ID ${idBudget}: ${generatedPdfPath}`);

        } catch (pdfError) {
          console.error(`Error CRÍTICO al regenerar PDF para Budget ID ${idBudget}:`, pdfError);
          // Lanzar error para revertir la transacción si la generación del PDF falla
          throw new Error(`Error al regenerar PDF: ${pdfError.message}`);
        }
      } else if (isOnlyGeneralNotesUpdate) {
        // Si solo cambiaron las notas, no regeneramos PDF y mantenemos la ruta existente.
        console.log("Solo se actualizaron las notas generales. Omitiendo regeneración de PDF.");
        generatedPdfPath = budget.pdfPath; // Usar la ruta existente
      } else {
        // Si no hubo ningún cambio detectado (ni general ni items)
        console.log("No hubo cambios relevantes, no se regenera el PDF.");
        generatedPdfPath = budget.pdfPath; // Usar la ruta existente
      }

      // --- 7a. Lógica si el estado es 'send' (Genera PDF y envía correo) ---
      if (req.body.status === 'send') {
        console.log("El estado es 'send'. Procesando envío de correo y SignNow...");

        // --- Enviar Correo (Usa generatedPdfPath o budget.pdfPath actualizado) ---
        const pdfPathForEmail = generatedPdfPath; // Usar la ruta (nueva o existente)

        if (!pdfPathForEmail || !fs.existsSync(pdfPathForEmail)) {
          console.error(`Error: No se encontró el archivo PDF en ${pdfPathForEmail} para enviar por correo (Budget ID: ${idBudget}).`);
          await transaction.rollback();
          return res.status(500).json({ error: 'Error interno: No se pudo encontrar el PDF para enviar.' });
        } else {
          console.log(`Usando PDF en ${pdfPathForEmail} para enviar correo...`);
          if (!budget.Permit?.applicantEmail || !budget.Permit.applicantEmail.includes('@')) {
            console.warn(`Advertencia: Cliente para Budget ID ${idBudget} sin correo válido. No se enviará email.`);
          } else {
            // ✅ Email con información sobre SignNow
            const clientMailOptions = {
              to: budget.Permit.applicantEmail,
              subject: `Budget Proposal #${idBudget} for ${budget.propertyAddress}`,
              text: `Dear ${budget.applicantName || 'Customer'},\n\nPlease find attached the budget proposal #${idBudget} for the property located at ${budget.propertyAddress}.\n\nExpiration Date: ${budget.expirationDate ? new Date(budget.expirationDate).toLocaleDateString() : 'N/A'}\nTotal Amount: $${parseFloat(budget.totalPrice || 0).toFixed(2)}\nInitial Payment (${budget.initialPaymentPercentage || 60}%): $${parseFloat(budget.initialPayment || 0).toFixed(2)}\n\n${budget.generalNotes ? 'Notes:\n' + budget.generalNotes + '\n\n' : ''}NEXT STEPS:\n- Review the attached PDF carefully\n- You will receive a separate email from SignNow to digitally sign the document once approved\n- If you have any questions, please contact us\n\nBest regards,\nZurcher Construction`,
              html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a365d; margin-bottom: 20px;">Budget Proposal Ready for Review</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Dear ${budget.Permit?.applicantName || budget.applicantName || 'Valued Customer'},
              </p>
              
              <p style="margin-bottom: 20px;">
                Please find attached your budget proposal <strong>#${idBudget}</strong> for the property located at <strong>${budget.propertyAddress}</strong>.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1a365d; margin-top: 0; margin-bottom: 15px;">Budget Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Expiration Date:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${budget.expirationDate ? new Date(budget.expirationDate).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Total Amount:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right; color: #28a745; font-weight: bold;">$${parseFloat(budget.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Initial Payment (${budget.initialPaymentPercentage || 60}%):</strong></td>
                    <td style="padding: 8px 0; text-align: right; color: #007bff; font-weight: bold;">$${parseFloat(budget.initialPayment || 0).toFixed(2)}</td>
                  </tr>
                </table>
              </div>
              
              ${budget.generalNotes ? `
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <h4 style="color: #856404; margin-top: 0;">Additional Notes:</h4>
                <p style="margin-bottom: 0; color: #856404;">${budget.generalNotes}</p>
              </div>
              ` : ''}
              
              <div style="background-color: #e6f3ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #1a365d; margin-top: 0; margin-bottom: 15px;">📋 Next Steps:</h3>
                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; width: 20px; color: #007bff;">1.</span>
                  <strong>Review the attached PDF carefully</strong>
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; width: 20px; color: #007bff;">2.</span>
                  <strong>You will receive a separate email from SignNow</strong> to digitally sign the document once approved
                </div>
                <div style="margin-bottom: 0;">
                  <span style="display: inline-block; width: 20px; color: #007bff;">3.</span>
                  <strong>Contact us</strong> if you have any questions
                </div>
              </div>
              
              <p style="margin-top: 30px; margin-bottom: 30px;">
                Thank you for choosing <strong>Zurcher Construction</strong>!
              </p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #dee2e6; text-align: center;">
                <div style="color: #6c757d; font-size: 14px;">
                  <strong style="color: #1a365d;">Zurcher Construction</strong><br>
                  SEPTIC TANK DIVISION - CFC1433240<br>
                  📧 Contact: [zurcherseptic@gmail.com] | 📞 [+1 (407) 419-4495]<br>
                  🌐 Professional Septic Installation & Maintenance
                </div>
              </div>
            </div>
          </div>
        `,
              attachments: [{
                filename: `budget_${idBudget}.pdf`,
                path: pdfPathForEmail,
                contentType: 'application/pdf'
              }],
            };

            try {
              console.log(`Intentando enviar correo con PDF e información de SignNow al cliente: ${budget.Permit.applicantEmail}`);
              await sendEmail(clientMailOptions);
              console.log(`Correo con PDF e información de SignNow enviado exitosamente al cliente.`);
            } catch (clientEmailError) {
              console.error(`Error al enviar correo con PDF al cliente ${budget.Permit.applicantEmail}:`, clientEmailError);
            }
          }
        }

 // --- ✅ NUEVO: Enviar automáticamente a SignNow después del email ---
        console.log('\n🔄 === INICIANDO ENVÍO AUTOMÁTICO A SIGNNOW ===');

        try {
          // Verificar que existe información del solicitante para SignNow
          if (!budget.Permit?.applicantEmail) {
            console.error('❌ ERROR: No se encontró email del solicitante para SignNow');
            // No hacer rollback aquí, el email ya se envió exitosamente
            console.log('⚠️ Continuando sin envío a SignNow debido a falta de email');
          } else {
            console.log('✅ Información del firmante para SignNow:');
            console.log(`   - Email: ${budget.Permit.applicantEmail}`);
            console.log(`   - Nombre: ${budget.Permit.applicantName}`);
            console.log(`   - Dirección: ${budget.Permit.propertyAddress}`);

            // Inicializar servicio de SignNow
            console.log('🔧 Inicializando servicio SignNow desde updateBudget...');
            const signNowService = new SignNowService();

            // Preparar información para el documento
            const propertyAddress = budget.Permit?.propertyAddress || budget.propertyAddress || 'Property';
            const fileName = `Budget_${budget.idBudget}_${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

            console.log(`📁 Nombre del archivo para SignNow: ${fileName}`);

            // Convertir URL pública a ruta local para SignNow
            let localPdfPath = null;

            if (pdfPathForEmail && (pdfPathForEmail.includes('/uploads/budgets/') || pdfPathForEmail.startsWith('http'))) {
  // Extraer nombre del archivo de la URL
  const pdfFileName = pdfPathForEmail.split('/').pop();
  localPdfPath = path.join(__dirname, '../uploads/budgets', pdfFileName);
              
              // Verificar que el archivo existe
              if (!fs.existsSync(localPdfPath)) {
                console.error(`❌ PDF no encontrado en ruta local: ${localPdfPath}`);
                localPdfPath = null;
              } else {
                console.log(`✅ PDF encontrado para SignNow: ${localPdfPath}`);
              }
            }

            if (localPdfPath) {
              // Enviar documento para firma
              console.log('📤 Enviando documento a SignNow desde updateBudget...');
              const signNowResult = await signNowService.sendBudgetForSignature(
                localPdfPath, // ✅ Usar ruta local
                fileName,
                budget.Permit.applicantEmail,
                budget.Permit.applicantName || 'Valued Client'
              );

              console.log('✅ Resultado exitoso de SignNow desde updateBudget:');
              console.log(JSON.stringify(signNowResult, null, 2));

              // Actualizar presupuesto con información de SignNow
              console.log('💾 Actualizando presupuesto con datos de SignNow...');
              await budget.update({
                signNowDocumentId: signNowResult.documentId,
                status: 'sent_for_signature', // Cambiar status a 'sent_for_signature'
                sentForSignatureAt: new Date()
              }, { transaction });

              console.log('✅ Budget actualizado con datos de SignNow');

              // Notificar al staff interno que se envió a SignNow
              try {
                await sendNotifications('budgetSentToSignNow', {
                  propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
                  applicantEmail: budget.Permit.applicantEmail,
                  applicantName: budget.Permit.applicantName,
                  idBudget: budget.idBudget,
                  documentId: signNowResult.documentId
                }, null, req.io);
                console.log('📧 Notificaciones internas de SignNow enviadas');
              } catch (notificationError) {
                console.log('⚠️ Error enviando notificaciones internas de SignNow:', notificationError.message);
                // No fallar la operación principal por esto
              }

              console.log('🎉 === ENVÍO AUTOMÁTICO A SIGNNOW COMPLETADO ===\n');
            } else {
              console.log('⚠️ No se pudo obtener ruta local del PDF para SignNow');
            }
          }
        } catch (signNowError) {
          console.error('❌ ERROR enviando a SignNow:', signNowError);
          console.error('   - Mensaje:', signNowError.message);
          console.error('   - Stack:', signNowError.stack);
          
          console.log('⚠️ Continuando sin envío a SignNow debido a error');
          console.log('📧 El email fue enviado exitosamente, pero SignNow falló');
        }

        // Notificar al staff interno (siempre se notifica que se marcó como 'send')
        await sendNotifications('budgetSent', {
          propertyAddress: budget.propertyAddress,
          applicantEmail: budget.Permit?.applicantEmail,
          idBudget: budget.idBudget,
        }, null, req.io);
        console.log(`Notificaciones internas 'budgetSent' enviadas.`);

      } // --- Fin Lógica if (status === 'send') ---

      // --- 7b. Lógica si el estado es 'approved' ---
      if (budget.status === "approved" ) {
        console.log("El estado es 'approved'. Procesando creación/actualización de Work/Income...");

        // Determinar el monto real del pago inicial a usar
        let actualInitialPaymentAmount = parseFloat(budget.initialPayment); // Fallback al calculado
        if (budget.paymentProofAmount !== null && budget.paymentProofAmount !== undefined && !isNaN(parseFloat(budget.paymentProofAmount))) {
          actualInitialPaymentAmount = parseFloat(budget.paymentProofAmount);
          console.log(`Usando paymentProofAmount (${actualInitialPaymentAmount}) para Work/Income.`);
        } else {
          console.log(`Usando initialPayment calculado (${actualInitialPaymentAmount}) para Work/Income (paymentProofAmount no disponible o inválido).`);
        }

        let workRecord;
        const existingWork = await Work.findOne({ where: { idBudget: budget.idBudget }, transaction });

        if (!existingWork) {
          // --- Crear Nuevo Work y Nuevo Income ---
          console.log(`Creando nuevo Work para Budget ID: ${budget.idBudget}`);
          workRecord = await Work.create({
            propertyAddress: budget.propertyAddress,
            status: 'pending',
            idBudget: budget.idBudget,
            notes: `Work creado automáticamente al aprobar presupuesto N° ${budget.idBudget}`,
            initialPayment: actualInitialPaymentAmount,
            staffId: req.user?.id  // Agregar staffId
          }, { transaction });

          try {
            console.log(`Creando nuevo Income para Work ID: ${workRecord.idWork}`);
            await Income.create({
              date: new Date(),
              amount: actualInitialPaymentAmount,
              typeIncome: 'Factura Pago Inicial Budget',
              notes: `Pago inicial registrado al aprobar Budget #${budget.idBudget}`,
              workId: workRecord.idWork,
              staffId: req.staff?.id  // Cambiar req.user por req.staff
            }, { transaction });
            console.log(`Nuevo Income creado exitosamente.`);
          } catch (incomeError) {
            console.error(`Error CRÍTICO al crear Income para nuevo Work ID ${workRecord.idWork}:`, incomeError);
            throw new Error("Fallo al crear el registro de ingreso asociado al nuevo Work.");
          }
        } else {
          // --- Work Existente: Verificar/Actualizar Work y Verificar/Crear/Actualizar Income ---
          console.log(`Work ya existente (ID: ${existingWork.idWork}) para Budget ID: ${budget.idBudget}. Verificando/Actualizando...`);
          workRecord = existingWork;

          if (parseFloat(workRecord.initialPayment) !== actualInitialPaymentAmount) {
            console.log(`Actualizando initialPayment en Work existente ${workRecord.idWork} de ${workRecord.initialPayment} a ${actualInitialPaymentAmount}`);
            await workRecord.update({ initialPayment: actualInitialPaymentAmount }, { transaction });
          }

          const existingIncome = await Income.findOne({
            where: { workId: workRecord.idWork, typeIncome: 'Factura Pago Inicial Budget' },
            transaction
          });

          if (!existingIncome) {
            console.warn(`Advertencia: Work ${workRecord.idWork} existía pero no se encontró Income inicial. Creando ahora.`);
            try {
              await Income.create({
                date: new Date(),
                amount: actualInitialPaymentAmount,
                typeIncome: 'Factura Pago Inicial Budget',
                notes: `Pago inicial (tardío) registrado al aprobar Budget #${budget.idBudget}`,
                workId: workRecord.idWork,
                staffId: req.staff?.id // Cambiar req.user por req.staff
              }, { transaction });
              console.log(`Income (tardío) creado exitosamente.`);
            } catch (lateIncomeError) {
              console.error(`Error CRÍTICO al crear Income (tardío) para Work ID ${workRecord.idWork}:`, lateIncomeError);
              throw new Error("Fallo al crear el registro de ingreso (tardío) asociado.");
            }
          } else {
            console.log(`Income inicial ya existente para Work ID: ${workRecord.idWork}. Verificando monto...`);
            if (parseFloat(existingIncome.amount) !== actualInitialPaymentAmount) {
              console.log(`Actualizando monto en Income existente ${existingIncome.id} de ${existingIncome.amount} a ${actualInitialPaymentAmount}`);
              await existingIncome.update({ amount: actualInitialPaymentAmount }, { transaction });
            }
          }
        }

        console.log("Preparando datos para notificación 'incomeCreated'...");
        const notificationDataForIncome = {
          amount: actualInitialPaymentAmount, // Usar monto determinado
          propertyAddress: budget.propertyAddress,
          budgetTotal: budget.totalPrice,
          budgetInitialPercentage: budget.initialPaymentPercentage
        };
        console.log("Datos para notificación:", notificationDataForIncome);
        await sendNotifications('incomeCreated', notificationDataForIncome, null, req.io);
        console.log("Notificación 'incomeCreated' enviada.");

      }
      // --- 8. Confirmar Transacción ---
      await transaction.commit();
      console.log(`--- Transacción para Budget ID: ${idBudget} confirmada exitosamente. ---`);

      // --- 9. Responder al Frontend ---
      // Volver a buscar el budget fuera de la transacción para obtener el estado final MÁS actualizado
      const finalBudgetResponseData = await Budget.findByPk(idBudget, {
        include: [
          { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName', 'lot', 'block'] },
          { model: BudgetLineItem, as: 'lineItems' } // Incluir items actualizados
        ]
      });

      if (!finalBudgetResponseData) {
        // Esto sería muy raro si la transacción se confirmó, pero por seguridad
        console.error(`Error: No se pudo encontrar el Budget ID ${idBudget} después de confirmar la transacción.`);
        return res.status(404).json({ error: 'Presupuesto no encontrado después de la actualización.' });
      }

      const responseData = finalBudgetResponseData.toJSON();
      // Añadir URLs dinámicas
      if (responseData.Permit) {
        const baseUrl = `${req.protocol}://${req.get('host')}/permits`;
        responseData.Permit.pdfDataUrl = `${baseUrl}/${responseData.Permit.idPermit}/view/pdf`;
        responseData.Permit.optionalDocsUrl = `${baseUrl}/${responseData.Permit.idPermit}/view/optional`;
      }
      // Añadir URL del PDF del budget si existe
      if (responseData.pdfPath && fs.existsSync(responseData.pdfPath)) {
        responseData.budgetPdfUrl = `${req.protocol}://${req.get('host')}/budgets/${idBudget}/pdf`; // Asegúrate que la ruta /budgets/:id/pdf exista y sirva el archivo
      }

      console.log(`Enviando respuesta exitosa para Budget ID: ${idBudget}`);
      res.status(200).json(responseData);

    } catch (error) {
      // --- Manejo de Errores y Rollback ---
      console.error(`Error FATAL durante la actualización del Budget ID ${idBudget}:`, error);
      // Asegurarse de hacer rollback si la transacción no ha terminado
      if (transaction && typeof transaction.rollback === 'function' && !transaction.finished) {
        try {
          await transaction.rollback();
          console.log(`Transacción para Budget ID ${idBudget} revertida debido a error.`);
        } catch (rollbackError) {
          console.error(`Error al intentar revertir la transacción para Budget ID ${idBudget}:`, rollbackError);
        }
      }
      // Devolver un error genérico o el mensaje específico si es seguro
      res.status(400).json({ error: error.message || 'Error interno al actualizar el presupuesto.' });
    }
  
  },
  async uploadInvoice(req, res) { 
    const transaction = await conn.transaction();

    try {
      const { idBudget } = req.params;
      const { uploadedAmount } = req.body; // <--- Nuevo: Obtener el monto del cuerpo de la solicitud

      // Verificar si el archivo fue recibido
      console.log("ID del presupuesto recibido:", idBudget);
      console.log("Archivo recibido:", req.file);
      console.log("Monto del comprobante recibido (uploadedAmount):", uploadedAmount); // <--- Nuevo log

      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No se recibió ningún archivo de comprobante' });
      }

      let parsedUploadedAmount = null;
      if (uploadedAmount !== undefined && uploadedAmount !== null && String(uploadedAmount).trim() !== '') {
        parsedUploadedAmount = parseFloat(uploadedAmount);
        if (isNaN(parsedUploadedAmount) || parsedUploadedAmount < 0) {
          await transaction.rollback();
          console.error("Monto del comprobante inválido:", uploadedAmount);
          return res.status(400).json({ error: 'El monto del comprobante proporcionado no es un número válido o es negativo.' });
        }
      }

      // --- 1. Determinar el tipo de archivo ---
      let proofType;
      if (req.file.mimetype.startsWith('image/')) {
        proofType = 'image';
      } else if (req.file.mimetype === 'application/pdf') {
        proofType = 'pdf';
      } else {
        console.log("Tipo de archivo no soportado:", req.file.mimetype);
        return res.status(400).json({ error: 'Tipo de archivo de comprobante no soportado (PDF o Imagen requeridos)' });
      }
      console.log("Tipo de archivo determinado:", proofType);
      // --- Fin Determinar tipo ---

      const buffer = req.file.buffer;
      const fileName = `payment_proof_${idBudget}_${Date.now()}`;
      const folderName = 'payment_proofs';
      console.log("Nombre del archivo:", fileName);
      console.log("Carpeta de destino en Cloudinary:", folderName);

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: proofType === 'pdf' ? 'raw' : 'image',
            folder: folderName,
            public_id: fileName,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary error:', error);
              reject(error);
            } else {
              console.log("Resultado de la subida a Cloudinary:", result);
              resolve(result);
            }
          }
        ).end(buffer);
      });

      // Buscar presupuesto
      console.log("Buscando presupuesto con ID:", idBudget);
      const budget = await Budget.findByPk(idBudget, { transaction });
      if (!budget) {
        console.log("Presupuesto no encontrado. Eliminando archivo de Cloudinary...");
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id, {
            resource_type: uploadResult.resource_type || (proofType === 'pdf' ? 'raw' : 'image')
          });
        } catch (e) {
          console.error("Error al eliminar archivo de Cloudinary:", e);
        }
        await transaction.rollback();
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // ✅ PERMITIR: Eliminar comprobante anterior de Cloudinary si existe
      if (budget.paymentInvoice) {
        console.log("Comprobante anterior encontrado, eliminando de Cloudinary...");
        // Extraer public_id del URL anterior
        const oldPublicId = budget.paymentInvoice.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(`payment_proofs/${oldPublicId}`, {
            resource_type: budget.paymentProofType === 'pdf' ? 'raw' : 'image'
          });
          console.log("Comprobante anterior eliminado de Cloudinary");
        } catch (e) {
          console.warn("Error al eliminar comprobante anterior de Cloudinary:", e);
        }
      }

      // Guardar URL, TIPO y MONTO DEL COMPROBANTE
      budget.paymentInvoice = uploadResult.secure_url;
      budget.paymentProofType = proofType;
      if (parsedUploadedAmount !== null) {
        budget.paymentProofAmount = parsedUploadedAmount;
        console.log("Monto del comprobante guardado:", parsedUploadedAmount);
      }
      await budget.save({ transaction });
      console.log("Presupuesto actualizado con comprobante y monto (si aplica):", budget.toJSON());

      // ✅ MEJORAR: Manejo de Income y Receipt para presupuestos aprobados
      if (budget.status === 'approved') {
        const existingWork = await Work.findOne({
          where: { idBudget: budget.idBudget },
          transaction
        });

        if (existingWork) {
          console.log(`Work encontrado: ${existingWork.idWork}`);

          // Buscar Income de pago inicial
          let relatedIncome = await Income.findOne({
            where: {
              workId: existingWork.idWork,
              typeIncome: 'Factura Pago Inicial Budget'
            },
            transaction
          });

          // ✅ CREAR Income si no existe (caso cuando se eliminó)
          if (!relatedIncome) {
            console.log('No se encontró Income de pago inicial, creando uno nuevo...');
            const amountForIncome = parsedUploadedAmount || budget.initialPayment;

            relatedIncome = await Income.create({
              amount: amountForIncome,
              date: new Date(),
              typeIncome: 'Factura Pago Inicial Budget',
              notes: `Pago inicial para Budget #${budget.idBudget}`,
              workId: existingWork.idWork,
              staffId: req.user?.id
            }, { transaction });

            console.log(`Nuevo Income creado: ${relatedIncome.idIncome}`);
          } else {
            // ✅ ACTUALIZAR Income existente si el monto cambió
            const newAmount = parsedUploadedAmount || relatedIncome.amount;
            if (parseFloat(relatedIncome.amount) !== parseFloat(newAmount)) {
              await relatedIncome.update({
                amount: newAmount,
                date: new Date(),
                notes: `Pago inicial actualizado para Budget #${budget.idBudget}`,
                staffId: req.user?.id
              }, { transaction });
              console.log(`Income actualizado con nuevo monto: ${newAmount}`);
            }
          }

          // ✅ MANEJAR Receipt
          if (relatedIncome && uploadResult?.secure_url) {
            let existingReceipt = await Receipt.findOne({
              where: {
                relatedModel: 'Income',
                relatedId: relatedIncome.idIncome
              },
              transaction
            });

            const receiptData = {
              fileUrl: uploadResult.secure_url,
              publicId: uploadResult.public_id,
              mimeType: req.file?.mimetype || 'application/pdf',
              originalName: req.file?.originalname || 'comprobante_pago_inicial.pdf',
              staffId: req.user?.id
            };

            if (existingReceipt) {
              // ✅ ACTUALIZAR Receipt existente
              await existingReceipt.update({
                ...receiptData,
                notes: `Comprobante de pago inicial actualizado para Budget #${budget.idBudget}`
              }, { transaction });
              console.log(`Receipt actualizado para Income: ${relatedIncome.idIncome}`);
            } else {
              // ✅ CREAR nuevo Receipt
              await Receipt.create({
                relatedModel: 'Income',
                relatedId: relatedIncome.idIncome,
                type: 'income',
                notes: `Comprobante de pago inicial para Budget #${budget.idBudget}`,
                ...receiptData
              }, { transaction });
              console.log(`Nuevo Receipt creado para Income: ${relatedIncome.idIncome}`);
            }
          }
        } else {
          console.log('No se encontró Work asociado a este Budget');
        }
      } else {
        console.log('Budget no está aprobado, no se crean Income/Receipt');
      }

      await transaction.commit();

      res.status(200).json({
        message: 'Comprobante de pago cargado exitosamente',
        cloudinaryUrl: uploadResult.secure_url,
        proofType: proofType,
        uploadedAmount: budget.paymentProofAmount,
        reupload: !!budget.paymentInvoice // ✅ Indicar si fue una recarga
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error al subir el comprobante de pago:', error);
      res.status(500).json({ error: error.message });
    }
  },



  async deleteBudget(req, res) {
    try {
      const { idBudget } = req.params;

      // Eliminar presupuesto
      const deleted = await Budget.destroy({ where: { idBudget } });
      if (!deleted) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error al eliminar el presupuesto:', error);
      res.status(500).json({ error: error.message });
    }
  },

async downloadBudgetPDF(req, res) {
  try {
    const { idBudget } = req.params;
    console.log(`Solicitud para descargar PDF de Budget ID: ${idBudget}`);

    const budget = await Budget.findByPk(idBudget, { attributes: ['pdfPath'] });

    if (!budget || !budget.pdfPath) {
      console.log(`PDF no encontrado en BD para Budget ID: ${idBudget}`);
      return res.status(404).send('PDF no encontrado para este presupuesto.');
    }

    // ✅ CONVERTIR URL PÚBLICA A RUTA LOCAL
    let localPdfPath;
    
    if (budget.pdfPath.startsWith('http')) {
      // Es una URL pública, convertir a ruta local
      const fileName = budget.pdfPath.split('/').pop(); // Extraer 'budget_X.pdf'
      localPdfPath = path.join(__dirname, '../uploads/budgets', fileName);
      console.log(`Convertido URL pública a ruta local: ${budget.pdfPath} -> ${localPdfPath}`);
    } else {
      // Es una ruta local directa (para compatibility con PDFs antiguos)
      localPdfPath = budget.pdfPath;
    }

    // Verificar si el archivo existe en el sistema de archivos
    if (!fs.existsSync(localPdfPath)) {
      console.error(`Error: Archivo PDF no encontrado en la ruta física: ${localPdfPath}`);
      
      // 🔧 INTENTAR REGENERAR EL PDF SI NO EXISTE
      console.log(`Intentando regenerar PDF para Budget ID: ${idBudget}`);
      try {
        // Obtener todos los datos del budget para regenerar el PDF
        const fullBudget = await Budget.findByPk(idBudget, {
          include: [
            { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName', 'lot', 'block'] },
            { model: BudgetLineItem, as: 'lineItems' }
          ]
        });

        if (!fullBudget) {
          return res.status(404).send('Presupuesto no encontrado.');
        }

        // Regenerar el PDF
        const { generateAndSaveBudgetPDF } = require('../utils/pdfGenerators');
        const regeneratedPdfPath = await generateAndSaveBudgetPDF(fullBudget.toJSON());
        
        // Actualizar la ruta en la base de datos
        const pdfPublicUrl = getPublicPdfUrl(regeneratedPdfPath, req);
        await fullBudget.update({ pdfPath: pdfPublicUrl });
        
        console.log(`PDF regenerado exitosamente: ${regeneratedPdfPath}`);
        localPdfPath = regeneratedPdfPath;
        
      } catch (regenerationError) {
        console.error(`Error al regenerar PDF:`, regenerationError);
        return res.status(500).send('Error al regenerar el archivo PDF.');
      }
    }

    // Usar res.download() para forzar la descarga con el nombre original
    const filename = path.basename(localPdfPath); // Extrae 'budget_XX.pdf' de la ruta completa
    console.log(`Intentando descargar archivo: ${localPdfPath} como ${filename}`);

    res.download(localPdfPath, filename, (err) => {
      if (err) {
        console.error(`Error al enviar el archivo PDF (${filename}):`, err);
        if (!res.headersSent) {
          res.status(500).send('Error al descargar el archivo PDF.');
        }
      } else {
        console.log(`PDF ${filename} descargado exitosamente.`);
      }
    });

  } catch (error) {
    console.error(`Error general en downloadBudgetPDF para ID ${req.params.idBudget}:`, error);
    if (!res.headersSent) {
      res.status(500).send('Error interno al procesar la solicitud del PDF.');
    }
  }
},

  async uploadBudgetPDF(req, res) {
    try {
      const { idBudget } = req.params;

      // Verificar si el archivo fue recibido
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo PDF' });
      }

      // Buscar el presupuesto
      const budget = await Budget.findByPk(idBudget);
      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // Verificar si la carpeta 'uploads' existe, si no, crearla
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Guardar el archivo en el sistema de archivos
      const pdfPath = path.join(uploadsDir, `budget_${idBudget}.pdf`);
      fs.writeFileSync(pdfPath, req.file.buffer);

      // Actualizar el presupuesto con la ruta del PDF
      budget.pdfPath = pdfPath; // Asignar el valor al modelo
      await budget.save(); // Guardar los cambios en la base de datos

      res.status(200).json({ message: 'PDF subido y asociado al presupuesto exitosamente', pdfPath });
    } catch (error) {
      console.error('Error al subir el PDF:', error);
      res.status(500).json({ error: 'Error interno al subir el PDF' });
    }
  },
 async viewBudgetPDF(req, res) {
  try {
    const { idBudget } = req.params;
    console.log(`Solicitud para ver PDF de Budget ID: ${idBudget}`);

    const budget = await Budget.findByPk(idBudget, { attributes: ['pdfPath'] });

    if (!budget || !budget.pdfPath) {
      console.log(`PDF no encontrado en BD para Budget ID: ${idBudget}`);
      return res.status(404).send('PDF no encontrado para este presupuesto.');
    }

    // ✅ CONVERTIR URL PÚBLICA A RUTA LOCAL
    let localPdfPath;
    
    if (budget.pdfPath.startsWith('http')) {
      // Es una URL pública, convertir a ruta local
      const fileName = budget.pdfPath.split('/').pop(); // Extraer 'budget_X.pdf'
      localPdfPath = path.join(__dirname, '../uploads/budgets', fileName);
      console.log(`Convertido URL pública a ruta local para vista: ${budget.pdfPath} -> ${localPdfPath}`);
    } else {
      // Es una ruta local directa (para compatibility con PDFs antiguos)
      localPdfPath = budget.pdfPath;
    }

    // Verificar si el archivo existe
    if (!fs.existsSync(localPdfPath)) {
      console.error(`Error: Archivo PDF no encontrado en la ruta física: ${localPdfPath}`);
      
      // 🔧 INTENTAR REGENERAR EL PDF SI NO EXISTE
      console.log(`Intentando regenerar PDF para visualización - Budget ID: ${idBudget}`);
      try {
        // Obtener todos los datos del budget para regenerar el PDF
        const fullBudget = await Budget.findByPk(idBudget, {
          include: [
            { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName', 'lot', 'block'] },
            { model: BudgetLineItem, as: 'lineItems' }
          ]
        });

        if (!fullBudget) {
          return res.status(404).send('Presupuesto no encontrado.');
        }

        // Regenerar el PDF
        const { generateAndSaveBudgetPDF } = require('../utils/pdfGenerators');
        const regeneratedPdfPath = await generateAndSaveBudgetPDF(fullBudget.toJSON());
        
        // Actualizar la ruta en la base de datos
        const pdfPublicUrl = getPublicPdfUrl(regeneratedPdfPath, req);
        await fullBudget.update({ pdfPath: pdfPublicUrl });
        
        console.log(`PDF regenerado exitosamente para visualización: ${regeneratedPdfPath}`);
        localPdfPath = regeneratedPdfPath;
        
      } catch (regenerationError) {
        console.error(`Error al regenerar PDF para visualización:`, regenerationError);
        return res.status(500).send('Error al regenerar el archivo PDF.');
      }
    }

    // *** Establecer cabeceras mejoradas para visualización inline y compatibilidad con Chrome ***
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="budget_' + idBudget + '.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=0, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    
    // Cabeceras CORS para evitar bloqueos
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');

    // Leer el archivo y enviarlo como stream
    const stat = fs.statSync(localPdfPath);
    res.setHeader('Content-Length', stat.size);

    // Crear stream de lectura y enviarlo
    const fileStream = fs.createReadStream(localPdfPath);
    
    fileStream.on('error', (err) => {
      console.error(`Error en el stream del PDF para visualización (ID ${idBudget}):`, err);
      if (!res.headersSent) {
        res.status(500).send('Error al leer el archivo PDF.');
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error(`Error general en viewBudgetPDF para ID ${req.params.idBudget}:`, error);
    if (!res.headersSent) {
      res.status(500).send('Error interno al procesar la solicitud del PDF.');
    }
  }
},



  async previewBudgetPDF(req, res) {
    const { idBudget } = req.params;

    try {
      // 1. Buscar el presupuesto con TODOS los datos necesarios para el PDF
      const budget = await Budget.findByPk(idBudget, {
        include: [
          { model: Permit, as: 'Permit' },
          { model: BudgetLineItem, as: 'lineItems' }
        ]
      });

      if (!budget) {
        return res.status(404).json({ error: true, message: 'Presupuesto no encontrado.' });
      }

      // 2. Generar el PDF al momento
      const { generateAndSaveBudgetPDF } = require('../utils/pdfGenerators');
      const tempPdfPath = await generateAndSaveBudgetPDF(budget.toJSON());

      // 3. Establecer cabeceras para mostrar el PDF inline
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="preview_budget_${idBudget}.pdf"`);

      // 4. Enviar el archivo
      res.sendFile(tempPdfPath, (err) => {
        if (err) {
          console.error('Error enviando PDF:', err);
          if (!res.headersSent) {
            res.status(500).send('Error al enviar el PDF.');
          }
        }
        
        // 5. Limpiar el archivo temporal
        setTimeout(() => {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlink(tempPdfPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error eliminando archivo temporal:', unlinkErr);
            });
          }
        }, 1000);
      });

    } catch (error) {
      console.error('Error al generar la vista previa del PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: true, message: 'Error interno al generar la vista previa del PDF.' });
      }
    }
  },

}
  


module.exports = BudgetController;

