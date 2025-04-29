const { generateAndSaveBudgetPDF } = require('../utils/pdfGenerator.js'); // Ajusta la ruta si es necesario
const { sendEmail } = require('../utils/notifications/emailService.js'); // Ajusta la ruta si es necesario
const { sendNotifications } = require('../utils/notifications/notificationManager.js'); // Ajusta la ruta si es necesario

// --- Helper para lógica de envío ---
async function handleBudgetSendLogic(budgetInstance, lineItemsData, transaction, reqIO, isUpdate = false) {
  console.log(`Iniciando handleBudgetSendLogic para Budget ID: ${budgetInstance.idBudget}, isUpdate: ${isUpdate}`);
  let pdfPathForEmail = null;

  try {
    console.log("Intentando generar PDF en backend...");
    const budgetDataForPdf = {
      ...budgetInstance.toJSON(),
      Permit: budgetInstance.Permit?.toJSON ? budgetInstance.Permit.toJSON() : budgetInstance.Permit,
      lineItems: lineItemsData
    };

    const generatedPath = await generateAndSaveBudgetPDF(budgetDataForPdf);
    // Actualizar la instancia del budget directamente (Sequelize rastrea cambios)
    budgetInstance.pdfPath = generatedPath;
    await budgetInstance.save({ transaction }); // Guardar el cambio en la instancia dentro de la transacción
    pdfPathForEmail = generatedPath;
    console.log(`PDF generado y ruta actualizada en BD para Budget ID ${budgetInstance.idBudget}: ${pdfPathForEmail}`);

  } catch (pdfError) {
    console.error(`Error CRÍTICO al generar/guardar PDF para Budget ID ${budgetInstance.idBudget}:`, pdfError);
    throw new Error(`Error al generar PDF: ${pdfError.message}`);
  }

  if (!pdfPathForEmail) {
    throw new Error('Error interno: No se pudo obtener la ruta del PDF generado.');
  }

  console.log(`Usando PDF en ${pdfPathForEmail} para enviar correo...`);
  const applicantEmail = budgetInstance.Permit?.applicantEmail;
  const applicantName = budgetInstance.applicantName || 'Cliente';
  const propertyAddress = budgetInstance.propertyAddress;
  const idBudget = budgetInstance.idBudget;

  if (!applicantEmail || !applicantEmail.includes('@')) {
    console.warn(`Advertencia: El cliente para Budget ID ${idBudget} no tiene un correo válido. No se enviará email.`);
  } else {
    const emailSubject = isUpdate
        ? `Presupuesto Actualizado #${idBudget} - ${propertyAddress}`
        : `Nuevo Presupuesto #${idBudget} - ${propertyAddress}`;
    const emailText = isUpdate
        ? `Estimado/a ${applicantName},\n\nAdjunto encontrará su presupuesto actualizado...\n\nSaludos,\nZURCHER CONSTRUCTION`
        : `Estimado/a ${applicantName},\n\nAdjunto encontrará el nuevo presupuesto solicitado...\n\nSaludos,\nZURCHER CONSTRUCTION`;

    const clientMailOptions = {
      to: applicantEmail,
      subject: emailSubject,
      text: emailText,
      attachments: [{ filename: `budget_${idBudget}.pdf`, path: pdfPathForEmail, contentType: 'application/pdf' }],
    };
    try {
      console.log(`Intentando enviar correo (${isUpdate ? 'actualizado' : 'nuevo'}) al cliente: ${applicantEmail}`);
      await sendEmail(clientMailOptions);
      console.log(`Correo (${isUpdate ? 'actualizado' : 'nuevo'}) enviado exitosamente al cliente.`);
    } catch (clientEmailError) {
      console.error(`Error al enviar correo (${isUpdate ? 'actualizado' : 'nuevo'}) al cliente ${applicantEmail}:`, clientEmailError);
    }
  }

  await sendNotifications('budgetSent', {
    propertyAddress: propertyAddress,
    applicantEmail: applicantEmail,
    idBudget: idBudget,
  }, null, reqIO);
  console.log(`Notificaciones internas 'budgetSent' enviadas.`);
}
// --- Fin Helper ---

// Exportar la función
module.exports = {
  handleBudgetSendLogic
};