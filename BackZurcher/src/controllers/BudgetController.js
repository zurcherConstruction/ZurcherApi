const { Budget, Permit, Work, Income, BudgetItem, BudgetLineItem, Receipt, conn } = require('../data');
const { Op, literal } = require('sequelize'); 
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



  // Extraer la parte relativa de la ruta
  const relativePath = localPath.replace(path.join(__dirname, '../'), '');

  // ✅ USAR API_URL en lugar de BACKEND_URL
  const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
  const publicUrl = `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;



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
        discountAmount = 0, generalNotes, initialPaymentPercentage: initialPaymentPercentageInput, lineItems,
        leadSource, createdByStaffId // 🆕 Campos de origen y vendedor
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

      // --- Obtener el último idBudget existente ---
      let nextBudgetId = null;
      const lastBudget = await Budget.findOne({
        order: [['idBudget', 'DESC']],
        attributes: ['idBudget'],
        transaction
      });
      if (!lastBudget) {
        nextBudgetId = 2246;
      } else {
        nextBudgetId = lastBudget.idBudget + 1;
      }
      console.log(`ID para el nuevo presupuesto: ${nextBudgetId}`);

      // --- Procesar Items y Calcular Subtotal ---
      let calculatedSubtotal = 0;
      const lineItemsDataForCreation = [];
      for (const incomingItem of lineItems) {
        console.log("Procesando incomingItem:", incomingItem);
        const quantityNum = parseFloat(incomingItem.quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          console.error("Error de validación de cantidad:", incomingItem);
          throw new Error(`Item inválido: quantity (${incomingItem.quantity}) debe ser un número positivo.`);
        }
        let itemDataForCreation = {
          quantity: quantityNum,
          notes: incomingItem.notes || null,
          marca: incomingItem.marca || null,
          capacity: incomingItem.capacity || null,
          description: null,
          supplierName: incomingItem.supplierName || null, // ✅ AGREGAR SUPPLIERNAME
        };
        let priceAtTime = 0;
        if (incomingItem.budgetItemId) {
          const budgetItemDetails = await BudgetItem.findByPk(incomingItem.budgetItemId, { transaction });
          if (!budgetItemDetails || !budgetItemDetails.isActive) throw new Error(`Item base ID ${incomingItem.budgetItemId} no encontrado o inactivo.`);
          priceAtTime = parseFloat(budgetItemDetails.unitPrice);
          itemDataForCreation.budgetItemId = incomingItem.budgetItemId;
          itemDataForCreation.name = incomingItem.name || budgetItemDetails.name;
          itemDataForCreation.category = incomingItem.category || budgetItemDetails.category;
          itemDataForCreation.description = incomingItem.description || budgetItemDetails.description || null;
          // ✅ Priorizar supplierName del incoming (puede ser seleccionado manualmente), sino del catálogo
          if (incomingItem.supplierName) {
            itemDataForCreation.supplierName = incomingItem.supplierName;
          } else if (budgetItemDetails.supplierName) {
            itemDataForCreation.supplierName = budgetItemDetails.supplierName;
          }
        } else if (incomingItem.name && incomingItem.category && incomingItem.unitPrice !== undefined) {
          const manualPrice = parseFloat(incomingItem.unitPrice);
          if (isNaN(manualPrice) || manualPrice < 0) throw new Error(`Item manual inválido (${incomingItem.name}): unitPrice debe ser un número no negativo.`);
          priceAtTime = manualPrice;
          itemDataForCreation.budgetItemId = null;
          itemDataForCreation.name = incomingItem.name;
          itemDataForCreation.category = incomingItem.category;
          itemDataForCreation.description = incomingItem.description || null;
        } else {
          console.error("Datos insuficientes para item:", incomingItem);
          throw new Error(`Item inválido: falta info (budgetItemId o name/category/unitPrice).`);
        }
        itemDataForCreation.unitPrice = priceAtTime;
        itemDataForCreation.priceAtTimeOfBudget = priceAtTime;
        itemDataForCreation.lineTotal = priceAtTime * itemDataForCreation.quantity;
        calculatedSubtotal += parseFloat(itemDataForCreation.lineTotal || 0);
        lineItemsDataForCreation.push(itemDataForCreation);
      }
      console.log(`${lineItemsDataForCreation.length} items procesados. Subtotal calculado: ${calculatedSubtotal}`);
      const finalDiscount = parseFloat(discountAmount) || 0;
      const finalTotal = calculatedSubtotal - finalDiscount;

      let actualPercentage = 60;
      if (initialPaymentPercentageInput === 'total') {
        actualPercentage = 100;
      } else {
        const parsedPercentage = parseFloat(initialPaymentPercentageInput);
        if (!isNaN(parsedPercentage)) {
          actualPercentage = parsedPercentage;
        }
      }
      console.log(`Porcentaje de pago inicial interpretado: ${actualPercentage}%`);
      const calculatedInitialPayment = finalTotal * (actualPercentage / 100);
      console.log(`Totales calculados: Subtotal=${calculatedSubtotal}, Total=${finalTotal}, InitialPayment=${calculatedInitialPayment}`);

     let salesCommission = 0;
     let finalTotalWithCommission = finalTotal;

if (leadSource === 'sales_rep' && createdByStaffId) {
  salesCommission = 500;
  finalTotalWithCommission = finalTotal + salesCommission;
  console.log(`Presupuesto con vendedor - Trabajo: $${finalTotal} + Comision: $${salesCommission} = Total cliente: $${finalTotalWithCommission}`);
}

      const newBudget = await Budget.create({
        idBudget: nextBudgetId,
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
        totalPrice: finalTotalWithCommission,
        initialPayment: finalTotalWithCommission * (actualPercentage / 100),
        leadSource: leadSource || 'web',
        createdByStaffId: createdByStaffId || null,
        salesCommissionAmount: salesCommission,
        clientTotalPrice: finalTotalWithCommission,
        commissionAmount: salesCommission,
        commissionPaid: false,
      }, { transaction });
      newBudgetId = newBudget.idBudget;
      console.log(`Budget base creado con ID: ${newBudgetId}. Estado: ${status}`);

      // --- Crear BudgetLineItems ---
      const createdLineItemsForPdf = [];
      for (const itemDataForCreation of lineItemsDataForCreation) {
        itemDataForCreation.budgetId = newBudgetId;
        const createdItem = await BudgetLineItem.create(itemDataForCreation, { transaction });
        createdLineItemsForPdf.push(createdItem.toJSON());
      }
      console.log(`${lineItemsDataForCreation.length} BudgetLineItems creados.`);

      await transaction.commit();
      console.log(`--- Transacción principal para crear Budget ID ${newBudgetId} confirmada. ---`);

      // ✅ RESPONDER INMEDIATAMENTE AL FRONTEND SIN ESPERAR PDF NI EMAILS
      // Volver a buscar para obtener los datos completos para la respuesta
      const finalBudgetResponseData = await Budget.findByPk(newBudgetId, {
        include: [
          { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName', 'lot', 'block'] },
          { model: BudgetLineItem, as: 'lineItems' }
        ]
      });

      if (!finalBudgetResponseData) {
        throw new Error('No se pudo recuperar el presupuesto recién creado para la respuesta.');
      }

      const responseData = finalBudgetResponseData.toJSON();
      
      // Añadir URLs dinámicas
      if (responseData.Permit) {
        const baseUrl = `${req.protocol}://${req.get('host')}/permits`;
        responseData.Permit.pdfDataUrl = `${baseUrl}/${responseData.Permit.idPermit}/view/pdf`;
        responseData.Permit.optionalDocsUrl = `${baseUrl}/${responseData.Permit.idPermit}/view/optional`;
      }

      // ✅ RESPONDER INMEDIATAMENTE - PDF se generará en background
      console.log(`Enviando respuesta exitosa para Budget ID ${newBudgetId} - PDF se generará en background`);
      res.status(201).json({
        ...responseData,
        message: 'Presupuesto creado exitosamente. El PDF se está generando en segundo plano.',
        budgetPdfUrl: `${req.protocol}://${req.get('host')}/budgets/${newBudgetId}/pdf`
      });

      // ✅ GENERAR PDF Y ENVIAR NOTIFICACIONES EN BACKGROUND (NO BLOQUEAR RESPUESTA)
      setImmediate(async () => {
          try {
            console.log(`🔄 Iniciando proceso en background para Budget ID ${newBudgetId}...`);
          
          // Necesitamos los datos completos del budget recién creado
          const budgetForPdf = await Budget.findByPk(newBudgetId, {
            attributes: [
              'idBudget', 'propertyAddress', 'applicantName', 'date', 'expirationDate',
              'initialPayment', 'status', 'paymentInvoice', 'paymentProofType',
              'discountDescription', 'discountAmount', 'subtotalPrice', 'totalPrice',
              'generalNotes', 'pdfPath', 'PermitIdPermit', 'createdAt', 'updatedAt',
              'initialPaymentPercentage'
            ],
            include: [
              { model: Permit, attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'permitNumber', 'lot', 'block'] }
            ]
          });

          if (!budgetForPdf) {
            throw new Error("No se encontró el budget para generar PDF en background.");
          }

          const budgetDataForPdf = {
            ...budgetForPdf.toJSON(),
            lineItems: createdLineItemsForPdf
          };

          console.log(`📄 Generando PDF para Budget ID ${newBudgetId}...`);
          const generatedPdfPath = await generateAndSaveBudgetPDF(budgetDataForPdf);
          
          // ✅ CONVERTIR RUTA LOCAL A URL PÚBLICA
          const pdfPublicUrl = getPublicPdfUrl(generatedPdfPath, req);
          console.log(`✅ PDF generado: ${generatedPdfPath}`);
          console.log(`🔗 URL pública: ${pdfPublicUrl}`);

          // Actualizar el registro Budget con la URL pública
          await budgetForPdf.update({ pdfPath: pdfPublicUrl });
          console.log(`💾 Ruta del PDF actualizada para Budget ID ${newBudgetId}`);

          // ✅ PREPARAR Y ENVIAR NOTIFICACIONES
          const attachments = [];
          if (generatedPdfPath && fs.existsSync(generatedPdfPath)) {
            attachments.push({
              filename: `Budget_${newBudgetId}.pdf`,
              path: generatedPdfPath,
              contentType: 'application/pdf'
            });
          }

          const budgetLink = "https://www.zurcherseptic.com/budgets";
          const notificationDetails = {
            propertyAddress: permit.propertyAddress,
            idBudget: newBudgetId,
            applicantEmail: permit.applicantEmail || null,
            budgetLink,
            attachments
          };

          console.log(`📧 Enviando notificaciones para Budget ID ${newBudgetId}...`);
          await sendNotifications('budgetCreated', notificationDetails, null, req.io);
          console.log(`✅ Proceso en background completado para Budget ID ${newBudgetId}`);

        } catch (backgroundError) {
          console.error(`❌ Error en proceso background para Budget ID ${newBudgetId}:`, backgroundError);
          
          // ✅ ENVIAR NOTIFICACIÓN DE ERROR AL STAFF
          try {
            const errorNotificationDetails = {
              propertyAddress: permit.propertyAddress,
              idBudget: newBudgetId,
              error: backgroundError.message,
              applicantEmail: permit.applicantEmail || null
            };
            await sendNotifications('budgetPdfError', errorNotificationDetails, null, req.io);
          } catch (notifError) {
            console.error(`❌ Error enviando notificación de error:`, notifError);
          }
        }
      });

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

      // Verificar que el archivo PDF existe físicamente, si no, generarlo
      if (!fs.existsSync(localPdfPath)) {
        console.warn(`⚠️  ADVERTENCIA: Archivo PDF no existe en la ruta: ${localPdfPath}`);
        console.log('🔄 Generando PDF antes de enviar a SignNow...');
        
        try {
          const regeneratedPdfPath = await generateAndSaveBudgetPDF(budget.toJSON());
          console.log(`✅ PDF regenerado exitosamente: ${regeneratedPdfPath}`);
          
          // Actualizar la ruta del PDF en la base de datos
          await budget.update({ pdfPath: regeneratedPdfPath }, { transaction });
          
          // Actualizar localPdfPath para usarlo en SignNow
          if (regeneratedPdfPath.startsWith('http')) {
            const newPdfFileName = regeneratedPdfPath.split('/').pop();
            localPdfPath = path.join(__dirname, '..', 'uploads', 'budgets', newPdfFileName);
          } else {
            localPdfPath = regeneratedPdfPath;
          }
        } catch (pdfError) {
          console.error('❌ ERROR al generar PDF:', pdfError);
          await transaction.rollback();
          return res.status(500).json({
            error: true,
            message: 'Error al generar el archivo PDF para firma'
          });
        }
      }

      console.log(`✅ Archivo PDF existe, tamaño: ${fs.statSync(localPdfPath).size} bytes`);

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

      // 📧 ENVIAR EMAIL AL CLIENTE CON PDF Y LINK DE PAGO
      console.log('📧 Enviando email al cliente con presupuesto y link de pago...');
      
      if (budget.Permit.applicantEmail.includes('@')) {
        const clientMailOptions = {
          to: budget.Permit.applicantEmail,
          subject: `Budget Proposal #${idBudget} for ${budget.Permit.propertyAddress || budget.propertyAddress}`,
          text: `Dear ${budget.Permit.applicantName || 'Customer'},\n\nPlease find attached the budget proposal #${idBudget} for the property located at ${budget.Permit.propertyAddress || budget.propertyAddress}.\n\nExpiration Date: ${budget.expirationDate ? new Date(budget.expirationDate).toLocaleDateString() : 'N/A'}\nTotal Amount: $${parseFloat(budget.totalPrice || 0).toFixed(2)}\nInitial Payment (${budget.initialPaymentPercentage || 60}%): $${parseFloat(budget.initialPayment || 0).toFixed(2)}\n\n${budget.generalNotes ? 'Notes:\n' + budget.generalNotes + '\n\n' : ''}NEXT STEPS:\n- Review the attached PDF carefully\n- You will receive a separate email from SignNow to digitally sign the document\n- After signing, you can proceed with the initial payment\n- If you have any questions, please contact us\n\nBest regards,\nZurcher Construction`,
          html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d; margin-bottom: 20px;">Budget Proposal Ready for Review</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Dear ${budget.Permit?.applicantName || 'Valued Customer'},
          </p>
          
          <p style="margin-bottom: 20px;">
            Please find attached your budget proposal <strong>#${idBudget}</strong> for the property located at <strong>${budget.Permit?.propertyAddress || budget.propertyAddress}</strong>.
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
              <strong>You will receive a separate email from SignNow</strong> to digitally sign the document
            </div>
            <div style="margin-bottom: 12px;">
              <span style="display: inline-block; width: 20px; color: #007bff;">3.</span>
              <strong>After signing, you can proceed with the initial payment</strong>
            </div>
            <div style="margin-bottom: 0;">
              <span style="display: inline-block; width: 20px; color: #007bff;">4.</span>
              <strong>Contact us</strong> if you have any questions
            </div>
          </div>
          
          <p style="margin-top: 30px; margin-bottom: 30px;">
            Thank you for choosing <strong>Zurcher Construction</strong>!
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #dee2e6; text-align: center;">
            <div style="color: #6c757d; font-size: 14px;">
              <strong style="color: #1a365d;">Zurcher Septic</strong><br>
              SEPTIC TANK DIVISION - CFC1433240<br>
              📧 Contact: [admin@zurcherseptic.com] | 📞 [+1 (407) 419-4495]<br>
              🌐 Professional Septic Installation & Maintenance
            </div>
          </div>
        </div>
      </div>
    `,
          attachments: [{
            filename: `budget_${idBudget}.pdf`,
            path: localPdfPath,
            contentType: 'application/pdf'
          }],
        };

        try {
          console.log(`Intentando enviar correo con PDF al cliente: ${budget.Permit.applicantEmail}`);
          const clientEmailResult = await sendEmail(clientMailOptions);
          
          if (clientEmailResult.success) {
            console.log(`✅ Correo con PDF enviado exitosamente al cliente en ${clientEmailResult.duration}ms.`);
          } else {
            console.error(`❌ Error al enviar correo con PDF al cliente: ${clientEmailResult.error}`);
          }
        } catch (clientEmailError) {
          console.error(`❌ Error al enviar correo con PDF al cliente ${budget.Permit.applicantEmail}:`, clientEmailError);
          // No fallar la operación, continuar con SignNow
        }
      }

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
        localPdfPath,
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
      console.log(`--- Descargando PDF firmado desde SignNow para presupuesto ${idBudget} ---`);
      // Buscar el presupuesto
      const budget = await Budget.findByPk(idBudget);
      if (!budget) {
        return res.status(404).json({ error: true, message: 'Presupuesto no encontrado' });
      }
      if (!budget.signNowDocumentId) {
        return res.status(400).json({ error: true, message: 'Este presupuesto no ha sido enviado para firma' });
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
      const fs = require('fs');
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'signed-budgets');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const signedFileName = `Budget_${budget.idBudget}_signed.pdf`;
      const signedFilePath = path.join(uploadsDir, signedFileName);
      // Descargar SIEMPRE el PDF firmado más reciente desde SignNow
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
          console.error('Error enviando archivo firmado:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: true, message: 'Error descargando archivo firmado' });
          }
        }
      });
    } catch (error) {
      console.error('❌ Error descargando documento firmado:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: 'Error descargando documento firmado',
          details: error.message
        });
      }
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



async getBudgets(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const { search, status, month, year } = req.query;

    const whereClause = {};
    const includeWhereClause = {};

     if (search && search.trim()) {
      whereClause[Op.or] = [
        { applicantName: { [Op.iLike]: `%${search.trim()}%` } },
        { propertyAddress: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    // Filtro por status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Filtro por mes
    if (month && month !== 'all') {
      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push(
          literal(`EXTRACT(MONTH FROM "Budget"."date") = ${monthNum}`)
        );
      }
    }

    // Filtro por año
    if (year && year !== 'all') {
      const yearNum = parseInt(year);
      if (yearNum > 2020 && yearNum <= new Date().getFullYear() + 1) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push(
          literal(`EXTRACT(YEAR FROM "Budget"."date") = ${yearNum}`)
        );
      }
    }

    const { rows: budgetsInstances, count: totalBudgets } = await Budget.findAndCountAll({
      where: whereClause, // ✅ AGREGAR EL WHERE CLAUSE
      include: [
        {
          model: Permit,
          attributes: ['idPermit', 'propertyAddress', 'systemType', 'expirationDate', 'applicantEmail',  'applicantPhone', 'applicantName', 'permitNumber', 'lot', 'block', 'pdfData', 'optionalDocs'],
        }
      ],
      order: [['date', 'DESC']],
      limit: pageSize,
      offset,
      attributes: [
        'idBudget', 'date', 'expirationDate', 'status', 'applicantName', 'propertyAddress',
        'subtotalPrice', 'totalPrice', 'initialPayment', 'initialPaymentPercentage', 'pdfPath',
        'isLegacy', // Campo para identificar legacy budgets
        'legacySignedPdfUrl', // URL de Cloudinary del PDF firmado para trabajos legacy
        'legacySignedPdfPublicId' // Public ID de Cloudinary
      ]
    });

    const budgetsWithDetails = budgetsInstances.map(budgetInstance => {
      const budgetJson = budgetInstance.toJSON();

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

        // DEBUG: Log para verificar contenido ANTES de procesar
  if (budgetJson.isLegacy) {
    console.log(`🔍 DEBUG Legacy Budget ${budgetJson.idBudget} (ANTES):`, {
      hasPermit: !!budgetJson.Permit,
      permitKeys: budgetJson.Permit ? Object.keys(budgetJson.Permit) : 'NO_PERMIT',
      pdfData: budgetJson.Permit?.pdfData ? `HAS_URL(${typeof budgetJson.Permit.pdfData})` : 'NO_DATA',
      optionalDocs: budgetJson.Permit?.optionalDocs ? `HAS_URL(${typeof budgetJson.Permit.optionalDocs})` : 'NO_DATA',
      pdfPath: budgetJson.pdfPath ? 'HAS_PATH' : 'NO_PATH',
      legacySignedPdfUrl: budgetJson.legacySignedPdfUrl ? `HAS_LEGACY_URL(${budgetJson.legacySignedPdfUrl})` : 'NO_LEGACY_URL'
    });
  }

  if (budgetJson.Permit) {
    // Para legacy budgets, también considerar archivos PDF en el sistema
    // Para legacy budgets, pdfData y optionalDocs contienen rutas de archivos
    // Para budgets normales, contienen datos binarios BLOB
    
    budgetJson.Permit.hasPermitPdfData = !!budgetJson.Permit.pdfData;
    budgetJson.Permit.hasOptionalDocs = !!budgetJson.Permit.optionalDocs;
    
    // Opcional: eliminar los campos pesados si por error llegan
    delete budgetJson.Permit.pdfData;
    delete budgetJson.Permit.optionalDocs;
  }

  // Para presupuestos legacy, marcar si tiene PDF firmado
  if (budgetJson.isLegacy) {
    console.log(`✅ LEGACY BUDGET DETECTADO: ${budgetJson.idBudget}`, {
      applicantName: budgetJson.applicantName,
      propertyAddress: budgetJson.propertyAddress,
      status: budgetJson.status,
      hasLegacyPdfUrl: !!budgetJson.legacySignedPdfUrl,
      legacyPdfUrl: budgetJson.legacySignedPdfUrl,
      isLegacy: budgetJson.isLegacy
    });
    budgetJson.hasLegacySignedPdf = !!budgetJson.legacySignedPdfUrl;
    // Mantener la URL para que el frontend pueda acceder directamente
    // No eliminamos legacySignedPdfUrl porque es solo una URL
    
    console.log(`🔗 Enviando al frontend:`, {
      budgetId: budgetJson.idBudget,
      hasLegacySignedPdf: budgetJson.hasLegacySignedPdf,
      legacySignedPdfUrl: budgetJson.legacySignedPdfUrl ? 'URL_PRESENTE' : 'URL_AUSENTE'
    });
  }

        // Transformar pdfPath a budgetPdfUrl
        if (budgetJson.pdfPath) {
        budgetJson.budgetPdfUrl = `${req.protocol}://${req.get('host')}/budgets/${budgetJson.idBudget}/pdf`;
      } else {
        budgetJson.budgetPdfUrl = null;
      }
      return budgetJson;
    });

    res.status(200).json({
      budgets: budgetsWithDetails,
      total: totalBudgets,
      page,
      pageSize
    });

  } catch (error) {
    console.error("Error fetching budgets:", error);
    res.status(500).json({ error: 'Error al obtener los presupuestos.' });
  }
},

