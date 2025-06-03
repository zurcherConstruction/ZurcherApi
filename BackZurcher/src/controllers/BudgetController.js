const { Budget, Permit, Work, Income, BudgetItem, BudgetLineItem, conn } = require('../data');
const { cloudinary } = require('../utils/cloudinaryConfig.js');
const {sendNotifications} = require('../utils/notifications/notificationManager.js');
const fs = require('fs');
const multer = require('multer');
const upload = multer();
const path = require('path');
const {sendEmail} = require('../utils/notifications/emailService.js');
const {generateAndSaveBudgetPDF} = require('../utils/pdfGenerator.js');



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

       // *** 2. Inicializar itemData con datos básicos y quantity validada ***
       let itemData = {
         quantity: quantityNum, // Usar el número parseado y validado
         notes: incomingItem.notes || null,
         marca: incomingItem.marca || null,
         capacity: incomingItem.capacity || null,
         // budgetId se añadirá después
       };

       // *** 3. Determinar Precio y otros detalles ***
       let priceAtTime = 0;
       if (incomingItem.budgetItemId) { // Item del catálogo
           const budgetItemDetails = await BudgetItem.findByPk(incomingItem.budgetItemId, { transaction });
           if (!budgetItemDetails || !budgetItemDetails.isActive) throw new Error(`Item base ID ${incomingItem.budgetItemId} no encontrado o inactivo.`);
           priceAtTime = parseFloat(budgetItemDetails.unitPrice);
           itemData.budgetItemId = incomingItem.budgetItemId;
           itemData.name = incomingItem.name || budgetItemDetails.name; // Usar nombre del catálogo como base
           itemData.category = incomingItem.category || budgetItemDetails.category; // Usar categoría del catálogo como base
       } else if (incomingItem.name && incomingItem.category && incomingItem.unitPrice !== undefined) { // Item manual
           const manualPrice = parseFloat(incomingItem.unitPrice);
           if (isNaN(manualPrice) || manualPrice < 0) throw new Error(`Item manual inválido (${incomingItem.name}): unitPrice debe ser un número no negativo.`);
           priceAtTime = manualPrice;
           itemData.budgetItemId = null;
           itemData.name = incomingItem.name; // Usar nombre manual
           itemData.category = incomingItem.category; // Usar categoría manual
       } else {
           console.error("Datos insuficientes para item:", incomingItem);
           throw new Error(`Item inválido: falta info (budgetItemId o name/category/unitPrice).`);
       }

       // *** 4. Asignar precios y calcular total de línea ***
       itemData.unitPrice = priceAtTime;
       itemData.priceAtTimeOfBudget = priceAtTime; // Guardar precio histórico
       itemData.lineTotal = priceAtTime * itemData.quantity; // Calcular total de línea

       // *** 5. Acumular subtotal y guardar datos para creación ***
       calculatedSubtotal += parseFloat(itemData.lineTotal || 0);
       lineItemsDataForCreation.push(itemData); // Guardar datos completos para crear después
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
      for (const itemData of lineItemsDataForCreation) {
          itemData.budgetId = newBudgetId;
          const createdItem = await BudgetLineItem.create(itemData, { transaction });
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
        console.log(`PDF generado en: ${generatedPdfPath}`);

        // Actualizar el registro Budget con la ruta del PDF
        await budgetForPdf.update({ pdfPath: generatedPdfPath });
        console.log(`Ruta del PDF actualizada para Budget ID ${newBudgetId}.`);

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
                attributes: ['id', 'name', 'category', 'marca', 'capacity', 'unitPrice'],
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
     
           if (hasLineItemUpdates) { // Solo si el frontend envió un array 'lineItems'
             console.log("Sincronizando Line Items (Eliminar y Recrear)...");
             await BudgetLineItem.destroy({ where: { budgetId: idBudget }, transaction });
             console.log(`Items existentes para Budget ID ${idBudget} eliminados.`);
     
             const createdLineItems = []; // Para guardar los objetos Sequelize creados
             for (const incomingItem of lineItems) {
               let priceAtTime = 0;
               let itemDataForCreation = {
                 budgetId: idBudget,
                 quantity: parseFloat(incomingItem.quantity) || 0,
                 notes: incomingItem.notes || null,
                 marca: incomingItem.marca || null,
                 capacity: incomingItem.capacity || null,
               };
     
               if (isNaN(itemDataForCreation.quantity) || itemDataForCreation.quantity <= 0) {
                  console.error("Error: Item inválido encontrado:", incomingItem);
                  throw new Error(`Item inválido: quantity debe ser un número positivo.`);
               }
     
               if (incomingItem.budgetItemId) { // Item del catálogo
                 const budgetItemDetails = await BudgetItem.findByPk(incomingItem.budgetItemId, { transaction });
                 if (!budgetItemDetails || !budgetItemDetails.isActive) {
                   console.error("Error: Item base no encontrado o inactivo:", incomingItem.budgetItemId);
                   throw new Error(`El item base con ID ${incomingItem.budgetItemId} no se encontró o no está activo.`);
                 }
                 priceAtTime = parseFloat(budgetItemDetails.unitPrice);
                 itemDataForCreation.budgetItemId = incomingItem.budgetItemId;
                 itemDataForCreation.name = incomingItem.name || budgetItemDetails.name; // Usar nombre de BudgetItem como fallback
                 itemDataForCreation.category = incomingItem.category || budgetItemDetails.category; // Usar categoría de BudgetItem como fallback
               } else if (incomingItem.name && incomingItem.category && incomingItem.unitPrice !== undefined) { // Item manual
                  const manualPrice = parseFloat(incomingItem.unitPrice);
                  if (isNaN(manualPrice) || manualPrice < 0) {
                     console.error("Error: Precio inválido para item manual:", incomingItem);
                     throw new Error(`Item manual inválido: unitPrice debe ser un número no negativo.`);
                  }
                 priceAtTime = manualPrice;
                 itemDataForCreation.budgetItemId = null;
                 itemDataForCreation.name = incomingItem.name;
                 itemDataForCreation.category = incomingItem.category;
               } else { // Item inválido
                 console.error("Error: Item inválido, falta información:", incomingItem);
                 throw new Error(`Item inválido: debe tener 'budgetItemId' o ('name', 'category', 'unitPrice').`);
               }
     
               // Asignar precios y calcular total de línea
               itemDataForCreation.unitPrice = priceAtTime;
               itemDataForCreation.priceAtTimeOfBudget = priceAtTime; // Guardar precio histórico si es necesario
               itemDataForCreation.lineTotal = priceAtTime * itemDataForCreation.quantity;
     
               // Crear el nuevo item en la BD
               const newItem = await BudgetLineItem.create(itemDataForCreation, { transaction });
               calculatedSubtotal += parseFloat(newItem.lineTotal || 0); // Acumular subtotal
               createdLineItems.push(newItem); // Guardar el objeto Sequelize
             }
             // Convertir los items recién creados a objetos planos para el PDF
             finalLineItemsForPdf = createdLineItems.map(item => item.toJSON());
             console.log(`${createdLineItems.length} items recreados para Budget ID ${idBudget}.`);
     
           } else { // Si no se enviaron items, usar los existentes para calcular y para el PDF
              console.log("No se recibieron items para actualizar, usando items existentes...");
              // Los items ya están cargados en budget.lineItems por el include inicial
              calculatedSubtotal = budget.lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || 0), 0);
              // Usar los items existentes (ya son objetos planos si se usó .toJSON() antes, o convertirlos)
              finalLineItemsForPdf = budget.lineItems.map(item => item.toJSON ? item.toJSON() : item);
              console.log("Subtotal calculado con items actuales:", calculatedSubtotal);
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
              generatedPdfPath = await generateAndSaveBudgetPDF(budgetDataForPdf); // Guardar en variable externa

              // Actualizar la ruta del PDF en la BD DENTRO de la transacción
              await budget.update({ pdfPath: generatedPdfPath }, { transaction });
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
      console.log("El estado es 'send'. Procesando envío de correo...");

      // --- Enviar Correo (Usa generatedPdfPath o budget.pdfPath actualizado) ---
      const pdfPathForEmail = generatedPdfPath; // Usar la ruta (nueva o existente)

      if (!pdfPathForEmail || !fs.existsSync(pdfPathForEmail)) {
         console.error(`Error: No se encontró el archivo PDF en ${pdfPathForEmail} para enviar por correo (Budget ID: ${idBudget}).`);
         // Considera si esto debe revertir o solo loggear. Por ahora, log y continúa.
          await transaction.rollback(); // Descomentar si es crítico
          return res.status(500).json({ error: 'Error interno: No se pudo encontrar el PDF para enviar.' });
      } else {
         console.log(`Usando PDF en ${pdfPathForEmail} para enviar correo...`);
         if (!budget.Permit?.applicantEmail || !budget.Permit.applicantEmail.includes('@')) {
            console.warn(`Advertencia: Cliente para Budget ID ${idBudget} sin correo válido. No se enviará email.`);
         } else {
          const clientMailOptions = {
            to: budget.Permit.applicantEmail, // Destinatario cliente
            subject: `Budget Proposal #${idBudget} for ${budget.propertyAddress}`, // Asunto claro
            text: `Dear ${budget.applicantName || 'Customer'},\n\nPlease find attached the budget proposal #${idBudget} for the property located at ${budget.propertyAddress}.\n\nExpiration Date: ${budget.expirationDate ? new Date(budget.expirationDate).toLocaleDateString() : 'N/A'}\nTotal Amount: $${parseFloat(budget.totalPrice || 0).toFixed(2)}\nInitial Payment (${budget.initialPaymentPercentage || 60}%): $${parseFloat(budget.initialPayment || 0).toFixed(2)}\n\n${budget.generalNotes ? 'Notes:\n' + budget.generalNotes + '\n\n' : ''}Best regards,\nZurcher Construction`, // Cuerpo del correo (o usa HTML)
            // html: `<h1>Budget Proposal #${idBudget}</h1><p>...</p>`, // Alternativa con HTML
            attachments: [ { filename: `budget_${idBudget}.pdf`, path: pdfPathForEmail, contentType: 'application/pdf' } ],
         };
            try {
               console.log(`Intentando enviar correo con PDF al cliente: ${budget.Permit.applicantEmail}`);
               await sendEmail(clientMailOptions);
               console.log(`Correo con PDF enviado exitosamente al cliente.`);
            } catch (clientEmailError) {
               console.error(`Error al enviar correo con PDF al cliente ${budget.Permit.applicantEmail}:`, clientEmailError);
            }
         }
      }
      // --- Fin Enviar Correo ---

       // Notificar al staff interno (siempre se notifica que se marcó como 'send')
       await sendNotifications('budgetSent', {
          propertyAddress: budget.propertyAddress,
          applicantEmail: budget.Permit?.applicantEmail,
          idBudget: budget.idBudget,
       }, null, req.io);
       console.log(`Notificaciones internas 'budgetSent' enviadas.`);
    } // --- Fin Lógica if (status === 'send') ---

    // --- 7b. Lógica si el estado es 'approved' ---
      if (budget.status === "approved") {
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
            initialPayment: actualInitialPaymentAmount, // Usar monto determinado
          }, { transaction });
          console.log(`Nuevo Work creado con ID: ${workRecord.idWork}`);
  
          try {
            console.log(`Creando nuevo Income para Work ID: ${workRecord.idWork}`);
            await Income.create({
              date: new Date(),
              amount: actualInitialPaymentAmount, // Usar monto determinado
              typeIncome: 'Factura Pago Inicial Budget',
              notes: `Pago inicial registrado al aprobar Budget #${budget.idBudget}`,
              workId: workRecord.idWork
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
                amount: actualInitialPaymentAmount, // Usar monto determinado
                typeIncome: 'Factura Pago Inicial Budget',
                notes: `Pago inicial (tardío) registrado al aprobar Budget #${budget.idBudget}`,
                workId: workRecord.idWork
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
}, // --- Fin de updateBudget ---

  async uploadInvoice(req, res) { // Considera renombrar esta función a uploadPaymentProof para claridad
    try {
      const { idBudget } = req.params;
      const { uploadedAmount } = req.body; // <--- Nuevo: Obtener el monto del cuerpo de la solicitud

      // Verificar si el archivo fue recibido
      console.log("ID del presupuesto recibido:", idBudget);
      console.log("Archivo recibido:", req.file);
      console.log("Monto del comprobante recibido (uploadedAmount):", uploadedAmount); // <--- Nuevo log

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo de comprobante' }); 
      }

      let parsedUploadedAmount = null;
      if (uploadedAmount !== undefined && uploadedAmount !== null && String(uploadedAmount).trim() !== '') {
        parsedUploadedAmount = parseFloat(uploadedAmount);
        if (isNaN(parsedUploadedAmount) || parsedUploadedAmount < 0) {
          // Considerar si eliminar el archivo de Cloudinary si ya se subió y el monto es inválido.
          // Por ahora, se devuelve error antes de la subida a Cloudinary si es posible, o se maneja después.
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
            resource_type:proofType === 'pdf' ? 'raw' : 'image', 
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

      console.log("Buscando presupuesto con ID:", idBudget);
      const budget = await Budget.findByPk(idBudget);
      if (!budget) {
        console.log("Presupuesto no encontrado. Eliminando archivo de Cloudinary...");
        try { 
          await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: uploadResult.resource_type || (proofType === 'pdf' ? 'raw' : 'image') }); 
        } catch (e) {
          console.error("Error al eliminar archivo de Cloudinary:", e);
        }
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
      console.log("Presupuesto encontrado:", budget);

      // --- 2. Guardar URL, TIPO y MONTO DEL COMPROBANTE ---
      budget.paymentInvoice = uploadResult.secure_url; 
      budget.paymentProofType = proofType;  
      if (parsedUploadedAmount !== null) { // Solo guardar si se proporcionó y fue válido
        budget.paymentProofAmount = parsedUploadedAmount; 
        console.log("Monto del comprobante guardado:", parsedUploadedAmount);
      } else {
        // Opcional: si no se envía, se podría establecer a null explícitamente si el modelo lo permite
        // y si se quiere limpiar un valor previo.
        // budget.paymentProofAmount = null; 
        console.log("No se proporcionó monto de comprobante o fue inválido, paymentProofAmount no se actualizó o se dejó como null.");
      }
      await budget.save();
      console.log("Presupuesto actualizado con comprobante y monto (si aplica):", budget.toJSON());
      // --- Fin Guardar ---

      res.status(200).json({
        message: 'Comprobante de pago cargado exitosamente', 
        cloudinaryUrl: uploadResult.secure_url,
        proofType: proofType,
        uploadedAmount: budget.paymentProofAmount // Devolver el monto guardado
      });
    } catch (error) {
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

      // Verificar si el archivo existe en el sistema de archivos
      if (!fs.existsSync(budget.pdfPath)) {
        console.error(`Error: Archivo PDF no encontrado en la ruta física: ${budget.pdfPath}`);
        return res.status(404).send('Archivo PDF no encontrado en el servidor.');
      }

      // Usar res.download() para forzar la descarga con el nombre original
      const filename = path.basename(budget.pdfPath); // Extrae 'budget_XX.pdf' de la ruta completa
      console.log(`Intentando descargar archivo: ${budget.pdfPath} como ${filename}`);

      res.download(budget.pdfPath, filename, (err) => {
        if (err) {
          // Manejar errores comunes, como problemas de permisos o archivo corrupto
          console.error(`Error al enviar el archivo PDF (${filename}):`, err);
          // Es importante no enviar otra respuesta si las cabeceras ya se enviaron
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
//vista previa pdf
async viewBudgetPDF(req, res) { // Nueva función para vista previa
  try {
    const { idBudget } = req.params;
    console.log(`Solicitud para ver PDF de Budget ID: ${idBudget}`);

    const budget = await Budget.findByPk(idBudget, { attributes: ['pdfPath'] });

    if (!budget || !budget.pdfPath) {
      console.log(`PDF no encontrado en BD para Budget ID: ${idBudget}`);
      return res.status(404).send('PDF no encontrado para este presupuesto.');
    }

    // Verificar si el archivo existe
    if (!fs.existsSync(budget.pdfPath)) {
      console.error(`Error: Archivo PDF no encontrado en la ruta física: ${budget.pdfPath}`);
      return res.status(404).send('Archivo PDF no encontrado en el servidor.');
    }

    // *** Establecer cabeceras para visualización inline ***
    res.setHeader('Content-Type', 'application/pdf');
    // Opcional: 'inline' es el valor por defecto si no se especifica 'attachment'
     res.setHeader('Content-Disposition', 'inline');

    // Enviar el archivo
    res.sendFile(budget.pdfPath, (err) => {
      if (err) {
        console.error(`Error al enviar el archivo PDF para visualización (ID ${idBudget}):`, err);
        if (!res.headersSent) {
          res.status(500).send('Error al enviar el archivo PDF.');
        }
      } else {
        console.log(`PDF para Budget ID ${idBudget} enviado para visualización.`);
      }
    });

  } catch (error) {
    console.error(`Error general en viewBudgetPDF para ID ${req.params.idBudget}:`, error);
    if (!res.headersSent) {
      res.status(500).send('Error interno al procesar la solicitud del PDF.');
    }
  }
}
}
module.exports = BudgetController;
