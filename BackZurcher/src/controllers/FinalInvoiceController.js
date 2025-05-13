const { FinalInvoice, WorkExtraItem, Work, Budget, Permit, conn } = require('../data'); // Asegúrate que los modelos se exportan correctamente desde data/index.js
const { Op } = require('sequelize');
 const { generateAndSaveFinalInvoicePDF } = require('../utils/pdfGenerator'); // Necesitarás crear esta función
 const fs = require('fs'); // <-- AÑADIR ESTA LÍNEA
 const path = require('path'); //

const FinalInvoiceController = {

  // Crear la factura final inicial para una obra
  async createFinalInvoice(req, res) {
    const { workId } = req.params;
    try {
      // 1. Buscar Work y Budget asociado (asegúrate que la relación Work->Budget existe y funciona)
      const work = await Work.findByPk(workId, {
        include: [{ model: Budget, as: 'budget' }] // Asumiendo alias 'budget'
      });

      if (!work) {
        return res.status(404).json({ error: true, message: 'Obra no encontrada.' });
      }
      if (!work.budget) {
        return res.status(400).json({ error: true, message: 'La obra no tiene un presupuesto asociado.' });
      }
      if (work.budget.status !== 'approved') {
         return res.status(400).json({ error: true, message: 'El presupuesto asociado a la obra no está aprobado.' });
      }

      // 2. Verificar si ya existe una factura final para esta obra
      const existingInvoice = await FinalInvoice.findOne({ where: { workId } });
      if (existingInvoice) {
        return res.status(409).json({ error: true, message: 'Ya existe una factura final para esta obra.', finalInvoice: existingInvoice });
      }

      // 3. Calcular monto final inicial (sin extras)
      const originalBudgetTotal = parseFloat(work.budget.totalPrice);
      
      // --- MODIFICACIÓN AQUÍ ---
      let actualInitialPaymentMade = 0;
      if (work.budget.paymentProofAmount !== null && !isNaN(parseFloat(work.budget.paymentProofAmount))) {
        actualInitialPaymentMade = parseFloat(work.budget.paymentProofAmount);
      } else if (work.budget.initialPayment !== null && !isNaN(parseFloat(work.budget.initialPayment))) {
        // Fallback al initialPayment calculado si paymentProofAmount no está o no es válido
        actualInitialPaymentMade = parseFloat(work.budget.initialPayment);
      }
      // --- FIN DE LA MODIFICACIÓN ---

      const finalAmountDueInitial = originalBudgetTotal - actualInitialPaymentMade;

      // 4. Crear la FinalInvoice
      const newFinalInvoice = await FinalInvoice.create({
        workId: work.idWork,
        budgetId: work.budget.idBudget,
        invoiceDate: new Date(),
        originalBudgetTotal: originalBudgetTotal,
        initialPaymentMade: actualInitialPaymentMade, // <-- Usar la variable actualizada
        subtotalExtras: 0.00, // Inicialmente no hay extras
        finalAmountDue: finalAmountDueInitial,
        status: 'pending',
      });

      res.status(201).json(newFinalInvoice);

    } catch (error) {
      console.error(`Error al crear la factura final para workId ${workId}:`, error);
      res.status(500).json({ error: true, message: 'Error interno del servidor.' });
    }
  },

  // Obtener la factura final y sus items por workId
  async getFinalInvoiceByWorkId(req, res) {
    const { workId } = req.params;
    try {
      const finalInvoice = await FinalInvoice.findOne({
        where: { workId },
        include: [
          { model: WorkExtraItem, as: 'extraItems' }, // Incluir los items extras
          { model: Work, include: [{ model: Budget, as: 'budget' }] }, // Incluir Work y Budget para contexto
          // { model: Budget } // Si no incluyes Work, puedes incluir Budget directamente
        ]
      });

      if (!finalInvoice) {
        return res.status(404).json({ error: true, message: 'Factura final no encontrada para esta obra.' });
      }

      res.status(200).json(finalInvoice);

    } catch (error) {
      console.error(`Error al obtener la factura final para workId ${workId}:`, error);
      res.status(500).json({ error: true, message: 'Error interno del servidor.' });
    }
  },

  // Añadir un item extra a una factura final
  async addExtraItem(req, res) {
    const { finalInvoiceId } = req.params;
    const { description, quantity, unitPrice } = req.body;
   
    const transaction = await conn.transaction();
    if (!description || quantity === undefined || unitPrice === undefined) {
      return res.status(400).json({ error: true, message: 'Faltan datos: description, quantity, unitPrice son requeridos.' });
    }

    try {
      const finalInvoice = await FinalInvoice.findByPk(finalInvoiceId);
      if (!finalInvoice) {
        await transaction.rollback();
        return res.status(404).json({ error: true, message: 'Factura final no encontrada.' });
      }

      // Calcular total de la línea
      const qty = parseFloat(quantity);
      const price = parseFloat(unitPrice);
      const lineTotal = qty * price;

      // Crear el item extra dentro de la transacción
      const newExtraItem = await WorkExtraItem.create({
        finalInvoiceId: finalInvoice.id,
        description,
        quantity: qty,
        unitPrice: price,
        lineTotal: lineTotal,
      }, { transaction }); // <-- Añadir transacción

      // Recalcular totales de la factura
      const updatedSubtotalExtras = parseFloat(finalInvoice.subtotalExtras) + lineTotal;
      const updatedFinalAmountDue = parseFloat(finalInvoice.originalBudgetTotal) + updatedSubtotalExtras - parseFloat(finalInvoice.initialPaymentMade);

      // Actualizar la factura
      await finalInvoice.update({
        subtotalExtras: updatedSubtotalExtras,
        finalAmountDue: updatedFinalAmountDue,
      }, { transaction }); // <-- Añadir transacción

      // Confirmar transacción
      await transaction.commit();

      // --- INICIO: Volver a buscar la factura actualizada CON los items ---
      const updatedInvoiceData = await FinalInvoice.findByPk(finalInvoice.id, {
          // No necesitamos transacción aquí, ya se confirmó
          include: [
              {
                  model: WorkExtraItem,
                  as: 'extraItems' // Asegúrate que el alias 'extraItems' sea correcto
              },
              // Puedes incluir otras asociaciones si las necesitas actualizadas en el frontend
              // { model: Work, include: [...] }
          ]
      });
      // --- FIN: Volver a buscar la factura actualizada
      res.status(201).json({ finalInvoice: updatedInvoiceData });

    } catch (error) {
      // Asegurarse de hacer rollback si la transacción existe y no se ha confirmado/revertido
      if (transaction && !transaction.finished) {
          await transaction.rollback();
      }
      console.error(`Error al añadir item extra a finalInvoiceId ${finalInvoiceId}:`, error);
      res.status(500).json({ error: true, message: 'Error interno del servidor al añadir item.' });
    }
  },
   // --- ACTUALIZADO: updateExtraItem ---
   async updateExtraItem(req, res) {
    const { itemId } = req.params;
    const { description, quantity, unitPrice } = req.body;
    const transaction = await conn.transaction(); // Usar transacción

    if (description === undefined && quantity === undefined && unitPrice === undefined) {
      return res.status(400).json({ error: true, message: 'Se requiere al menos un campo (description, quantity, unitPrice) para actualizar.' });
    }

    try {
       const itemToUpdate = await WorkExtraItem.findByPk(itemId, { transaction });
       if (!itemToUpdate) {
         await transaction.rollback();
         return res.status(404).json({ error: true, message: 'Item extra no encontrado.' });
       }

       const finalInvoice = await FinalInvoice.findByPk(itemToUpdate.finalInvoiceId, { transaction });
       if (!finalInvoice) {
          // Esto sería raro si el item existe, pero por seguridad
          await transaction.rollback();
          return res.status(404).json({ error: true, message: 'Factura final asociada no encontrada.' });
       }

       // Guardar el total original de la línea
       const originalLineTotal = parseFloat(itemToUpdate.lineTotal);

       // Actualizar campos del item
       if (description !== undefined) itemToUpdate.description = description;
       const newQuantity = quantity !== undefined ? parseFloat(quantity) : parseFloat(itemToUpdate.quantity);
       const newUnitPrice = unitPrice !== undefined ? parseFloat(unitPrice) : parseFloat(itemToUpdate.unitPrice);

       if (isNaN(newQuantity) || newQuantity <= 0 || isNaN(newUnitPrice) || newUnitPrice < 0) {
           await transaction.rollback();
           return res.status(400).json({ error: true, message: 'Quantity debe ser positivo y unitPrice no negativo.' });
       }

       itemToUpdate.quantity = newQuantity;
       itemToUpdate.unitPrice = newUnitPrice;
       const newLineTotal = newQuantity * newUnitPrice;
       itemToUpdate.lineTotal = newLineTotal;

       // Guardar cambios del item
       await itemToUpdate.save({ transaction });

       // Recalcular totales de la factura usando la diferencia
       const difference = newLineTotal - originalLineTotal;
       const updatedSubtotalExtras = parseFloat(finalInvoice.subtotalExtras) + difference;
       const updatedFinalAmountDue = parseFloat(finalInvoice.originalBudgetTotal) + updatedSubtotalExtras - parseFloat(finalInvoice.initialPaymentMade);

       // Actualizar la factura
       await finalInvoice.update({
         subtotalExtras: updatedSubtotalExtras,
         finalAmountDue: updatedFinalAmountDue,
       }, { transaction });

       await transaction.commit();

       // Devolver la factura actualizada completa
       const updatedInvoiceData = await FinalInvoice.findByPk(finalInvoice.id, {
           include: [{ model: WorkExtraItem, as: 'extraItems' }]
       });

       res.status(200).json({ finalInvoice: updatedInvoiceData }); // Devolver la factura actualizada

    } catch (error) {
       await transaction.rollback();
       console.error(`Error al actualizar item extra ${itemId}:`, error);
       res.status(500).json({ error: true, message: 'Error interno del servidor al actualizar item.' });
    }
 },

 // --- ACTUALIZADO: removeExtraItem ---
 async removeExtraItem(req, res) {
    const { itemId } = req.params;
    const transaction = await conn.transaction(); // Usar transacción

    try {
       const itemToRemove = await WorkExtraItem.findByPk(itemId, { transaction });
       if (!itemToRemove) {
         await transaction.rollback();
         return res.status(404).json({ error: true, message: 'Item extra no encontrado.' });
       }

       const finalInvoice = await FinalInvoice.findByPk(itemToRemove.finalInvoiceId, { transaction });
       if (!finalInvoice) {
          await transaction.rollback();
          return res.status(404).json({ error: true, message: 'Factura final asociada no encontrada.' });
       }

       // Guardar el total de la línea que se va a eliminar
       const removedLineTotal = parseFloat(itemToRemove.lineTotal);

       // Eliminar el item
       await itemToRemove.destroy({ transaction });

       // Recalcular totales de la factura restando el valor eliminado
       const updatedSubtotalExtras = parseFloat(finalInvoice.subtotalExtras) - removedLineTotal;
       const updatedFinalAmountDue = parseFloat(finalInvoice.originalBudgetTotal) + updatedSubtotalExtras - parseFloat(finalInvoice.initialPaymentMade);

       // Actualizar la factura
       await finalInvoice.update({
         subtotalExtras: updatedSubtotalExtras,
         finalAmountDue: updatedFinalAmountDue,
       }, { transaction });

       await transaction.commit();

       // Devolver la factura actualizada completa
       const updatedInvoiceData = await FinalInvoice.findByPk(finalInvoice.id, {
           include: [{ model: WorkExtraItem, as: 'extraItems' }]
       });

       res.status(200).json({ finalInvoice: updatedInvoiceData }); // Devolver la factura actualizada

    } catch (error) {
       await transaction.rollback();
       console.error(`Error al eliminar item extra ${itemId}:`, error);
       res.status(500).json({ error: true, message: 'Error interno del servidor al eliminar item.' });
    }
 },


 // --- ACTUALIZADO: updateFinalInvoiceStatus ---
 async updateFinalInvoiceStatus(req, res) {
    const { finalInvoiceId } = req.params;
    const { status, paymentDate, paymentNotes } = req.body;
    const validStatuses = ['pending', 'paid', 'partially_paid', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
       return res.status(400).json({ error: true, message: `Estado inválido. Estados permitidos: ${validStatuses.join(', ')}` });
    }

    try {
       const finalInvoice = await FinalInvoice.findByPk(finalInvoiceId);
       if (!finalInvoice) {
         return res.status(404).json({ error: true, message: 'Factura final no encontrada.' });
       }

       const updateData = { status };
       if (status === 'paid' || status === 'partially_paid') {
           // Si se marca como pagado/parcialmente pagado, usar la fecha proporcionada o la actual
           updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
       } else {
           // Para otros estados, limpiar la fecha de pago
           updateData.paymentDate = null;
       }
       if (paymentNotes !== undefined) {
           updateData.paymentNotes = paymentNotes;
       }

       await finalInvoice.update(updateData);

       // Devolver la factura actualizada completa
       const updatedInvoiceData = await FinalInvoice.findByPk(finalInvoice.id, {
           include: [{ model: WorkExtraItem, as: 'extraItems' }]
       });

       res.status(200).json(updatedInvoiceData); // Devolver la factura actualizada

    } catch (error) {
       console.error(`Error al actualizar estado de finalInvoiceId ${finalInvoiceId}:`, error);
       res.status(500).json({ error: true, message: 'Error interno del servidor al actualizar estado.' });
    }
 },

   // --- ACTUALIZADO: generateFinalInvoicePDF ---
   async generateFinalInvoicePDF(req, res) {
    const { finalInvoiceId } = req.params;
    try {
       // 1. Buscar la factura con todas las relaciones necesarias para el PDF
       const finalInvoice = await FinalInvoice.findByPk(finalInvoiceId, {
         include: [
           { model: WorkExtraItem, as: 'extraItems' },
           {
             model: Work,
             include: [
               {
                 model: Budget,
                 as: 'budget',
                 include: [ { model: Permit } ] // Incluir Permit desde Budget
               },
               // Si Work puede tener Permit directamente, incluirlo también como fallback
               // { model: Permit }
             ]
           },
           // Incluir Budget directamente si la relación existe y es necesaria
           // { model: Budget, include: [ { model: Permit } ] }
         ]
       });

       if (!finalInvoice) {
         return res.status(404).json({ error: true, message: 'Factura final no encontrada.' });
       }

       // 2. Generar el PDF
       const generatedPdfPath = await generateAndSaveFinalInvoicePDF(finalInvoice.toJSON()); // Pasar datos planos

       // 3. Actualizar la ruta en la BD (si cambió o no existía)
       if (finalInvoice.pdfPath !== generatedPdfPath) {
           await finalInvoice.update({ pdfPath: generatedPdfPath });
       }

       // 4. Responder (opcional: devolver la factura actualizada o solo la URL)
       const responseData = finalInvoice.toJSON();
       responseData.pdfUrl = `${req.protocol}://${req.get('host')}/final-invoice/${finalInvoiceId}/pdf/view`; // URL para ver

       res.status(200).json({
           message: 'PDF de factura final generado/actualizado exitosamente.',
           pdfPath: generatedPdfPath,
           pdfUrl: responseData.pdfUrl,
           finalInvoice: responseData // Devolver datos actualizados
       });

    } catch (error) {
       console.error(`Error al generar PDF para finalInvoiceId ${finalInvoiceId}:`, error);
       res.status(500).json({ error: true, message: 'Error interno del servidor al generar PDF.' });
    }
 },

 // --- NUEVO: viewFinalInvoicePDF ---
async viewFinalInvoicePDF(req, res) {
    try {
      const { finalInvoiceId } = req.params;
      const finalInvoice = await FinalInvoice.findByPk(finalInvoiceId, { attributes: ['pdfPath'] });

      if (!finalInvoice || !finalInvoice.pdfPath) {
        return res.status(404).send('PDF no encontrado para esta factura final.');
      }
      // Ahora 'fs' estará definido aquí
      if (!fs.existsSync(finalInvoice.pdfPath)) {
        console.error(`Error: Archivo PDF no encontrado en la ruta física: ${finalInvoice.pdfPath}`);
        return res.status(404).send('Archivo PDF no encontrado en el servidor.');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.sendFile(finalInvoice.pdfPath); // 'path' no es necesario aquí, pero sí en download
    } catch (error) {
      console.error(`Error en viewFinalInvoicePDF para ID ${req.params.finalInvoiceId}:`, error);
      res.status(500).send('Error interno al procesar la solicitud del PDF.');
    }
  },

  async downloadFinalInvoicePDF(req, res) {
    try {
      const { finalInvoiceId } = req.params;
      const finalInvoice = await FinalInvoice.findByPk(finalInvoiceId, { attributes: ['pdfPath'] });

      if (!finalInvoice || !finalInvoice.pdfPath) {
        return res.status(404).send('PDF no encontrado para esta factura final.');
      }
      // Ahora 'fs' estará definido aquí
      if (!fs.existsSync(finalInvoice.pdfPath)) {
        console.error(`Error: Archivo PDF no encontrado en la ruta física: ${finalInvoice.pdfPath}`);
        return res.status(404).send('Archivo PDF no encontrado en el servidor.');
      }

      // 'path' es necesario aquí para obtener el nombre del archivo
      const filename = path.basename(finalInvoice.pdfPath);
      res.download(finalInvoice.pdfPath, filename);
    } catch (error) {
      console.error(`Error en downloadFinalInvoicePDF para ID ${req.params.finalInvoiceId}:`, error);
      res.status(500).send('Error interno al procesar la solicitud del PDF.');
    }
  },

 // --- NUEVO: emailFinalInvoicePDF ---
 async emailFinalInvoicePDF(req, res) {
   const { finalInvoiceId } = req.params;
   const { recipientEmail } = req.body; // Permitir especificar email o usar el del cliente

   try {
       // 1. Buscar factura, PDF y datos del cliente
       const finalInvoice = await FinalInvoice.findByPk(finalInvoiceId, {
           include: [
               {
                   model: Work,
                   include: [ { model: Budget, as: 'budget', include: [ { model: Permit } ] } ]
               }
           ]
       });

       if (!finalInvoice) return res.status(404).json({ error: 'Factura final no encontrada.' });
       if (!finalInvoice.pdfPath || !fs.existsSync(finalInvoice.pdfPath)) {
           return res.status(400).json({ error: 'El PDF de la factura final no existe o no se ha generado.' });
       }

       // Determinar email del destinatario
       const budget = finalInvoice.Work?.budget;
       const permit = budget?.Permit;
       const clientEmail = recipientEmail || permit?.applicantEmail || budget?.applicantEmail; // Prioridad: body, permit, budget
       const clientName = budget?.applicantName || permit?.applicantName || 'Customer';
       const propertyAddress = finalInvoice.Work?.propertyAddress || budget?.propertyAddress || 'N/A';

       if (!clientEmail || !clientEmail.includes('@')) {
           return res.status(400).json({ error: 'No se pudo determinar un correo electrónico válido para el cliente.' });
       }

       // 2. Configurar y enviar correo
       const { sendEmail } = require('../utils/notifications/emailService'); // Importar sendEmail
       const mailOptions = {
           to: clientEmail,
           subject: `Final Invoice #${finalInvoice.id} for ${propertyAddress}`,
           text: `Dear ${clientName},\n\nPlease find attached the final invoice #${finalInvoice.id} for the work completed at ${propertyAddress}.\n\nTotal Amount Due: $${parseFloat(finalInvoice.finalAmountDue || 0).toFixed(2)}\nStatus: ${finalInvoice.status?.replace('_', ' ').toUpperCase() || 'N/A'}\n\nBest regards,\nZurcher Construction`,
           attachments: [
               {
                   filename: `final_invoice_${finalInvoice.id}.pdf`,
                   path: finalInvoice.pdfPath,
                   contentType: 'application/pdf'
               }
           ]
       };

       await sendEmail(mailOptions);
       res.status(200).json({ message: `Factura final enviada exitosamente a ${clientEmail}.` });

   } catch (error) {
       console.error(`Error al enviar por correo la factura final ${finalInvoiceId}:`, error);
       res.status(500).json({ error: 'Error interno al enviar el correo electrónico.' });
   }
 },


};



module.exports = FinalInvoiceController;