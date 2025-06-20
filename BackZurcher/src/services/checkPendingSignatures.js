const cron = require('node-cron');
const { Budget, Permit } = require('../data');
const SignNowService = require('./ServiceSignNow');
const { sendNotifications } = require('../utils/notifications/notificationManager');


const checkPendingSignatures = async () => {
  console.log(`\n⏰ [CRON JOB] Iniciando la verificación de firmas pendientes - ${new Date().toISOString()}`);

  try {
    // 1. Buscar todos los presupuestos que están esperando ser firmados.
    const pendingBudgets = await Budget.findAll({
      where: { status: 'sent_for_signature' },
      include: [{ model: Permit, attributes: ['applicantName', 'propertyAddress'] }]
    });

    if (pendingBudgets.length === 0) {
      console.log('✅ [CRON JOB] No hay presupuestos pendientes de firma. Finalizando tarea.');
      return;
    }

    console.log(`🔍 [CRON JOB] Se encontraron ${pendingBudgets.length} presupuestos pendientes para verificar.`);
    const signNowService = new SignNowService();

    // 2. Iterar sobre cada presupuesto y verificar su estado.
    for (const budget of pendingBudgets) {
      // Usamos un try/catch dentro del loop para que un error en un presupuesto no detenga todo el proceso.
      try {
        if (!budget.signNowDocumentId) {
          console.warn(`⚠️ [CRON JOB] El presupuesto ${budget.idBudget} no tiene signNowDocumentId. Omitiendo.`);
          continue;
        }

        console.log(`--- Verificando Presupuesto ID: ${budget.idBudget}, Documento ID: ${budget.signNowDocumentId} ---`);
        const signatureStatus = await signNowService.isDocumentSigned(budget.signNowDocumentId);

        // 3. Si está firmado, actualizar la base de datos y notificar.
        if (signatureStatus.isSigned) {
          console.log(`✅ ¡FIRMADO! Documento ${budget.signNowDocumentId} para presupuesto ${budget.idBudget}.`);
          
          await budget.update({
            status: 'signed',
            signedAt: new Date() 
          });
          console.log(`   -> Estado del presupuesto ${budget.idBudget} actualizado a 'signed'.`);

          // Enviar notificaciones internas.
          const notificationData = {
            idBudget: budget.idBudget,
            propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
            applicantName: budget.Permit?.applicantName || 'El cliente',
          };
          // Pasamos 'null' para io porque este script no tiene contexto de una conexión de socket.
          await sendNotifications('budgetSigned', notificationData, null, null);
          console.log(`   -> Notificación 'budgetSigned' generada para presupuesto ${budget.idBudget}.`);

        } else {
          console.log(`... Aún pendiente: Presupuesto ID: ${budget.idBudget}`);
        }
      } catch (error) {
         console.error(`❌ [CRON JOB] Error al verificar el presupuesto ${budget.idBudget}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ [CRON JOB] Error fatal durante la ejecución de la tarea:', error);
  }
  console.log('🏁 [CRON JOB] Tarea de verificación de firmas finalizada.');
};


const startSignatureCheckCron = () => {
  cron.schedule('0 */2 * * *', checkPendingSignatures, {
    scheduled: true,
    timezone: "America/New_York" // IMPORTANTE: Ajusta a tu zona horaria.
  });

  console.log('✅ Cron job para verificar firmas de SignNow programado para ejecutarse cada 2 horas.');
};

module.exports = { startSignatureCheckCron, checkPendingSignatures };