async permitPdf(req, res) {
  try {
    const { idBudget } = req.params;
    const budget = await Budget.findByPk(idBudget, {
      include: [{ model: Permit, attributes: ['pdfData', 'idPermit', 'isLegacy'] }],
      attributes: ['idBudget', 'isLegacy']
    });

    if (!budget || !budget.Permit) {
      return res.status(404).json({ error: 'Presupuesto o permiso no encontrado.' });
    }

    const pdfData = budget.Permit.pdfData;
    if (!pdfData) {
      return res.status(404).json({ error: 'No hay PDF de permiso asociado a este presupuesto.' });
    }

    // --- DETECTAR SI ES RUTA DE ARCHIVO (LEGACY) O BLOB (NORMAL) ---
    const isLegacy = budget.isLegacy || budget.Permit.isLegacy;
    
    // DEBUG: Log para permitPdf
    console.log(`🔍 DEBUG permitPdf Budget ${budget.idBudget}:`, {
      isLegacy,
      pdfDataType: typeof pdfData,
      pdfDataPreview: typeof pdfData === 'string' ? pdfData.substring(0, 100) : 'BUFFER_OR_OTHER'
    });
    
    // Si es legacy y pdfData es una URL de Cloudinary (string o Buffer), redirigir
    let cloudinaryUrl = null;
    
    if (isLegacy && typeof pdfData === 'string' && pdfData.includes('cloudinary.com')) {
      cloudinaryUrl = pdfData;
    } else if (isLegacy && Buffer.isBuffer(pdfData)) {
      // Convertir Buffer a string para ver si es una URL de Cloudinary
      const bufferString = pdfData.toString('utf8');
      if (bufferString.includes('cloudinary.com')) {
        cloudinaryUrl = bufferString;
      }
    }
    
    if (cloudinaryUrl) {
      console.log(`🔗 Redirigiendo a Cloudinary URL para permitPdf: ${cloudinaryUrl}`);
      return res.redirect(cloudinaryUrl);
    }
    
    if (isLegacy && typeof pdfData === 'string' && !pdfData.startsWith('data:')) {
      // Es un legacy budget con ruta de archivo
      const fs = require('fs');
      const path = require('path');
      
      try {
        // Construir la ruta completa del archivo
        const fullPath = path.resolve(pdfData);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Archivo PDF no encontrado en el sistema.' });
        }
        
        // Leer el archivo y enviarlo
        const fileBuffer = fs.readFileSync(fullPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="permit_${budget.idBudget}.pdf"`);
        return res.send(fileBuffer);
        
      } catch (fileError) {
        console.error('Error al leer archivo PDF:', fileError);
        return res.status(500).json({ error: 'Error al acceder al archivo PDF.' });
      }
    }
    
    // --- LÓGICA PARA BUDGETS NORMALES (BLOB) ---
    // Determinar el tipo de dato y devolver como PDF
    let buffer;
    if (Buffer.isBuffer(pdfData)) {
      buffer = pdfData;
    } else if (pdfData.type === 'Buffer' && Array.isArray(pdfData.data)) {
      buffer = Buffer.from(pdfData.data);
    } else if (typeof pdfData === 'string') {
      buffer = Buffer.from(pdfData, 'base64');
    } else {
      return res.status(500).json({ error: 'Formato de PDF no soportado.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="permit_${budget.Permit.idPermit}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error al servir el PDF de permiso:', error);
    res.status(500).json({ error: 'Error interno al servir el PDF de permiso.' });
  }
},

// Descargar los documentos opcionales del permiso asociado a un presupuesto
async optionalDocs(req, res) {
  try {
    const { idBudget } = req.params;
    const budget = await Budget.findByPk(idBudget, {
      include: [{ model: Permit, attributes: ['optionalDocs', 'idPermit', 'isLegacy'] }],
      attributes: ['idBudget', 'isLegacy']
    });

    if (!budget || !budget.Permit) {
      return res.status(404).json({ error: 'Presupuesto o permiso no encontrado.' });
    }

    const optionalDocs = budget.Permit.optionalDocs;
    if (!optionalDocs) {
      return res.status(404).json({ error: 'No hay documentos opcionales asociados a este presupuesto.' });
    }

    // --- DETECTAR SI ES RUTA DE ARCHIVO (LEGACY) O BLOB (NORMAL) ---
    const isLegacy = budget.isLegacy || budget.Permit.isLegacy;
    
    // DEBUG: Log para optionalDocs
    console.log(`🔍 DEBUG optionalDocs Budget ${budget.idBudget}:`, {
      isLegacy,
      optionalDocsType: typeof optionalDocs,
      optionalDocsPreview: typeof optionalDocs === 'string' ? optionalDocs.substring(0, 100) : 'BUFFER_OR_OTHER',
      optionalDocsValue: optionalDocs,
      isCloudinaryString: typeof optionalDocs === 'string' && optionalDocs.includes('cloudinary.com')
    });
    
    // Si es legacy y optionalDocs es una URL de Cloudinary (string o Buffer), redirigir
    let cloudinaryUrl = null;
    
    if (isLegacy && typeof optionalDocs === 'string' && optionalDocs.includes('cloudinary.com')) {
      cloudinaryUrl = optionalDocs;
    } else if (isLegacy && Buffer.isBuffer(optionalDocs)) {
      // Convertir Buffer a string para ver si es una URL de Cloudinary
      const bufferString = optionalDocs.toString('utf8');
      if (bufferString.includes('cloudinary.com')) {
        cloudinaryUrl = bufferString;
      }
    }
    
    if (cloudinaryUrl) {
      console.log(`🔗 Redirigiendo a Cloudinary URL para optionalDocs: ${cloudinaryUrl}`);
      return res.redirect(cloudinaryUrl);
    }
    
    if (isLegacy && typeof optionalDocs === 'string' && !optionalDocs.startsWith('data:')) {
      // Es un legacy budget con información JSON de archivos
      const fs = require('fs');
      const path = require('path');
      
      try {
        // optionalDocs contiene un JSON string: [{ name, path, type }]
        const optionalDocsArray = JSON.parse(optionalDocs);
        
        // Por simplicidad, tomar el primer documento (puedes expandir para múltiples)
        const firstDoc = optionalDocsArray[0];
        if (!firstDoc || !firstDoc.path) {
          return res.status(404).json({ error: 'No hay documentos opcionales válidos.' });
        }
        
        // Construir la ruta completa del archivo
        const fullPath = path.resolve(firstDoc.path);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Archivo PDF opcional no encontrado en el sistema.' });
        }
        
        // Leer el archivo y enviarlo
        const fileBuffer = fs.readFileSync(fullPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${firstDoc.name || `optional_${budget.idBudget}.pdf`}"`);
        return res.send(fileBuffer);
        
      } catch (fileError) {
        console.error('Error al leer archivo PDF opcional:', fileError);
        return res.status(500).json({ error: 'Error al acceder al archivo PDF opcional.' });
      }
    }
    
    // --- LÓGICA PARA BUDGETS NORMALES (BLOB) ---

    // Determinar el tipo de dato y devolver como PDF
    let buffer;
    if (Buffer.isBuffer(optionalDocs)) {
      buffer = optionalDocs;
    } else if (optionalDocs.type === 'Buffer' && Array.isArray(optionalDocs.data)) {
      buffer = Buffer.from(optionalDocs.data);
    } else if (typeof optionalDocs === 'string') {
      buffer = Buffer.from(optionalDocs, 'base64');
    } else {
      return res.status(500).json({ error: 'Formato de PDF no soportado.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="optional_docs_${budget.Permit.idPermit}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error al servir los documentos opcionales:', error);
    res.status(500).json({ error: 'Error interno al servir los documentos opcionales.' });
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
            attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'applicantPhone', 'permitNumber', 'lot', 'block', 'expirationDate'] // Incluir campos necesarios para PDF
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
        applicantEmail,
        applicantPhone,
        propertyAddress,
        discountDescription,
        discountAmount,
        generalNotes,
        initialPaymentPercentage: initialPaymentPercentageInput,
        lineItems,
        paymentMethod // 🆕 Extraer método de pago
      } = req.body;

      // --- 3. Validaciones Preliminares ---
      const hasGeneralUpdates = date || expirationDate !== undefined || status || applicantName || applicantEmail || applicantPhone || propertyAddress || discountDescription !== undefined || discountAmount !== undefined || generalNotes !== undefined || initialPaymentPercentageInput !== undefined; // Corregido: initialPaymentPercentageInput
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

      // --- 4.5. Actualizar Permit asociado si es necesario ---
      if (applicantName || applicantEmail || applicantPhone || propertyAddress) {
        const permitUpdateData = {};
        if (applicantName) permitUpdateData.applicantName = applicantName;
        if (applicantEmail) permitUpdateData.applicantEmail = applicantEmail;
        if (applicantPhone) permitUpdateData.applicantPhone = applicantPhone;
        if (propertyAddress) permitUpdateData.propertyAddress = propertyAddress;

        // Buscar el Permit asociado si no está incluido en el budget
        if (!budget.Permit) {
          const budgetWithPermit = await Budget.findByPk(idBudget, {
            include: [{ model: Permit }],
            transaction
          });
          budget.Permit = budgetWithPermit?.Permit;
        }

        if (budget.Permit && Object.keys(permitUpdateData).length > 0) {
          await budget.Permit.update(permitUpdateData, { transaction });
          console.log(`✅ Permit ${budget.Permit.idPermit} actualizado desde updateBudget:`, permitUpdateData);
        }
      }

      // --- 5. Sincronizar BudgetLineItems (Eliminar y Recrear si se enviaron nuevos) ---
      let calculatedSubtotal = 0;
      let finalLineItemsForPdf = []; // Array para guardar los items que irán al PDF

      if (hasLineItemUpdates) {
        console.log("Sincronizando Line Items (Eliminar y Recrear)...");
        await BudgetLineItem.destroy({ where: { budgetId: idBudget }, transaction });
        console.log(`Items existentes para Budget ID ${idBudget} eliminados.`);

        const createdLineItems = [];
        for (const incomingItem of lineItems) {

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
            itemDataForCreation.supplierName = incomingItem.supplierName || budgetItemDetails.supplierName || null; // ✅ AGREGAR SUPPLIERNAME
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
            itemDataForCreation.supplierName = incomingItem.supplierName || null; // ✅ AGREGAR SUPPLIERNAME PARA ITEMS MANUALES
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
      const calculatedInitialPayment = finalTotal * (percentageForCalculation / 100);
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
                  <strong style="color: #1a365d;">Zurcher Septic</strong><br>
                  SEPTIC TANK DIVISION - CFC1433240<br>
                  📧 Contact: [admin@zurcherseptic.com] | 📞 [+1 (407) 419-4495]<br>
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
              const clientEmailResult = await sendEmail(clientMailOptions);
              
              if (clientEmailResult.success) {
                console.log(`✅ Correo con PDF e información de SignNow enviado exitosamente al cliente en ${clientEmailResult.duration}ms.`);
              } else {
                console.error(`❌ Error al enviar correo con PDF al cliente: ${clientEmailResult.error}`);
              }
            } catch (clientEmailError) {
              console.error(`❌ Error al enviar correo con PDF al cliente ${budget.Permit.applicantEmail}:`, clientEmailError);
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
            initialPayment: actualInitialPaymentAmount,
            staffId: req.user?.id  // Agregar staffId
          }, { transaction });

          try {
            console.log(`Creando nuevo Income para Work ID: ${workRecord.idWork}`);
            const createdIncome = await Income.create({
              date: new Date(),
              amount: actualInitialPaymentAmount,
              typeIncome: 'Factura Pago Inicial Budget',
              notes: `Pago inicial registrado al aprobar Budget #${budget.idBudget}`,
              workId: workRecord.idWork,
              staffId: req.staff?.id,  // Cambiar req.user por req.staff
              paymentMethod: budget.paymentProofMethod || paymentMethod || null, // 🆕 Usar método del Budget
              verified: false // 🆕 Por defecto no verificado
            }, { transaction });
            console.log(`Nuevo Income creado exitosamente con datos:`, {
              idIncome: createdIncome.idIncome,
              amount: createdIncome.amount,
              paymentMethod: createdIncome.paymentMethod,
              verified: createdIncome.verified
            });
            
            // 🚀 NOTIFICACIÓN DE INGRESO DESDE BUDGET
            setImmediate(async () => {
              try {
                const notificationData = {
                  ...createdIncome.toJSON(),
                  propertyAddress: budget.propertyAddress || workRecord.propertyAddress || 'Obra no especificada',
                  Staff: { name: 'Sistema - Aprobación Budget' }
                };
                await sendNotifications('incomeRegistered', notificationData);
                console.log(`✅ Notificación de pago inicial enviada: $${actualInitialPaymentAmount} - Budget #${budget.idBudget}`);
              } catch (notificationError) {
                console.error('❌ Error enviando notificación de pago inicial:', notificationError.message);
              }
            });
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
              const createdLateIncome = await Income.create({
                date: new Date(),
                amount: actualInitialPaymentAmount,
                typeIncome: 'Factura Pago Inicial Budget',
                notes: `Pago inicial (tardío) registrado al aprobar Budget #${budget.idBudget}`,
                workId: workRecord.idWork,
                staffId: req.staff?.id, // Cambiar req.user por req.staff
                paymentMethod: budget.paymentProofMethod || paymentMethod || null, // 🆕 Usar método del Budget
                verified: false // 🆕 Por defecto no verificado
              }, { transaction });
              console.log(`Income (tardío) creado exitosamente.`);
              
              // 🚀 NOTIFICACIÓN DE INGRESO TARDÍO DESDE BUDGET
              setImmediate(async () => {
                try {
                  const notificationData = {
                    ...createdLateIncome.toJSON(),
                    propertyAddress: budget.propertyAddress || workRecord.propertyAddress || 'Obra no especificada',
                    Staff: { name: 'Sistema - Budget Tardío' }
                  };
                  await sendNotifications('incomeRegistered', notificationData);
                  console.log(`✅ Notificación de pago tardío enviada: $${actualInitialPaymentAmount} - Budget #${budget.idBudget}`);
                } catch (notificationError) {
                  console.error('❌ Error enviando notificación de pago tardío:', notificationError.message);
                }
              });
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
      const { uploadedAmount, paymentMethod } = req.body; // 🆕 Agregar paymentMethod

      // Verificar si el archivo fue recibido
      console.log("ID del presupuesto recibido:", idBudget);
      console.log("Archivo recibido:", req.file);
      console.log("Monto del comprobante recibido (uploadedAmount):", uploadedAmount); // <--- Nuevo log
      console.log("Método de pago recibido (paymentMethod):", paymentMethod); // 🆕 Nuevo log

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

      // ✅ VALIDAR: Estados permitidos para carga de comprobante de pago inicial
      const allowedStatesForPayment = [
        'created',
        'send',
        'sent_for_signature',
        'signed',
        'client_approved',
        'pending_review'
      ];

      if (!allowedStatesForPayment.includes(budget.status)) {
        console.warn(`Intento de cargar comprobante en estado no permitido: ${budget.status}`);
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id, {
            resource_type: uploadResult.resource_type || (proofType === 'pdf' ? 'raw' : 'image')
          });
        } catch (e) {
          console.error("Error al eliminar archivo de Cloudinary:", e);
        }
        await transaction.rollback();
        return res.status(400).json({ 
          error: `No se puede cargar el comprobante de pago en el estado actual: "${budget.status}". Estados permitidos: ${allowedStatesForPayment.join(', ')}` 
        });
      }
      console.log(`✅ Estado del presupuesto válido para carga de pago: ${budget.status}`);

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
      // 🆕 GUARDAR MÉTODO DE PAGO
      if (paymentMethod) {
        budget.paymentProofMethod = paymentMethod;
        console.log("Método de pago guardado en Budget:", paymentMethod);
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
              staffId: req.user?.id,
              paymentMethod: paymentMethod || null, // 🆕 Agregar método de pago
              verified: false // 🆕 Por defecto no verificado
            }, { transaction });

            console.log(`Nuevo Income creado: ${relatedIncome.idIncome}`);
            
            // 🚀 NOTIFICACIÓN DE INCOME RECREADO DESDE BUDGET
            setImmediate(async () => {
              try {
                const notificationData = {
                  ...relatedIncome.toJSON(),
                  propertyAddress: budget.propertyAddress || existingWork.propertyAddress || 'Obra no especificada',
                  Staff: { name: 'Sistema - Budget Recreación' }
                };
                await sendNotifications('incomeRegistered', notificationData);
                console.log(`✅ Notificación de income recreado enviada: $${amountForIncome} - Budget #${budget.idBudget}`);
              } catch (notificationError) {
                console.error('❌ Error enviando notificación de income recreado:', notificationError.message);
              }
            });
          } else {
            // ✅ ACTUALIZAR Income existente si el monto cambió
            const newAmount = parsedUploadedAmount || relatedIncome.amount;
            if (parseFloat(relatedIncome.amount) !== parseFloat(newAmount)) {
              await relatedIncome.update({
                amount: newAmount,
                date: new Date(),
                notes: `Pago inicial actualizado para Budget #${budget.idBudget}`,
                staffId: req.user?.id,
                paymentMethod: paymentMethod || relatedIncome.paymentMethod // 🆕 Actualizar método de pago si se proporciona
              }, { transaction });
              console.log(`Income actualizado con nuevo monto: ${newAmount}`);
            } else if (paymentMethod && paymentMethod !== relatedIncome.paymentMethod) {
              // 🆕 Actualizar solo el método de pago si cambió
              await relatedIncome.update({
                paymentMethod: paymentMethod
              }, { transaction });
              console.log(`Income actualizado con nuevo método de pago: ${paymentMethod}`);
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
    const transaction = await conn.transaction();
    
    try {
      const { idBudget } = req.params;

      // Diferir la verificación de constraints FK hasta el commit
      await conn.query('SET CONSTRAINTS ALL DEFERRED', { transaction });

      // Buscar el presupuesto con todas sus relaciones incluyendo Permit
      const budget = await Budget.findByPk(idBudget, {
        include: [
          { model: BudgetLineItem, as: 'lineItems' },
          { model: Work },
          { model: Permit, as: 'Permit' } // 🆕 Incluir Permit
        ],
        transaction
      });

      if (!budget) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // 🆕 VALIDACIÓN: Si tiene Works asociados, NO permitir eliminación directa
      if (budget.Works && budget.Works.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'No se puede eliminar el presupuesto porque tiene proyectos (Works) asociados',
          message: 'Para eliminar este presupuesto, primero debes eliminar todos los proyectos (Works) asociados a él.',
          workCount: budget.Works.length,
          works: budget.Works.map(w => ({
            idWork: w.idWork,
            address: w.address,
            status: w.status
          }))
        });
      }

      console.log(`🗑️ Eliminando Budget #${idBudget}...`);

      // 1. Eliminar PDFs de Cloudinary si existen
      const cloudinaryDeletes = [];
      
      if (budget.legacySignedPdfPublicId) {
        console.log(`Eliminando PDF legacy de Cloudinary: ${budget.legacySignedPdfPublicId}`);
        cloudinaryDeletes.push(
          cloudinary.uploader.destroy(budget.legacySignedPdfPublicId, { resource_type: 'raw' })
            .catch(err => console.warn(`Error eliminando PDF legacy:`, err.message))
        );
      }

      // 2. Eliminar comprobante de pago inicial de Cloudinary si existe
      if (budget.paymentInvoice && budget.paymentInvoice.includes('cloudinary')) {
        const publicId = budget.paymentInvoice.split('/').slice(-2).join('/').split('.')[0];
        console.log(`Eliminando comprobante de pago de Cloudinary: ${publicId}`);
        cloudinaryDeletes.push(
          cloudinary.uploader.destroy(publicId, { 
            resource_type: budget.paymentProofType === 'pdf' ? 'raw' : 'image' 
          }).catch(err => console.warn(`Error eliminando comprobante:`, err.message))
        );
      }

      // 🆕 3. Eliminar PDFs del Permit de Cloudinary si existen (si es legacy)
      if (budget.Permit && budget.Permit.isLegacy) {
        if (budget.Permit.pdfPublicId) {
          console.log(`Eliminando PDF del Permit de Cloudinary: ${budget.Permit.pdfPublicId}`);
          cloudinaryDeletes.push(
            cloudinary.uploader.destroy(budget.Permit.pdfPublicId, { resource_type: 'raw' })
              .catch(err => console.warn(`Error eliminando PDF del Permit:`, err.message))
          );
        }
        if (budget.Permit.optionalDocsPublicId) {
          console.log(`Eliminando OptionalDocs del Permit de Cloudinary: ${budget.Permit.optionalDocsPublicId}`);
          cloudinaryDeletes.push(
            cloudinary.uploader.destroy(budget.Permit.optionalDocsPublicId, { resource_type: 'raw' })
              .catch(err => console.warn(`Error eliminando OptionalDocs del Permit:`, err.message))
          );
        }
      }

      await Promise.all(cloudinaryDeletes);

      // 4. Eliminar archivos locales si existen
      if (budget.pdfPath && fs.existsSync(budget.pdfPath)) {
        fs.unlinkSync(budget.pdfPath);
        console.log(`Archivo local eliminado: ${budget.pdfPath}`);
      }

      if (budget.signedPdfPath && fs.existsSync(budget.signedPdfPath)) {
        fs.unlinkSync(budget.signedPdfPath);
        console.log(`PDF firmado eliminado: ${budget.signedPdfPath}`);
      }

      // 🆕 5. Guardar el ID del Permit para eliminarlo después
      const permitIdToDelete = budget.PermitIdPermit;

      // 6. Eliminar el Budget primero (trigger CASCADE para BudgetLineItems)
      // Nota: Esto NO eliminará Works porque Work.idBudget tiene ON DELETE SET NULL
      await budget.destroy({ transaction });
      console.log(`✅ Budget #${idBudget} eliminado`);

      // 7. Eliminar el Permit ahora que el Budget ya no existe
      if (permitIdToDelete) {
        console.log(`Eliminando Permit asociado: ${permitIdToDelete}`);
        await Permit.destroy({
          where: { idPermit: permitIdToDelete },
          transaction
        });
        console.log(`✅ Permit ${permitIdToDelete} eliminado exitosamente`);
      }

      await transaction.commit();
      console.log(`✅ Budget #${idBudget} y Permit eliminados exitosamente`);
      
      res.status(200).json({ 
        success: true, 
        message: `Presupuesto #${idBudget} eliminado junto con ${budget.lineItems?.length || 0} items${permitIdToDelete ? ' y su Permit asociado' : ''}` 
      });
    } catch (error) {
      await transaction.rollback();
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

  // ✅ MÉTODO DE DIAGNÓSTICO PARA SMTP EN PRODUCCIÓN

  // async diagnoseEmail(req, res) {
  //   try {
  //     console.log('🔍 Iniciando diagnóstico de email...');
      
  //     // ✅ VERIFICAR VARIABLES DE ENTORNO
  //     const smtpConfig = {
  //       host: process.env.SMTP_HOST,
  //       port: process.env.SMTP_PORT,
  //       secure: process.env.SMTP_SECURE,
  //       user: process.env.SMTP_USER ? '***configurado***' : 'NO CONFIGURADO',
  //       pass: process.env.SMTP_PASSWORD ? '***configurado***' : 'NO CONFIGURADO',
  //       from: process.env.SMTP_FROM,
  //       nodeEnv: process.env.NODE_ENV
  //     };
      
  //     console.log('📋 Configuración SMTP:', smtpConfig);
      
  //     // ✅ PROBAR CONEXIÓN
  //     const { sendEmail } = require('../utils/notifications/emailService');
      
  //     const testEmail = {
  //       to: process.env.OWNER_EMAIL || 'damian@zurcherseptic.com', // Email corporativo del owner
  //       subject: 'Test de diagnóstico SMTP - ZurcherAPI',
  //       text: `Test de diagnóstico realizado en ${new Date().toISOString()}\n\nConfiguración:\n${JSON.stringify(smtpConfig, null, 2)}`,
  //       html: `
  //         <h2>🔧 Test de Diagnóstico SMTP</h2>
  //         <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
  //         <p><strong>Entorno:</strong> ${process.env.NODE_ENV}</p>
  //         <p><strong>Host:</strong> ${process.env.SMTP_HOST}</p>
  //         <p><strong>Puerto:</strong> ${process.env.SMTP_PORT}</p>
  //         <p><strong>Seguro:</strong> ${process.env.SMTP_SECURE}</p>
  //       `
  //     };
      
  //     console.log('📤 Enviando email de prueba...');
  //     const result = await sendEmail(testEmail);
      
  //     if (result.success) {
  //       console.log('✅ Email de diagnóstico enviado exitosamente');
  //       res.json({
  //         success: true,
  //         message: 'Diagnóstico completado exitosamente',
  //         config: smtpConfig,
  //         testResult: result
  //       });
  //     } else {
  //       console.error('❌ Falló el email de diagnóstico:', result.error);
  //       res.status(500).json({
  //         success: false,
  //         message: 'Falló el envío del email de diagnóstico',
  //         config: smtpConfig,
  //         error: result.error
  //       });
  //     }
      
  //   } catch (error) {
  //     console.error('❌ Error en diagnóstico de email:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error en diagnóstico',
  //       error: error.message
  //     });
  //   }
  // }


  // ========== NUEVOS MÉTODOS PARA EDITAR DATOS DE CLIENTE ==========

  /**
   * Método para actualizar datos de cliente en Budget y Permit asociado
   * PATCH /api/budgets/:idBudget/client-data
   */
  async updateClientData(req, res) {
    const transaction = await conn.transaction();
    
    try {
      const { idBudget } = req.params;
      const { applicantName, applicantEmail, applicantPhone, propertyAddress } = req.body;

      // Validaciones básicas
      if (!applicantName && !applicantEmail && !applicantPhone && !propertyAddress) {
        return res.status(400).json({
          error: true,
          message: 'Se requiere al menos un campo para actualizar (applicantName, applicantEmail, applicantPhone, propertyAddress)'
        });
      }

      // Buscar el Budget con su Permit asociado
      const budget = await Budget.findByPk(idBudget, {
        include: [{
          model: Permit,
          attributes: ['idPermit', 'applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress']
        }],
        transaction
      });

      if (!budget) {
        await transaction.rollback();
        return res.status(404).json({
          error: true,
          message: 'Presupuesto no encontrado'
        });
      }

      // Preparar datos para actualizar en Budget
      const budgetUpdateData = {};
      if (applicantName) budgetUpdateData.applicantName = applicantName;
      if (propertyAddress) budgetUpdateData.propertyAddress = propertyAddress;

      // Preparar datos para actualizar en Permit
      const permitUpdateData = {};
      if (applicantName) permitUpdateData.applicantName = applicantName;
      if (applicantEmail) permitUpdateData.applicantEmail = applicantEmail;
      if (applicantPhone) permitUpdateData.applicantPhone = applicantPhone;
      if (propertyAddress) permitUpdateData.propertyAddress = propertyAddress;

      // Actualizar Budget si es necesario
      if (Object.keys(budgetUpdateData).length > 0) {
        await budget.update(budgetUpdateData, { transaction });
        console.log(`✅ Budget ${idBudget} actualizado:`, budgetUpdateData);
      }

      // Actualizar Permit si es necesario y existe
      if (budget.Permit && Object.keys(permitUpdateData).length > 0) {
        await budget.Permit.update(permitUpdateData, { transaction });
        console.log(`✅ Permit ${budget.Permit.idPermit} actualizado:`, permitUpdateData);
      }

      await transaction.commit();

      // Obtener el budget actualizado con los datos del permit
      const updatedBudget = await Budget.findByPk(idBudget, {
        include: [{
          model: Permit,
          attributes: ['idPermit', 'applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress', 'permitNumber']
        }]
      });

      res.status(200).json({
        success: true,
        message: 'Datos de cliente actualizados correctamente',
        data: {
          budget: {
            idBudget: updatedBudget.idBudget,
            applicantName: updatedBudget.applicantName,
            propertyAddress: updatedBudget.propertyAddress
          },
          permit: updatedBudget.Permit ? {
            idPermit: updatedBudget.Permit.idPermit,
            applicantName: updatedBudget.Permit.applicantName,
            applicantEmail: updatedBudget.Permit.applicantEmail,
            applicantPhone: updatedBudget.Permit.applicantPhone,
            propertyAddress: updatedBudget.Permit.propertyAddress
          } : null
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al actualizar datos de cliente:', error);
      res.status(500).json({
        error: true,
        message: 'Error interno del servidor al actualizar datos de cliente',
        details: error.message
      });
    }
  },

  /**
   * Método para obtener datos actuales de cliente de un Budget
   * GET /api/budgets/:idBudget/client-data
   */
  async getClientData(req, res) {
    try {
      const { idBudget } = req.params;

      const budget = await Budget.findByPk(idBudget, {
        attributes: ['idBudget', 'applicantName', 'propertyAddress', 'status', 'date'],
        include: [{
          model: Permit,
          attributes: ['idPermit', 'applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress', 'permitNumber']
        }]
      });

      if (!budget) {
        return res.status(404).json({
          error: true,
          message: 'Presupuesto no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          budget: {
            idBudget: budget.idBudget,
            applicantName: budget.applicantName,
            propertyAddress: budget.propertyAddress,
            status: budget.status,
            date: budget.date
          },
          permit: budget.Permit ? {
            idPermit: budget.Permit.idPermit,
            applicantName: budget.Permit.applicantName,
            applicantEmail: budget.Permit.applicantEmail,
            applicantPhone: budget.Permit.applicantPhone,
            propertyAddress: budget.Permit.propertyAddress,
            permitNumber: budget.Permit.permitNumber
          } : null
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener datos de cliente:', error);
      res.status(500).json({
        error: true,
        message: 'Error interno del servidor al obtener datos de cliente',
        details: error.message
      });
    }
  },

  // === 📥 IMPORTAR TRABAJO EXISTENTE (SIMPLIFICADO) ===
  async createLegacyBudget(req, res) {
    // Usar la función simplificada del ImportWorkController
    const { importExistingWork } = require('./ImportWorkController');
    return await importExistingWork(req, res);
  },

  // 🆕 FUNCIÓN LEGACY ANTERIOR (por si acaso se necesita)
  async createLegacyBudgetOLD(req, res) {
    const transaction = await conn.transaction();
    
    try {
      console.log("--- Iniciando createLegacyBudget (Migración de trabajos antiguos) ---");
      
      // Manejar archivos subidos y guardarlos temporalmente en disco
      const fs = require('fs');
      const path = require('path');
      
      const uploadedFiles = {
        permitPdf: req.files?.permitPdf?.[0] || null,
        budgetPdf: req.files?.budgetPdf?.[0] || null,
        optionalDocs: req.files?.optionalDocs?.[0] || null
      };
      
      console.log("📁 Archivos recibidos:", {
        permitPdf: !!uploadedFiles.permitPdf,
        budgetPdf: !!uploadedFiles.budgetPdf,
        optionalDocs: !!uploadedFiles.optionalDocs
      });
      
      // Función para guardar archivo de memoria a disco
      const saveBufferToFile = (file, subfolder) => {
        if (!file || !file.buffer) return null;
        
        const uploadsDir = path.join(__dirname, '../uploads/legacy', subfolder);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}_${sanitizedName}`;
        const filepath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filepath, file.buffer);
        return filepath;
      };
      
      // Guardar archivos en disco y generar rutas
      const filePaths = {
        permitPdfPath: uploadedFiles.permitPdf ? saveBufferToFile(uploadedFiles.permitPdf, 'permits') : null,
        budgetPdfPath: uploadedFiles.budgetPdf ? saveBufferToFile(uploadedFiles.budgetPdf, 'budgets') : null,
        optionalDocsPath: uploadedFiles.optionalDocs ? saveBufferToFile(uploadedFiles.optionalDocs, 'optional') : null
      };
      
      console.log("📁 Rutas de archivos generadas:", filePaths);
      
      const {
        // Datos del Permit
        permitNumber,
        propertyAddress,
        applicantName,
        applicantEmail,
        applicantPhone,
        lot,
        block,
        systemType,
        
        // Datos del Budget
        date,
        expirationDate,
        status = 'signed', // Por defecto firmado
        discountDescription,
        discountAmount = 0,
        generalNotes,
        initialPaymentPercentage = 60,
        lineItems,
        
        // 🆕 MODALIDAD SIMPLE (Presupuesto Firmado)
        isSimpleMode = false, // true = solo datos básicos, false = completo con items
        manualBudgetNumber, // Numeración manual para presupuestos firmados
        totalAmount, // Monto total cuando no hay line items
        
        // 🆕 CAMPOS PARA CONTINUAR EL FLUJO
        paymentProofAmount, // Monto ya pagado por el cliente
        paymentInvoice, // URL del comprobante de pago (opcional)
        paymentProofType, // 'pdf' o 'image'
        
        // Metadata de migración
        legacyId, // ID del sistema anterior (opcional)
        migrationNotes, // Notas sobre la migración
        isCompleted = false, // Si el trabajo ya fue completado
        
        // 🆕 ESTADO DEL TRABAJO (para trabajos en progreso)
        workStatus, // Estado del work si ya está en progreso
        workStartDate, // Fecha de inicio del trabajo (si aplica)
        workEndDate, // Fecha de finalización (si aplica)
        workNotes, // Notas específicas del trabajo
        
        // 🆕 CAMPOS PARA DOCUMENTOS LEGACY
        legacyPdfPath, // Ruta del PDF del presupuesto original
        legacyPermitPdfPath, // Ruta del PDF del permit
        legacyOptionalDocs // Array de documentos opcionales
      } = req.body;

      // Validaciones básicas
      if (!permitNumber) throw new Error('Número de permiso es requerido para trabajos legacy');
      if (!propertyAddress) throw new Error('Dirección de propiedad es requerida');
      if (!applicantName) throw new Error('Nombre del solicitante es requerido');
      
      // Validaciones según modalidad
      if (isSimpleMode) {
        // Modalidad simple: solo requiere monto total
        if (!totalAmount || parseFloat(totalAmount) <= 0) {
          throw new Error('Monto total es requerido para modalidad simple');
        }
      } else {
        // Modalidad completa: requiere line items
        if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
          throw new Error('Se requiere al menos un item en lineItems para modalidad completa');
        }
      }

      console.log("✅ Validaciones básicas pasadas");

      // 1. Crear el Permit primero
      const newPermit = await Permit.create({
        permitNumber,
        propertyAddress,
        applicantName,
        applicantEmail: applicantEmail || '',
        applicantPhone: applicantPhone || '',
        lot: lot || '',
        block: block || '',
        systemType: systemType || 'Legacy System',
        // Usar campos existentes para PDFs legacy
        pdfData: filePaths.permitPdfPath, // Ruta del archivo en lugar de BLOB
        optionalDocs: filePaths.optionalDocsPath ? JSON.stringify([{ 
          name: uploadedFiles.optionalDocs.originalname, 
          path: filePaths.optionalDocsPath, 
          type: uploadedFiles.optionalDocs.mimetype 
        }]) : null, // JSON string en lugar de BLOB
        // Campos específicos para migración
        isLegacy: true,
        migrationDate: new Date(),
        migrationNotes: migrationNotes || 'Migrado desde sistema anterior'
      }, { transaction });

      console.log("✅ Permit legacy creado:", newPermit.idPermit);

      // 2. Calcular totales según modalidad
      let subtotalPrice = 0;
      let totalPrice = 0;
      let processedLineItems = [];

      if (isSimpleMode) {
        // 📄 MODALIDAD SIMPLE: usar monto total directo
        const discountAmountNum = parseFloat(discountAmount) || 0;
        subtotalPrice = parseFloat(totalAmount);
        totalPrice = subtotalPrice - discountAmountNum;
        processedLineItems = []; // Sin line items en modalidad simple
        
        console.log("✅ Modalidad Simple - Cálculos:", { subtotalPrice, totalPrice, discount: discountAmountNum });
      } else {
        // 📋 MODALIDAD COMPLETA: calcular desde line items  
        for (const item of lineItems) {
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const lineTotal = quantity * unitPrice;
          subtotalPrice += lineTotal;

          processedLineItems.push({
            ...item,
            quantity,
            unitPrice,
            lineTotal
          });
        }

        const discountAmountNum = parseFloat(discountAmount) || 0;
        totalPrice = subtotalPrice - discountAmountNum;
        
        console.log("✅ Modalidad Completa - Cálculos:", { subtotalPrice, totalPrice, itemsCount: processedLineItems.length });
      }

      const initialPaymentNum = (totalPrice * (parseFloat(initialPaymentPercentage) / 100));
      const discountAmountNum = parseFloat(discountAmount) || 0; // Definir aquí para ambas modalidades

      // 3. Crear el Budget con datos de pago si existen
      const newBudget = await Budget.create({
        PermitIdPermit: newPermit.idPermit,
        propertyAddress,
        applicantName,
        date: date || new Date(),
        expirationDate: expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        status,
        discountDescription: discountDescription || '',
        discountAmount: discountAmountNum,
        generalNotes: generalNotes || '',
        initialPaymentPercentage: parseFloat(initialPaymentPercentage),
        subtotalPrice,
        totalPrice,
        initialPayment: initialPaymentNum,
        
        // 🆕 CAMPOS DE PAGO PARA CONTINUAR EL FLUJO
        paymentProofAmount: parseFloat(paymentProofAmount) || null,
        paymentInvoice: paymentInvoice || null,
        paymentProofType: paymentProofType || null,
        
        // Usar campo existente para PDF del budget
        pdfPath: filePaths.budgetPdfPath,
        
        // Campos específicos para migración
        isLegacy: true,
        legacyId: legacyId || null,
        migrationDate: new Date(),
        migrationNotes: migrationNotes || 'Presupuesto migrado desde sistema anterior',
        
        // 🆕 NUMERACIÓN MANUAL (no afecta consecutivo)
        manualBudgetNumber: manualBudgetNumber || null
      }, { transaction });

      console.log("✅ Budget legacy creado:", newBudget.idBudget);

      // 4. Crear los BudgetLineItems (solo en modalidad completa)
      if (!isSimpleMode && processedLineItems.length > 0) {
        for (const item of processedLineItems) {
          await BudgetLineItem.create({
            budgetId: newBudget.idBudget,
            budgetItemId: item.budgetItemId || null, // Puede ser null para items legacy
            quantity: item.quantity,
            priceAtTimeOfBudget: item.unitPrice,
            notes: item.notes || '',
            // Para items legacy sin budgetItemId, guardar la info directamente
            legacyItemName: item.budgetItemId ? null : item.name,
            legacyItemDescription: item.budgetItemId ? null : item.description,
            legacyItemCategory: item.budgetItemId ? null : item.category
          }, { transaction });
        }
        console.log("✅ Line items creados (modalidad completa)");
      } else {
        console.log("✅ Sin line items (modalidad simple)");
      }

      // 5. Crear Work record según el estado del trabajo
      let newWork = null;
      if (isCompleted || workStatus) {
        // Determinar el estado del work
        let workStatusFinal = 'paymentReceived'; // Por defecto completado (usando estado válido del enum)
        
        if (workStatus) {
          // Si se especifica un estado particular, usarlo
          workStatusFinal = workStatus;
        }
        
        newWork = await Work.create({
          budgetId: newBudget.idBudget,
          propertyAddress,
          workDescription: workNotes || `Trabajo legacy - ${applicantName}`,
          startDate: workStartDate || date || new Date(),
          endDate: workEndDate || (isCompleted ? new Date() : null),
          status: workStatusFinal,
          isLegacy: true,
          migrationNotes: migrationNotes || 'Trabajo migrado desde sistema anterior'
        }, { transaction });

        console.log("✅ Work record creado:", {
          idWork: newWork.idWork,
          status: workStatusFinal,
          isCompleted: isCompleted
        });
      }

      await transaction.commit();
      console.log("✅ Transacción completada exitosamente");

      // 6. 🆕 DETERMINAR PRÓXIMOS PASOS EN EL FLUJO
      const nextSteps = [];
      const canGenerateFinalInvoice = paymentProofAmount && paymentProofAmount >= initialPaymentNum;
      
      if (status === 'signed' && !paymentProofAmount) {
        nextSteps.push('Cargar comprobante de pago inicial');
      }
      
      if (canGenerateFinalInvoice && !newWork) {
        nextSteps.push('Crear registro de trabajo (Work)');
      }
      
      if (newWork && newWork.status === 'completed' && canGenerateFinalInvoice) {
        nextSteps.push('Generar factura final (Final Invoice)');
      }
      
      if (newWork && ['pending', 'assigned', 'inProgress'].includes(newWork.status)) {
        nextSteps.push(`Continuar trabajo desde estado: ${newWork.status}`);
      }

      // 7. Respuesta con los datos creados y próximos pasos
      const responseData = {
        success: true,
        message: isCompleted ? 
          'Trabajo legacy creado exitosamente como completado' : 
          'Presupuesto legacy creado exitosamente',
        data: {
          budget: {
            idBudget: newBudget.idBudget,
            permitId: newPermit.idPermit,
            applicantName,
            propertyAddress,
            status,
            totalPrice,
            initialPayment: initialPaymentNum,
            paymentProofAmount: parseFloat(paymentProofAmount) || null,
            isLegacy: true,
            migrationDate: newBudget.migrationDate
          },
          permit: {
            idPermit: newPermit.idPermit,
            permitNumber,
            propertyAddress,
            applicantName,
            applicantEmail,
            applicantPhone,
            isLegacy: true
          },
          work: newWork ? {
            idWork: newWork.idWork,
            status: newWork.status,
            message: `Trabajo creado con estado: ${newWork.status}`
          } : null,
          
          // 🆕 INFORMACIÓN DEL FLUJO
          flowStatus: {
            canGenerateFinalInvoice,
            hasInitialPayment: !!paymentProofAmount,
            readyForWork: status === 'signed' && paymentProofAmount >= initialPaymentNum,
            nextSteps
          }
        }
      };

      console.log("🎉 Legacy budget/work creado exitosamente");
      res.status(201).json(responseData);

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en createLegacyBudget:', error);
      
      res.status(500).json({
        error: true,
        message: 'Error al crear presupuesto/trabajo legacy',
        details: error.message
      });
    }
  },

  // === 🆕 MÉTODO PARA MOSTRAR PDF DEL PRESUPUESTO LEGACY ===
  async legacyBudgetPdf(req, res) {
    try {
      const { idBudget } = req.params;
      
      console.log(`🔍 DEBUG legacyBudgetPdf Budget ${idBudget}:`);

      // Buscar el presupuesto legacy
      const budget = await Budget.findByPk(idBudget);
      
      if (!budget) {
        return res.status(404).json({
          error: true,
          message: 'Presupuesto no encontrado'
        });
      }

      if (!budget.isLegacy) {
        return res.status(400).json({
          error: true,
          message: 'Este presupuesto no es legacy. Use la ruta normal de PDF.'
        });
      }

      console.log({
        isLegacy: budget.isLegacy,
        legacySignedPdfUrl: budget.legacySignedPdfUrl,
        hasCloudinaryUrl: !!budget.legacySignedPdfUrl
      });

      // Verificar que tenga la URL del PDF
      if (!budget.legacySignedPdfUrl) {
        return res.status(404).json({
          error: true,
          message: 'Este presupuesto legacy no tiene PDF firmado cargado'
        });
      }

      // Redirigir directamente a la URL de Cloudinary
      console.log(`🔗 Redirigiendo a URL de Cloudinary: ${budget.legacySignedPdfUrl}`);
      res.redirect(budget.legacySignedPdfUrl);

    } catch (error) {
      console.error('❌ Error al obtener PDF legacy:', error);
      res.status(500).json({
        error: true,
        message: 'Error al cargar el PDF del presupuesto legacy',
        details: error.message
      });
    }
  },

  // ========== 🆕 MÉTODOS PARA WORKFLOW DE REVISIÓN PREVIA ==========

  /**
   * Obtener detalles del presupuesto para revisión (endpoint público)
   * GET /api/budgets/:idBudget/review/:reviewToken
   */
  async getBudgetForReview(req, res) {
    try {
      const { idBudget, reviewToken } = req.params;
      
      console.log(`🔍 Cliente consultando presupuesto ${idBudget} para revisión...`);

      const budget = await Budget.findByPk(idBudget, {
        include: [
          { 
            model: Permit, 
            attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'lot', 'block'] 
          },
          { model: BudgetLineItem, as: 'lineItems' }
        ]
      });

      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // Validar token
      if (budget.reviewToken !== reviewToken) {
        return res.status(403).json({ error: 'Enlace de revisión inválido o expirado' });
      }

      // No exponer datos sensibles
      const budgetData = budget.toJSON();
      delete budgetData.reviewToken;
      delete budgetData.signNowDocumentId;
      delete budgetData.signedPdfPath;

      // Aplanar datos del Permit para facilitar acceso en el frontend
      if (budgetData.Permit) {
        budgetData.propertyAddress = budgetData.Permit.propertyAddress;
        budgetData.applicantName = budgetData.Permit.applicantName;
        budgetData.applicantEmail = budgetData.Permit.applicantEmail;
      }

      res.json(budgetData);

    } catch (error) {
      console.error('❌ Error al obtener presupuesto para revisión:', error);
      res.status(500).json({ 
        error: 'Error al cargar el presupuesto',
        details: error.message 
      });
    }
  },

  /**
   * Ver PDF del presupuesto (endpoint público con token)
   * GET /api/budgets/:idBudget/view-pdf/:reviewToken
   */
  async viewBudgetPDFPublic(req, res) {
    try {
      const { idBudget, reviewToken } = req.params;

      console.log(`📄 Cliente solicitando PDF del presupuesto ${idBudget}...`);

      const budget = await Budget.findByPk(idBudget);

      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // Validar token de revisión
      if (budget.reviewToken !== reviewToken) {
        return res.status(403).json({ error: 'Token de revisión inválido' });
      }

      // Verificar que el PDF existe
      if (!budget.pdfPath) {
        return res.status(404).json({ error: 'PDF no encontrado' });
      }

      // ✅ Convertir URL pública a ruta local
      let localPdfPath;
      if (budget.pdfPath.startsWith('http')) {
        const pdfFileName = budget.pdfPath.split('/').pop();
        localPdfPath = path.join(__dirname, '..', 'uploads', 'budgets', pdfFileName);
        console.log(`🔄 Convertido URL a ruta local: ${localPdfPath}`);
      } else {
        localPdfPath = budget.pdfPath;
      }

      // Verificar que el archivo existe físicamente
      if (!fs.existsSync(localPdfPath)) {
        console.error(`❌ PDF no encontrado en: ${localPdfPath}`);
        return res.status(404).json({ error: 'Archivo PDF no encontrado en el servidor' });
      }

      console.log(`✅ Enviando PDF: ${localPdfPath}`);

      // Enviar el archivo PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Budget_${budget.idBudget}.pdf"`);
      
      const fileStream = fs.createReadStream(localPdfPath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('❌ Error al visualizar PDF público:', error);
      res.status(500).json({ 
        error: 'Error al cargar el PDF',
        details: error.message 
      });
    }
  },

  /**
   * Enviar presupuesto para revisión del cliente (sin firma, solo lectura)
   * POST /api/budgets/:idBudget/send-for-review
   */
  async sendBudgetForReview(req, res) {
    let pdfPath; // ✅ Declarar aquí para disponibilidad en finally (patrón Change Order)
    try {
      const { idBudget } = req.params;
      
      console.log(`📧 Enviando presupuesto ${idBudget} para revisión...`);

      // Buscar el presupuesto con sus datos completos
      const budget = await Budget.findByPk(idBudget, {
        include: [
          { 
            model: Permit, 
            attributes: ['idPermit', 'propertyAddress', 'applicantEmail', 'applicantName', 'lot', 'block'] 
          },
          { model: BudgetLineItem, as: 'lineItems' }
        ]
      });

      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // ✅ Validaciones - Permitir reenvío de presupuestos rechazados
      const allowedStatuses = ['created', 'draft', 'rejected'];
      if (!allowedStatuses.includes(budget.status)) {
        return res.status(400).json({ 
          error: `No se puede enviar para revisión un presupuesto con estado "${budget.status}". Solo presupuestos en estado "created", "draft" o "rejected" (para reenvío) pueden enviarse para revisión.`
        });
      }

      if (!budget.Permit?.applicantEmail) {
        return res.status(400).json({ 
          error: 'El presupuesto no tiene un email de cliente asociado'
        });
      }

      // Generar token único para revisión (si no existe o si es reenvío)
      const crypto = require('crypto');
      const isResend = budget.status === 'rejected'; // Detectar si es un reenvío
      const reviewToken = budget.reviewToken || crypto.randomBytes(32).toString('hex');

      // Actualizar presupuesto
      await budget.update({
        status: 'pending_review',
        reviewToken: reviewToken,
        sentForReviewAt: new Date()
      });

      // ✅ GENERAR PDF USANDO LA FUNCIÓN EXISTENTE (patrón Budget/Change Order)
      console.log(`📄 Generando PDF del presupuesto ${idBudget}...`);
      pdfPath = await generateAndSaveBudgetPDF(budget.toJSON());

      if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw new Error('No se pudo generar el PDF del presupuesto');
      }

      console.log(`✅ PDF generado exitosamente: ${pdfPath}`);

      // Construir URL pública para revisión
      const frontendUrl = process.env.FRONTEND_URL || 'https://zurcherseptic.com';
      const reviewUrl = `${frontendUrl}/budget-review/${idBudget}/${reviewToken}`;

      // ✅ CONSTRUIR EMAIL HTML - Diferente si es reenvío
      const emailSubject = isResend 
        ? `Updated Budget for Review - ${budget.Permit.propertyAddress}` 
        : `Budget Proposal for Review - ${budget.Permit.propertyAddress}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 16px 32px; text-align: center; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; letter-spacing: 1px; margin: 10px; }
            .btn-approve { background-color: #28a745; color: white; }
            .btn-reject { background-color: #dc3545; color: white; }
            .details { background-color: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .resend-notice { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 ${isResend ? 'Updated Budget for Review' : 'Budget Proposal for Review'}</h1>
            </div>
            
            <div class="content">
              <p>Dear <strong>${budget.Permit.applicantName}</strong>,</p>
              
              ${isResend ? `
              <div class="resend-notice">
                <p><strong>🔄 This is an updated version of the budget.</strong></p>
                <p>We have reviewed your feedback and made the necessary adjustments. Please review the updated proposal below.</p>
              </div>
              ` : ''}
              
              <p>Please find attached the ${isResend ? 'updated ' : ''}budget estimate for your project at <strong>${budget.Permit.propertyAddress}</strong> for your review.</p>
              
              <div class="details">
                <h3>Budget Details:</h3>
                <p><strong>Budget ID:</strong> #${budget.idBudget}</p>
                <p><strong>Property Address:</strong> ${budget.Permit.propertyAddress}</p>
                <p><strong>Total:</strong> $${parseFloat(budget.totalPrice).toFixed(2)}</p>
                <p><strong>Initial Payment (${budget.initialPaymentPercentage}%):</strong> $${parseFloat(budget.initialPayment).toFixed(2)}</p>
                ${budget.expirationDate ? `<p><strong>Valid Until:</strong> ${new Date(budget.expirationDate).toLocaleDateString()}</p>` : ''}
              </div>
              
              <p><strong>⚠️ This is a preliminary budget for your review.</strong> It does not include digital signature or payment at this stage.</p>
              
              <p>Please review the attached budget PDF and let us know if you have any questions or if you wish to proceed:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}?action=approve" class="button btn-approve">✅ APPROVE BUDGET</a>
                <a href="${reviewUrl}?action=reject" class="button btn-reject">❌ PROVIDE FEEDBACK</a>
              </div>
              
              <p><em>If you approve the budget, we will proceed to send you the official document for digital signature and payment coordination.</em></p>
            </div>
            
            <div class="footer">
              <p><strong>Zurcher Septic</strong></p>
              <p>Professional Septic Installation & Maintenance | License CFC1433240</p>
              <p>📧 admin@zurcherseptic.com | 📞 +1 (407) 419-4495</p>
              <p style="margin-top: 10px; font-size: 12px;">For any questions, please contact us by replying to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // ✅ ENVIAR EMAIL CON PDF ADJUNTO (patrón exacto de Change Order)
      await sendEmail({
        to: budget.Permit.applicantEmail,
        subject: emailSubject,
        html: emailHtml,
        text: `Alternative text: ${emailSubject}`,
        attachments: [
          { 
            filename: `Budget_${budget.idBudget}.pdf`, 
            path: pdfPath 
          }
        ]
      });

      console.log(`✅ Email de revisión enviado a ${budget.Permit.applicantEmail}`);

      // Notificar al equipo interno
      await sendNotifications('budgetSentForReview', {
        idBudget: budget.idBudget,
        propertyAddress: budget.Permit.propertyAddress,
        applicantName: budget.Permit.applicantName,
        applicantEmail: budget.Permit.applicantEmail,
        isResend: isResend // 🆕 Indicar si es un reenvío
      });

      res.json({
        success: true,
        message: isResend 
          ? `Presupuesto actualizado y reenviado para revisión a ${budget.Permit.applicantEmail}`
          : `Presupuesto enviado para revisión a ${budget.Permit.applicantEmail}`,
        budget: {
          idBudget: budget.idBudget,
          status: 'pending_review',
          sentForReviewAt: budget.sentForReviewAt,
          reviewUrl,
          isResend: isResend
        }
      });

    } catch (error) {
      console.error('❌ Error al enviar presupuesto para revisión:', error);
      res.status(500).json({ 
        error: 'Error al enviar el presupuesto para revisión',
        details: error.message 
      });
    } finally {
      // ✅ LIMPIAR PDF TEMPORAL (patrón exacto de Change Order)
      if (pdfPath && fs.existsSync(pdfPath)) {
        try {
          fs.unlinkSync(pdfPath);
          console.log(`🗑️  PDF temporal eliminado: ${pdfPath}`);
        } catch (cleanupError) {
          console.warn(`⚠️  No se pudo eliminar el PDF temporal: ${cleanupError.message}`);
        }
      }
    }
  },

  /**
   * Cliente aprueba el presupuesto (endpoint público)
   * POST /api/budgets/:idBudget/approve-review/:reviewToken
   */
  async approveReview(req, res) {
    try {
      const { idBudget, reviewToken } = req.params;
      
      console.log(`✅ Cliente aprobando presupuesto ${idBudget}...`);

      const budget = await Budget.findByPk(idBudget, {
        include: [{ model: Permit, attributes: ['applicantName', 'propertyAddress', 'applicantEmail'] }]
      });

      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // Validar token
      if (budget.reviewToken !== reviewToken) {
        return res.status(403).json({ error: 'Token de revisión inválido' });
      }

      // Validar estado
      if (budget.status !== 'pending_review') {
        return res.status(400).json({ 
          error: `Este presupuesto ya no está en revisión (estado actual: ${budget.status})`
        });
      }

      // Actualizar presupuesto
      await budget.update({
        status: 'client_approved',
        reviewedAt: new Date()
      });

      console.log(`✅ Presupuesto ${idBudget} aprobado por el cliente`);

      // Notificar al equipo
      await sendNotifications('budgetApprovedByClient', {
        idBudget: budget.idBudget,
        propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
        applicantName: budget.Permit?.applicantName || budget.applicantName
      });

      // Email de confirmación al cliente
      await sendEmail({
        to: budget.Permit?.applicantEmail || budget.applicantEmail,
        subject: `Presupuesto Aprobado - ${budget.Permit?.propertyAddress || budget.propertyAddress}`,
        html: `
          <h2>✅ Presupuesto Aprobado</h2>
          <p>Gracias por aprobar el presupuesto #${budget.idBudget}.</p>
          <p>Nos pondremos en contacto con usted en breve para coordinar la firma digital del documento y el proceso de pago.</p>
          <p><strong>Zurcher Septic & Construction Services</strong></p>
        `
      });

      res.json({
        success: true,
        message: 'Presupuesto aprobado exitosamente',
        budget: {
          idBudget: budget.idBudget,
          status: 'client_approved',
          reviewedAt: budget.reviewedAt
        }
      });

    } catch (error) {
      console.error('❌ Error al aprobar presupuesto:', error);
      res.status(500).json({ 
        error: 'Error al aprobar el presupuesto',
        details: error.message 
      });
    }
  },

  /**
   * Cliente rechaza el presupuesto (endpoint público)
   * POST /api/budgets/:idBudget/reject-review/:reviewToken
   */
  async rejectReview(req, res) {
    try {
      const { idBudget, reviewToken } = req.params;
      const { reason } = req.body;
      
      console.log(`❌ Cliente rechazando presupuesto ${idBudget}...`);

      const budget = await Budget.findByPk(idBudget, {
        include: [{ model: Permit, attributes: ['applicantName', 'propertyAddress', 'applicantEmail'] }]
      });

      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      // Validar token
      if (budget.reviewToken !== reviewToken) {
        return res.status(403).json({ error: 'Token de revisión inválido' });
      }

      // Validar estado
      if (budget.status !== 'pending_review') {
        return res.status(400).json({ 
          error: `Este presupuesto ya no está en revisión (estado actual: ${budget.status})`
        });
      }

      // Actualizar presupuesto
      await budget.update({
        status: 'rejected',
        reviewedAt: new Date(),
        generalNotes: budget.generalNotes 
          ? `${budget.generalNotes}\n\nRazón de rechazo (cliente): ${reason || 'No especificada'}`
          : `Razón de rechazo (cliente): ${reason || 'No especificada'}`
      });

      console.log(`❌ Presupuesto ${idBudget} rechazado por el cliente`);

      // Notificar al equipo
      await sendNotifications('budgetRejectedByClient', {
        idBudget: budget.idBudget,
        propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
        applicantName: budget.Permit?.applicantName || budget.applicantName,
        reason: reason || 'No especificada'
      });

      // Email de confirmación al cliente
      await sendEmail({
        to: budget.Permit?.applicantEmail || budget.applicantEmail,
        subject: `Budget Proposal Feedback Received - ${budget.Permit?.propertyAddress || budget.propertyAddress}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Thank You for Your Feedback</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <p style="font-size: 16px; color: #333;">Dear ${budget.Permit?.applicantName || 'Valued Customer'},</p>
              
              <p style="font-size: 16px; color: #333;">
                We have received your decision regarding Budget Proposal <strong>#${budget.idBudget}</strong> for 
                <strong>${budget.Permit?.propertyAddress || budget.propertyAddress}</strong>.
              </p>
              
              ${reason ? `
              <div style="background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <p style="margin: 0; color: #666;"><strong>Your Feedback:</strong></p>
                <p style="margin: 10px 0 0 0; color: #333;">${reason}</p>
              </div>
              ` : ''}
              
              <p style="font-size: 16px; color: #333;">
                Your feedback is valuable to us. Our team will review your comments and reach out to discuss possible 
                modifications or alternative solutions that better meet your needs.
              </p>
              
              <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: #1e3a8a; margin-top: 0;">Contact Us</h3>
                <p style="margin: 5px 0;">📧 Email: <a href="mailto:admin@zurcherseptic.com">admin@zurcherseptic.com</a></p>
                <p style="margin: 5px 0;">📞 Phone: <a href="tel:+14074194495">+1 (407) 419-4495</a></p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                <strong>Zurcher Septic</strong><br>
                Professional Septic Installation & Maintenance<br>
                License CFC1433240
              </p>
            </div>
          </div>
        `
      });

      res.json({
        success: true,
        message: 'Presupuesto rechazado',
        budget: {
          idBudget: budget.idBudget,
          status: 'rejected',
          reviewedAt: budget.reviewedAt
        }
      });

    } catch (error) {
      console.error('❌ Error al rechazar presupuesto:', error);
      res.status(500).json({ 
        error: 'Error al rechazar el presupuesto',
        details: error.message 
      });
    }
  }


}



module.exports = BudgetController;

