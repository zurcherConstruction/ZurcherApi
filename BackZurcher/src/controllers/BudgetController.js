const { Budget, Permit, Work, Income, BudgetItem, BudgetLineItem, conn } = require('../data');
const { cloudinary } = require('../utils/cloudinaryConfig.js');
const {sendNotifications} = require('../utils/notificationManager.js');
const fs = require('fs');
const multer = require('multer');
const upload = multer();
const path = require('path');

const BudgetController = {
  async createBudget(req, res) {
    // Usar una transacción para asegurar que todo se cree o nada
    const transaction = await conn.transaction();
    try {
      console.log("Cuerpo de la solicitud recibido:", req.body);

      if (!req.body) {
        await transaction.rollback();
        return res.status(400).json({ error: "El cuerpo de la solicitud está vacío." });
      }

      // --- Campos Esperados ---
      const {
        date,
        expirationDate,
        initialPayment, // Mantener si es relevante para el Budget general
        status,
        applicantName,
        propertyAddress,
        discountDescription, // Nuevo
        discountAmount,      // Nuevo
        generalNotes,        // Nuevo
        lineItems,           // Array de objetos { budgetItemId: X, quantity: Y, notes: Z (opcional) }
        permitId             // ID del permiso asociado (si la relación es por ID)
      } = req.body;

      // --- Validación de Campos Obligatorios ---
      // Ajusta según tus necesidades reales
      if (
        !date || initialPayment === undefined || !status || !applicantName ||
        !propertyAddress || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0
      ) {
        await transaction.rollback();
        return res.status(400).json({ error: "Faltan campos obligatorios (date, initialPayment, status, applicantName, propertyAddress, lineItems)." });
      }

      // --- Verificar Permiso ---
      // Busca por ID si recibes permitId, o por propertyAddress si esa es la clave de relación
     // --- Verificar Permiso ---
const permit = await Permit.findByPk(permitId, {
  attributes: ['idPermit', 'propertyAddress', 'applicantEmail'], // Incluye applicantEmail aquí
  transaction
});
if (!permit) {
  await transaction.rollback();
  return res.status(404).json({ error: "No se encontró un permiso con el ID proporcionado." });
}
console.log("Permiso encontrado por ID:", permit.idPermit);

// Usa el applicantEmail del permiso
const applicantEmail = permit.applicantEmail || null;
      // --- Asegúrate de usar la propertyAddress del *permit encontrado* ---
      const permitPropertyAddress = permit.propertyAddress; // <-- USA ESTA
      // --- Verificar si ya existe Budget (Opcional) ---
      //Descomenta si quieres evitar múltiples budgets por dirección/permiso
      const existingBudget = await Budget.findOne({ where: { propertyAddress }, transaction }); // O usa { where: { PermitIdPermit: permit.idPermit } }
      if (existingBudget) {
        await transaction.rollback();
        return res.status(400).json({ error: "Ya existe un presupuesto para esta dirección/permiso." });
      }

      // --- 1. Calcular Totales ANTES de crear el Budget ---
      let calculatedSubtotal = 0;
      const lineItemsDataForCreation = []; // Guardar datos para crear BudgetLineItems después

      for (const item of lineItems) {
        if (item.budgetItemId) {
            // Item del catálogo
            const budgetItemDetails = await BudgetItem.findByPk(item.budgetItemId, { transaction });
            if (!budgetItemDetails || !budgetItemDetails.isActive) {
                throw new Error(`El item con ID ${item.budgetItemId} no se encontró o no está activo.`);
            }
    
            const priceAtTime = parseFloat(budgetItemDetails.unitPrice);
            const quantity = parseFloat(item.quantity);
            const lineTotal = priceAtTime * quantity;
    
            calculatedSubtotal += lineTotal;
    
            lineItemsDataForCreation.push({
              budgetItemId: item.budgetItemId,
              quantity: quantity,
              unitPrice: priceAtTime, // Asignar el precio desde la base de datos
              priceAtTimeOfBudget: priceAtTime,
              lineTotal: lineTotal,
              notes: item.notes || null,
          });
        } else {
            // Item personalizado
            if (!item.name || !item.category || !item.unitPrice || item.quantity <= 0) {
                throw new Error(`Item personalizado inválido: falta name, category, unitPrice o quantity.`);
            }
    
            const priceAtTime = parseFloat(item.unitPrice);
            const quantity = parseFloat(item.quantity);
            const lineTotal = priceAtTime * quantity;
    
            calculatedSubtotal += lineTotal;
    
            lineItemsDataForCreation.push({
              budgetItemId: null, // No tiene ID porque es personalizado
              name: item.name,
              category: item.category,
              unitPrice: priceAtTime,
              priceAtTimeOfBudget: priceAtTime,
              quantity: quantity,
              lineTotal: lineTotal,
              notes: item.notes || null,
              ...(item.marca && { marca: item.marca }),
              ...(item.capacity && { capacity: item.capacity }),
          });
        }
    }
    console.log("Subtotal Pre-calculado:", calculatedSubtotal);

    const finalDiscount = parseFloat(discountAmount) || 0;
    const finalTotal = calculatedSubtotal - finalDiscount;
    console.log("Total Pre-calculado:", finalTotal);

    // --- 2. Crear el Budget Principal ---
    const newBudget = await Budget.create({
        date,
        expirationDate: expirationDate ? expirationDate : null,
        initialPayment,
        status,
        applicantName,
        propertyAddress: permitPropertyAddress,
        discountDescription,
        discountAmount: finalDiscount,
        generalNotes,
        subtotalPrice: calculatedSubtotal,
        totalPrice: finalTotal,
        PermitIdPermit: permit.idPermit,
        lot: req.body.lot,
        block: req.body.block,
    }, { transaction });
    console.log("Budget principal creado con totales (ID):", newBudget.idBudget);

    // --- 3. Crear los BudgetLineItems asociados ---
    const createdLineItems = [];
    for (const lineData of lineItemsDataForCreation) {
        const newLineItem = await BudgetLineItem.create({
            ...lineData,
            budgetId: newBudget.idBudget, // Asociar con el Budget recién creado
        }, { transaction });
        createdLineItems.push(newLineItem.get({ plain: true }));
    }
    console.log("BudgetLineItems creados.");

    // --- 4. Confirmar la Transacción ---
    await transaction.commit();

      // --- 5. Enviar Notificaciones ---
      const workDetails = {
        propertyAddress: permitPropertyAddress,
        idBudget: newBudget.idBudget,
        applicantEmail: applicantEmail || null, // Asegúrate de manejar el caso en que sea null
    };

    // Notificar a roles específicos (owner, recept, admin)
    await sendNotifications('created', workDetails, req.io);

    // Notificar al cliente por correo solo si applicantEmail está definido
    if (applicantEmail) {
        await sendNotifications('applicantEmail', workDetails, req.io);
    }
    // --- 6. Responder ---
    const finalBudgetResponse = newBudget.get({ plain: true });
    finalBudgetResponse.lineItems = createdLineItems;
    res.status(201).json(finalBudgetResponse);

  } catch (error) {
    if (!transaction.finished) {
        await transaction.rollback();
    }
    console.error("Error al crear el presupuesto:", error);
    res.status(400).json({ error: error.message || 'Error interno al crear el presupuesto.' });
}},

  
  // Asegúrate de que getBudgetById incluya los lineItems:
  async getBudgetById(req, res) {
    try {
      const { idBudget } = req.params;
      console.log(`Buscando Budget con ID: ${idBudget}`);

      const budget = await Budget.findByPk(idBudget, {
        include: [
          {
            model: Permit,
            attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'systemType', 'drainfieldDepth', 'excavationRequired'],
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


 
  async getBudgets(req, res) {
    try {
      // Incluir el modelo Permit para obtener el campo propertyAddress
      const budgets = await Budget.findAll({
        include: {
          model: Permit,
          attributes: ['propertyAddress', 'systemType'], // Solo incluye el campo propertyAddress
        },
        
      });

      res.status(200).json(budgets);
    } catch (error) {
      console.error('Error al obtener los presupuestos:', error);
      res.status(500).json({ error: error.message });
    }
  },

 
  
  async updateBudget(req, res) {
    const { idBudget } = req.params;
    const transaction = await conn.transaction(); // Usar transacción

    try {
      const { status } = req.body;
      console.log(`Actualizando Budget ID: ${idBudget}`);
      console.log("Datos recibidos:", req.body);

      // --- 1. Buscar el Budget Existente ---
      const budget = await Budget.findByPk(idBudget, {
        include: [{ model: BudgetLineItem, as: 'lineItems' }], // Incluir items actuales
        transaction
      });

      if (!budget) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
  // --- 2. Actualizar el Estado del Presupuesto ---
  if (status === 'send') {
    if (!budget.pdfPath) {
        throw new Error('El presupuesto no tiene un PDF asociado. No se puede enviar al cliente.');
    }

    // Enviar correo al cliente con el PDF adjunto
    const emailDetails = {
        to: budget.applicantEmail,
        subject: 'Presupuesto Listo',
        text: 'Adjunto encontrará su presupuesto.',
        attachments: [
            {
                filename: `budget_${idBudget}.pdf`,
                path: budget.pdfPath,
            },
        ],
    };
    await sendNotifications(emailDetails);
}

// --- 3. Extraer Datos de la Solicitud ---
      const {
        date,
        expirationDate,
        initialPayment,
        applicantName, // Permitir actualizar estos también si es necesario
        propertyAddress, // Generalmente no se cambia, pero podrías permitirlo
        discountDescription,
        discountAmount,
        generalNotes,
        lineItems // Array de items { id?, budgetItemId, quantity, notes? }
                    // 'id' presente si es un item existente, ausente si es nuevo
      } = req.body;

      // --- 3. Validaciones ---
      // Validar que al menos algo se esté actualizando
      const hasGeneralUpdates = date || expirationDate || initialPayment !== undefined || status || applicantName || propertyAddress || discountDescription !== undefined || discountAmount !== undefined || generalNotes !== undefined;
      const hasLineItemUpdates = lineItems && Array.isArray(lineItems); // No verificamos contenido aún

      if (!hasGeneralUpdates && !hasLineItemUpdates) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No se proporcionaron campos o items para actualizar' });
      }

      // Validar comprobante si se aprueba (igual que antes)
      if (status === "approved" && !budget.paymentInvoice) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Debe cargar el comprobante de pago antes de aprobar el presupuesto.' });
      }

      // --- 4. Actualizar Campos Generales del Budget ---
      // Solo actualiza los campos que vienen en req.body
      const generalUpdateData = {};
      if (date) generalUpdateData.date = date;
      if (expirationDate) generalUpdateData.expirationDate = expirationDate;
      if (initialPayment !== undefined) generalUpdateData.initialPayment = initialPayment;
      if (status) generalUpdateData.status = status;
      if (applicantName) generalUpdateData.applicantName = applicantName;
      if (propertyAddress) generalUpdateData.propertyAddress = propertyAddress; // Cuidado al cambiar esto
      if (discountDescription !== undefined) generalUpdateData.discountDescription = discountDescription;
      if (discountAmount !== undefined) generalUpdateData.discountAmount = discountAmount;
      if (generalNotes !== undefined) generalUpdateData.generalNotes = generalNotes;

      if (Object.keys(generalUpdateData).length > 0) {
          await budget.update(generalUpdateData, { transaction });
          console.log("Campos generales del Budget actualizados.");
      }


      // --- 6. Sincronizar BudgetLineItems ---
      let calculatedSubtotal = 0;
      const finalLineItems = [];

      if (hasLineItemUpdates) {
          console.log("Sincronizando Line Items...");
          const incomingItemsMap = new Map(lineItems.map(item => [item.id, item]));
          const existingItemsMap = new Map(budget.lineItems.map(item => [item.id, item]));

          const incomingExistingIds = lineItems.filter(item => item.id).map(item => item.id);
          const currentItemIds = budget.lineItems.map(item => item.id);

          // a) Eliminar items que ya no están en la solicitud
          const itemsToDeleteIds = currentItemIds.filter(id => !incomingItemsMap.has(id));
          if (itemsToDeleteIds.length > 0) {
              console.log("Eliminando items con IDs:", itemsToDeleteIds);
              await BudgetLineItem.destroy({
                  where: { id: { [Op.in]: itemsToDeleteIds }, budgetId: idBudget },
                  transaction
              });
          }

          // b) Actualizar items existentes y Crear nuevos items
          for (const incomingItem of lineItems) {
              if (!incomingItem.budgetItemId || !incomingItem.quantity || incomingItem.quantity <= 0) {
                  throw new Error(`Item inválido en la lista: falta budgetItemId o quantity válida.`);
              }

              const budgetItemDetails = await BudgetItem.findByPk(incomingItem.budgetItemId, { transaction });
              if (!budgetItemDetails || !budgetItemDetails.isActive) {
                  throw new Error(`El item base con ID ${incomingItem.budgetItemId} no se encontró o no está activo.`);
              }

              const priceAtTime = parseFloat(budgetItemDetails.unitPrice);
              const quantity = parseFloat(incomingItem.quantity);
              const lineTotal = priceAtTime * quantity;

              if (incomingItem.id && existingItemsMap.has(incomingItem.id)) {
                  const existingItem = existingItemsMap.get(incomingItem.id);
                  await existingItem.update({
                      quantity: quantity,
                      notes: incomingItem.notes || null,
                      lineTotal: lineTotal,
                  }, { transaction });
                  calculatedSubtotal += lineTotal;
                  finalLineItems.push(existingItem);
              } else {
                  const newItem = await BudgetLineItem.create({
                      budgetId: idBudget,
                      budgetItemId: incomingItem.budgetItemId,
                      quantity: quantity,
                      priceAtTimeOfBudget: priceAtTime,
                      lineTotal: lineTotal,
                      notes: incomingItem.notes || null
                  }, { transaction });
                  calculatedSubtotal += lineTotal;
                  finalLineItems.push(newItem);
              }
          }

          budget.lineItems = finalLineItems;
      } else {
          calculatedSubtotal = budget.lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
          console.log("No se enviaron lineItems, subtotal calculado con items existentes:", calculatedSubtotal);
      }


      // --- 6. Recalcular y Actualizar Totales Finales ---
      const finalDiscount = parseFloat(budget.discountAmount) || 0; // Usa el valor actualizado si cambió
      const finalTotal = calculatedSubtotal - finalDiscount;

      await budget.update({
        subtotalPrice: calculatedSubtotal,
        totalPrice: finalTotal
      }, { transaction });
      console.log("Totales finales del Budget actualizados.");


      // --- 7. Lógica al Aprobar (Crear Work e Income si aplica) ---
      // Esta lógica se mantiene igual que antes
      if (generalUpdateData.status === "approved") { // Verificar si el status *cambió* a approved en esta llamada
        console.log("El estado cambió a 'approved'. Verificando/Creando Work e Income...");
        let workRecord;
        const existingWork = await Work.findOne({ where: { idBudget: budget.idBudget }, transaction });

        if (!existingWork) {
          console.log(`Creando Work para Budget ID: ${budget.idBudget}`);
          workRecord = await Work.create({
            propertyAddress: budget.propertyAddress, // Usar la dirección del budget
            status: 'pending',
            idBudget: budget.idBudget,
            notes: `Work creado a partir del presupuesto N° ${budget.idBudget}`,
            initialPayment: budget.initialPayment,
          }, { transaction });
          console.log(`Work creado con ID: ${workRecord.idWork}`);

          // Crear Income solo si el Work es nuevo
          try {
            console.log(`Creando Income para Work ID: ${workRecord.idWork}`);
            await Income.create({
              date: new Date(),
              amount: budget.initialPayment,
              typeIncome: 'Factura Pago Inicial Budget',
              notes: `Pago inicial recibido para Budget #${budget.idBudget}`,
              workId: workRecord.idWork
            }, { transaction });
            console.log(`Income creado exitosamente para Work ID: ${workRecord.idWork}`);
          } catch (incomeError) {
            console.error(`Error al crear el registro Income para Work ID ${workRecord.idWork}:`, incomeError);
            // Considerar si lanzar un error aquí para revertir la transacción
            // throw new Error("Fallo al crear el registro de ingreso asociado.");
          }
        } else {
          console.log(`Work ya existente para Budget ID: ${budget.idBudget}, ID: ${existingWork.idWork}`);
          workRecord = existingWork;
          // Opcional: Verificar si el Income ya existe para evitar duplicados
          const existingIncome = await Income.findOne({
            where: { workId: workRecord.idWork, typeIncome: 'Factura Pago Inicial Budget' },
            transaction
          });
          if (!existingIncome) {
             console.warn(`Advertencia: Work ${workRecord.idWork} existía pero no se encontró Income de pago inicial. Creando ahora.`);
             try {
               await Income.create({ /* ... datos del income ... */ }, { transaction });
             } catch (lateIncomeError) { /* ... manejo de error ... */ }
          }
        }
      }
      // --- Fin Lógica al Aprobar ---

      // --- 8. Confirmar Transacción ---
      await transaction.commit();
      console.log(`Budget ID: ${idBudget} actualizado exitosamente.`);

      // --- 9. Responder ---
      // Devolver el presupuesto actualizado, incluyendo los items sincronizados
      const updatedBudgetWithItems = await Budget.findByPk(idBudget, {
         include: [
            { model: Permit, attributes: ['propertyAddress', /*...*/ ] },
            {
                model: BudgetLineItem,
                as: 'lineItems',
                include: [{ model: BudgetItem, as: 'itemDetails', attributes: ['name', 'description', /*...*/ ] }]
            }
         ]
      }); // Volver a buscar fuera de la transacción para obtener el estado final

      // ... (lógica para convertir PDF a URL si es necesario, como en getBudgetById) ...

      res.status(200).json(updatedBudgetWithItems); // Devolver el budget completo y actualizado

    } catch (error) {
      await transaction.rollback(); // Revertir en caso de cualquier error
      console.error(`Error al actualizar el presupuesto ID: ${idBudget}:`, error);
      res.status(400).json({ error: error.message || 'Error interno al actualizar el presupuesto.' });
    }
  },

  async uploadInvoice(req, res) { // Considera renombrar esta función a uploadPaymentProof para claridad
    try {
      const { idBudget } = req.params;

      // Verificar si el archivo fue recibido
      console.log("ID del presupuesto recibido:", idBudget);
      console.log("Archivo recibido:", req.file);

      if (!req.file) {
        // Esta ruta debe usar el middleware 'upload' de multer.js
        return res.status(400).json({ error: 'No se recibió ningún archivo de comprobante' }); 
      }

      // --- 1. Determinar el tipo de archivo ---
      let proofType;
      if (req.file.mimetype.startsWith('image/')) {
        proofType = 'image';
      } else if (req.file.mimetype === 'application/pdf') {
        proofType = 'pdf';
      } else {
        // Salvaguarda por si el filtro de Multer falla
        console.log("Tipo de archivo no soportado:", req.file.mimetype);
        return res.status(400).json({ error: 'Tipo de archivo de comprobante no soportado (PDF o Imagen requeridos)' });
      }
      console.log("Tipo de archivo determinado:", proofType);
      // --- Fin Determinar tipo ---

      const buffer = req.file.buffer;
      // Nombres genéricos para comprobantes
      const fileName = `payment_proof_${idBudget}_${Date.now()}`; 
      const folderName = 'payment_proofs'; // Carpeta genérica
      console.log("Nombre del archivo:", fileName);
      console.log("Carpeta de destino en Cloudinary:", folderName);

      // Subir a Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type:proofType === 'pdf' ? 'raw' : 'image', // 'auto' para PDF o Imagen
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
      const budget = await Budget.findByPk(idBudget);
      if (!budget) {
        console.log("Presupuesto no encontrado. Eliminando archivo de Cloudinary...");
        try { 
          await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: uploadResult.resource_type || 'raw' }); 
        } catch (e) {
          console.error("Error al eliminar archivo de Cloudinary:", e);
        }
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
      console.log("Presupuesto encontrado:", budget);

      // --- 2. Guardar URL y TIPO ---
      budget.paymentInvoice = uploadResult.secure_url; // Guarda URL en este campo
      budget.paymentProofType = proofType;             // Guarda TIPO en el nuevo campo
      await budget.save();
      console.log("Presupuesto actualizado con comprobante:", budget);
      // --- Fin Guardar ---

      res.status(200).json({
        message: 'Comprobante de pago cargado exitosamente', // Mensaje actualizado
        cloudinaryUrl: uploadResult.secure_url,
        proofType: proofType // Devuelve el tipo (opcional)
      });
    } catch (error) {
      console.error('Error al subir el comprobante de pago:', error); // Mensaje actualizado
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
}}
module.exports = BudgetController;
