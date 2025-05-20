const { Receipt, FinalInvoice, Work, Income, conn } = require('../data');
const { cloudinary } = require('../utils/cloudinaryConfig'); // Asegúrate de importar la configuración de Cloudinary
const { Op } = require('sequelize'); 

const createReceipt = async (req, res) => {
  console.log('-----------------------------------------');
  console.log('[ReceiptController] createReceipt iniciado.');
  console.log('[ReceiptController] req.body:', req.body);
  console.log('[ReceiptController] req.file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
  } : 'No file received');

  if (!req.file) {
    console.error('[ReceiptController] Error: No se recibió ningún archivo.');
    return res.status(400).json({ error: true, message: 'No se subió ningún archivo.' });
  }

  const { relatedModel, relatedId, type, notes, amountPaid, workId: workIdFromRequest } = req.body; 

  if (!relatedModel || !relatedId || !type) {
    console.error('[ReceiptController] Error: Faltan datos requeridos en el body (relatedModel, relatedId, type). Body:', req.body);
    return res.status(400).json({ error: true, message: 'Faltan datos requeridos (relatedModel, relatedId, type).' });
  }

  try {
    console.log('[ReceiptController] Preparando stream para Cloudinary...');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'zurcher_receipts',
        resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'auto',
        format: req.file.mimetype === 'application/pdf' ? undefined : 'jpg', // No forzar formato para PDF
        access_mode: 'public'
      },
      async (error, result) => {
        if (error) {
          console.error('[ReceiptController] Error subiendo a Cloudinary:', error);
          return res.status(500).json({ error: true, message: 'Error al subir comprobante a Cloudinary.', details: error.message });
        }

        console.log('[ReceiptController] Cloudinary subió el archivo con éxito. Resultado:', {
            public_id: result.public_id,
            secure_url: result.secure_url,
        });

        const transaction = await conn.transaction(); 

        try {
          let finalInvoiceInstanceForUpdate; // Para usarla en la creación de Income y actualización de notas
          let numericAmountPaidForIncome; // Para usarla en la creación de Income

          // --- LÓGICA ESPECIAL PARA FinalInvoice (Actualizaciones de FinalInvoice y Work) ---
          if (relatedModel === 'FinalInvoice') {
            console.log(`[ReceiptController] Procesando recibo para FinalInvoice. ID: ${relatedId}`);
            if (!amountPaid || isNaN(parseFloat(amountPaid))) {
              await transaction.rollback();
              cloudinary.uploader.destroy(result.public_id, (destroyError) => { /* ... */ });
              return res.status(400).json({ error: true, message: 'Monto pagado no proporcionado o inválido para Factura Final.' });
            }

            numericAmountPaidForIncome = parseFloat(amountPaid); // Guardar para usar después
            const localFinalInvoiceInstance = await FinalInvoice.findByPk(relatedId, { transaction });

            if (!localFinalInvoiceInstance) {
              await transaction.rollback();
              cloudinary.uploader.destroy(result.public_id, (destroyError) => { /* ... */ });
              return res.status(404).json({ error: true, message: 'Factura Final no encontrada.' });
            }
            finalInvoiceInstanceForUpdate = localFinalInvoiceInstance; // Asignar para uso posterior

            const numericFinalAmountDue = parseFloat(localFinalInvoiceInstance.finalAmountDue);
            const numericTotalAmountPaidPreviously = parseFloat(localFinalInvoiceInstance.totalAmountPaid || 0);
            const currentRemainingBalance = numericFinalAmountDue - numericTotalAmountPaidPreviously;

            if (numericAmountPaidForIncome <= 0) {
              await transaction.rollback();
              cloudinary.uploader.destroy(result.public_id, (destroyError) => { /* ... */ });
              return res.status(400).json({ error: true, message: 'El monto pagado debe ser mayor a cero.' });
            }
            
            if (numericAmountPaidForIncome > currentRemainingBalance + 0.001) { 
              await transaction.rollback();
              cloudinary.uploader.destroy(result.public_id, (destroyError) => { /* ... */ });
              return res.status(400).json({ 
                error: true, 
                message: `El monto pagado ($${numericAmountPaidForIncome.toFixed(2)}) excede el saldo pendiente ($${currentRemainingBalance.toFixed(2)}).` 
              });
            }

            localFinalInvoiceInstance.totalAmountPaid = parseFloat((numericTotalAmountPaidPreviously + numericAmountPaidForIncome).toFixed(2));
            
            if (localFinalInvoiceInstance.totalAmountPaid >= numericFinalAmountDue - 0.001) {
              localFinalInvoiceInstance.status = 'paid';
              if (!localFinalInvoiceInstance.paymentDate) {
                  localFinalInvoiceInstance.paymentDate = new Date();
              }
            } else {
              localFinalInvoiceInstance.status = 'partially_paid';
              localFinalInvoiceInstance.paymentDate = new Date(); 
            }
            
            localFinalInvoiceInstance.paymentNotes = localFinalInvoiceInstance.paymentNotes 
              ? `${localFinalInvoiceInstance.paymentNotes}\nRecibo adjuntado el ${new Date().toLocaleDateString()} por $${numericAmountPaidForIncome.toFixed(2)} (ID Recibo a crear).`
              : `Recibo adjuntado el ${new Date().toLocaleDateString()} por $${numericAmountPaidForIncome.toFixed(2)} (ID Recibo a crear).`;

            await localFinalInvoiceInstance.save({ transaction });
            console.log(`[ReceiptController] FinalInvoice ${localFinalInvoiceInstance.id} actualizada. Nuevo total pagado: ${localFinalInvoiceInstance.totalAmountPaid}, Estado: ${localFinalInvoiceInstance.status}`);

            if (localFinalInvoiceInstance.status === 'paid' && localFinalInvoiceInstance.workId) {
                const work = await Work.findByPk(localFinalInvoiceInstance.workId, { transaction });
                if (work) {
                    if (work.status !== 'completed' && work.status !== 'cancelled') { 
                        work.status = 'paymentReceived'; 
                        await work.save({ transaction });
                        console.log(`[ReceiptController] Work ${work.idWork} actualizado a '${work.status}'.`);
                    }
                } else {
                    console.warn(`[ReceiptController] No se encontró Work con ID: ${localFinalInvoiceInstance.workId} para actualizar estado.`);
                }
            }
          }
          // --- FIN LÓGICA ESPECIAL PARA FinalInvoice (Actualizaciones) ---

          // Crear el Receipt
          const newReceiptData = {
            relatedModel,
            relatedId,
            type,
            notes,
            fileUrl: result.secure_url,
            publicId: result.public_id,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
          };
          console.log('[ReceiptController] Datos para Receipt.create:', newReceiptData);
          const createdReceipt = await Receipt.create(newReceiptData, { transaction });
          console.log("[ReceiptController] Receipt creado exitosamente en BD:", createdReceipt.toJSON());

          // --- LÓGICA ESPECIAL PARA FinalInvoice (Creación de Income y actualización de notas) ---
          if (relatedModel === 'FinalInvoice' && finalInvoiceInstanceForUpdate) {
            // Crear el registro de Income asociado a este pago de FinalInvoice
            if (finalInvoiceInstanceForUpdate.workId && numericAmountPaidForIncome > 0) {
              const incomeDataForFinalInvoice = {
                amount: numericAmountPaidForIncome,
                date: finalInvoiceInstanceForUpdate.paymentDate || new Date(),
                workId: finalInvoiceInstanceForUpdate.workId,
                typeIncome: 'Factura Pago Final Budget',
                notes: `Pago para Factura Final ID: ${finalInvoiceInstanceForUpdate.id}. Recibo ID: ${createdReceipt.idReceipt}.`,
              };

              const workForStaff = await Work.findByPk(finalInvoiceInstanceForUpdate.workId, { attributes: ['staffId'], transaction });
              if (workForStaff && workForStaff.staffId) {
                incomeDataForFinalInvoice.staffId = workForStaff.staffId;
              } else {
                  console.warn(`[ReceiptController] No se pudo determinar staffId para Income de FinalInvoice ${finalInvoiceInstanceForUpdate.id}`);
              }

              console.log('[ReceiptController] Creando Income para pago de FinalInvoice:', incomeDataForFinalInvoice);
              await Income.create(incomeDataForFinalInvoice, { transaction });
              console.log('[ReceiptController] Income para pago de FinalInvoice creado exitosamente.');
            } else {
              console.warn(`[ReceiptController] No se creó Income para FinalInvoice ID: ${finalInvoiceInstanceForUpdate.id} porque workId no está definido o el monto es cero.`);
            }
            
            // Actualizar la nota de FinalInvoice con el ID del recibo real
            if (finalInvoiceInstanceForUpdate.paymentNotes && finalInvoiceInstanceForUpdate.paymentNotes.includes('(ID Recibo a crear)')) {
                finalInvoiceInstanceForUpdate.paymentNotes = finalInvoiceInstanceForUpdate.paymentNotes.replace('(ID Recibo a crear)', `ID Recibo: ${createdReceipt.idReceipt}`);
                await finalInvoiceInstanceForUpdate.save({ transaction }); // Guardar la FinalInvoice con la nota actualizada
                console.log(`[ReceiptController] Nota de FinalInvoice ${finalInvoiceInstanceForUpdate.id} actualizada con ID de Recibo.`);
            }
          }
          // --- FIN LÓGICA ESPECIAL PARA FinalInvoice (Income y notas) ---

          await transaction.commit();
          console.log("[ReceiptController] Transacción completada (commit).");
          
          res.status(201).json({ message: 'Comprobante procesado y guardado correctamente.', receipt: createdReceipt });

        } catch (dbError) {
          if (transaction && !transaction.finished) { // Asegurarse que la transacción existe y no ha terminado
            await transaction.rollback();
            console.error("[ReceiptController] Transacción revertida (rollback) debido a error en BD.");
          }
          console.error("[ReceiptController] Error guardando Receipt en BD o procesando lógica de pago:", dbError);
          cloudinary.uploader.destroy(result.public_id, (destroyError, destroyResult) => {
            if (destroyError) console.error("[ReceiptController] Error al borrar archivo huérfano de Cloudinary:", destroyError);
            else console.log("[ReceiptController] Archivo huérfano de Cloudinary borrado:", destroyResult);
          });
          res.status(500).json({
            error: true,
            message: 'Error interno al guardar el comprobante o procesar el pago.',
            details: dbError.message,
          });
        }
      }
    );

    console.log('[ReceiptController] Enviando buffer a Cloudinary...');
    uploadStream.end(req.file.buffer);
    console.log('[ReceiptController] Buffer enviado a Cloudinary (la subida es asíncrona).');

  } catch (generalError) {
    console.error("[ReceiptController] Error general (antes de stream o callback de Cloudinary):", generalError);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor al procesar la solicitud.',
      details: generalError.message,
    });
  }
};

  const getReceiptsByRelated = async (req, res) => {
    try {
      const { relatedModel, relatedId } = req.params;
      const receipts = await Receipt.findAll({ where: { relatedModel, relatedId } });
      res.status(200).json(receipts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
const deleteReceipt = async (req, res) => {
  const { idReceipt } = req.params;
  console.log(`[ReceiptController DELETE /receipt/${idReceipt}] Solicitud recibida.`); // <--- LOG INICIAL
  const transaction = await conn.transaction();
  let publicIdToDeleteFromCloudinary;

    try {
    console.log(`[ReceiptController DELETE /receipt/${idReceipt}] Buscando Receipt...`);
    const receipt = await Receipt.findByPk(idReceipt, { transaction });
    if (!receipt) {
      await transaction.rollback();
      console.error(`[ReceiptController DELETE /receipt/${idReceipt}] Receipt no encontrado.`);
      return res.status(404).json({ error: true, message: 'Comprobante no encontrado.' });
    }
    console.log(`[ReceiptController DELETE /receipt/${idReceipt}] Receipt encontrado:`, JSON.stringify(receipt, null, 2));
    publicIdToDeleteFromCloudinary = receipt.publicId;// Guardar para borrar después del commit

    // --- LÓGICA DE REVERSIÓN PARA FinalInvoice ---
     if (receipt.relatedModel === 'FinalInvoice') {
      console.log(`[ReceiptController] Reversión iniciada para recibo ${idReceipt} de FinalInvoice ID ${receipt.relatedId}`);

      // Para una búsqueda más precisa del Income, necesitamos el workId de la FinalInvoice
      const finalInvoiceForIncomeSearch = await FinalInvoice.findByPk(receipt.relatedId, { attributes: ['workId'], transaction });
      let incomeAmountToRevert = 0;

      if (finalInvoiceForIncomeSearch && finalInvoiceForIncomeSearch.workId) {
        const incomeToRevert = await Income.findOne({
            where: {
                workId: finalInvoiceForIncomeSearch.workId,
                typeIncome: 'Factura Pago Final Budget',
                notes: { [Op.like]: `%Recibo ID: ${idReceipt}%` }
            },
            transaction
        });

        if (incomeToRevert) {
            incomeAmountToRevert = parseFloat(incomeToRevert.amount);
            console.log(`[ReceiptController] Income ID ${incomeToRevert.idIncome} (monto: ${incomeAmountToRevert}) será borrado.`);
            await incomeToRevert.destroy({ transaction });

            // 2. Actualizar la FinalInvoice
            const finalInvoice = await FinalInvoice.findByPk(receipt.relatedId, { transaction });
            if (finalInvoice) {
              console.log(`[ReceiptController] Actualizando FinalInvoice ID ${finalInvoice.id}. Total pagado antes: ${finalInvoice.totalAmountPaid}`);
              finalInvoice.totalAmountPaid = parseFloat((parseFloat(finalInvoice.totalAmountPaid || 0) - incomeAmountToRevert).toFixed(2));
              
              if (finalInvoice.totalAmountPaid < 0) finalInvoice.totalAmountPaid = 0; // Evitar negativos

              // Reajustar estado
              const numericFinalAmountDue = parseFloat(finalInvoice.finalAmountDue);
              if (finalInvoice.totalAmountPaid >= numericFinalAmountDue - 0.001) {
                // Esto no debería pasar si estamos restando un pago que la completó, a menos que haya sobrepagos
                finalInvoice.status = 'paid'; 
              } else if (finalInvoice.totalAmountPaid > 0) {
                finalInvoice.status = 'partially_paid';
              } else {
                finalInvoice.status = 'pending'; // O el estado inicial que corresponda
                finalInvoice.paymentDate = null; // Si no hay pagos, no hay fecha de pago
              }
              // Considerar actualizar paymentNotes para reflejar la reversión
              finalInvoice.paymentNotes = `${finalInvoice.paymentNotes || ''}\nReversión por borrado de Recibo ID: ${idReceipt} (Monto: $${incomeAmountToRevert.toFixed(2)}) el ${new Date().toLocaleDateString()}.`;

              await finalInvoice.save({ transaction });
              console.log(`[ReceiptController] FinalInvoice ID ${finalInvoice.id} actualizada. Total pagado ahora: ${finalInvoice.totalAmountPaid}, Estado: ${finalInvoice.status}`);

              // 3. (Opcional Avanzado) Revertir estado de Work si es necesario
              if (incomeAmountToRevert > 0 && finalInvoice.workId && finalInvoice.status !== 'paid') {
                  const work = await Work.findByPk(finalInvoice.workId, { transaction });
                  // Si la obra estaba 'paymentReceived' y la factura ya no está 'paid', revertir estado de obra
                  if (work && work.status === 'paymentReceived') {
                      // Decidir a qué estado revertir la obra (ej. 'finalInvoiceGenerated' o estado anterior)
                      // Esto depende de tu flujo de estados de Work.
                       work.status = 'invoiceFinal'; 
                      await work.save({ transaction });
                       console.log(`[ReceiptController] Work ID ${work.idWork} estado revertido (potencialmente).`);
                  }
              }
            } else {
                console.warn(`[ReceiptController] No se encontró FinalInvoice ID ${receipt.relatedId} para actualizar tras borrado de Income.`);
            }
        } else {
            console.warn(`[ReceiptController] No se encontró Income asociado al Recibo ID ${idReceipt} para revertir.`);
        }
      } else {
          console.warn(`[ReceiptController] No se pudo encontrar FinalInvoice o su workId para buscar el Income asociado al Recibo ID ${idReceipt}.`);
      }
    }
    // --- FIN LÓGICA DE REVERSIÓN ---

    // Borrar el Receipt de la BD
    await receipt.destroy({ transaction }); // Usar destroy en la instancia
    console.log(`[ReceiptController] Recibo ID ${idReceipt} borrado de la BD.`);

    await transaction.commit();
    console.log("[ReceiptController] Transacción completada (commit) para borrado de recibo.");

    // Borrar de Cloudinary DESPUÉS de que la transacción de BD sea exitosa
    if (publicIdToDeleteFromCloudinary) {
      console.log(`Intentando borrar archivo de Cloudinary con public_id: ${publicIdToDeleteFromCloudinary}`);
      cloudinary.uploader.destroy(publicIdToDeleteFromCloudinary, (destroyError, destroyResult) => {
        if (destroyError) {
          console.error("[ReceiptController] Error al borrar archivo de Cloudinary tras borrado de recibo:", destroyError);
        } else {
          console.log("[ReceiptController] Archivo de Cloudinary borrado tras borrado de recibo:", destroyResult);
        }
      });
    } else {
        console.warn(`[ReceiptController] El recibo ${idReceipt} no tenía publicId para borrar de Cloudinary.`);
    }

    res.status(204).send();

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      console.error("[ReceiptController] Transacción revertida (rollback) debido a error en borrado de recibo.");
    }
    console.error(`[ReceiptController] Error al borrar Receipt ${idReceipt}:`, error);
    res.status(500).json({ error: true, message: 'Error interno al borrar el comprobante.', details: error.message });
  }
};

  
  module.exports = {
    createReceipt,
    getReceiptsByRelated,
    deleteReceipt,
  };