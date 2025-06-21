const cron = require('node-cron');
// 1. Importar TODOS los modelos necesarios
const { Budget, Permit, ChangeOrder, Work } = require('../data');
const SignNowService = require('./ServiceSignNow');
const { sendNotifications } = require('../utils/notifications/notificationManager');

const checkPendingSignatures = async () => {
  console.log(`\n⏰ [CRON JOB] Iniciando la verificación de firmas pendientes - ${new Date().toISOString()}`);
  const signNowService = new SignNowService();

  // --- TAREA 1: VERIFICAR PRESUPUESTOS PENDIENTES ---
  try {
    const pendingBudgets = await Budget.findAll({
      where: { status: 'sent_for_signature' },
      include: [{ model: Permit, attributes: ['applicantName', 'propertyAddress'] }]
    });

    if (pendingBudgets.length > 0) {
      console.log(`[CRON JOB] Se encontraron ${pendingBudgets.length} presupuestos pendientes para verificar.`);
      for (const budget of pendingBudgets) {
        try {
          if (!budget.signNowDocumentId) {
            console.warn(`⚠️ [CRON JOB] El presupuesto ${budget.idBudget} no tiene signNowDocumentId. Omitiendo.`);
            continue;
          }

          const signatureStatus = await signNowService.isDocumentSigned(budget.signNowDocumentId);

          if (signatureStatus.isSigned) {
            console.log(`✅ ¡Presupuesto FIRMADO! ID: ${budget.idBudget}.`);
            await budget.update({
              status: 'signed',
              signedAt: new Date()
            });
            console.log(`   -> Estado del presupuesto ${budget.idBudget} actualizado a 'signed'.`);

            const notificationData = {
              idBudget: budget.idBudget,
              propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
              applicantName: budget.Permit?.applicantName || 'El cliente',
            };
            await sendNotifications('budgetSigned', notificationData, null, null);
          }
        } catch (error) {
          console.error(`❌ [CRON JOB] Error al verificar el presupuesto ${budget.idBudget}:`, error.message);
        }
      }
    } else {
      console.log('✅ [CRON JOB] No hay presupuestos pendientes de firma.');
    }
  } catch (error) {
    console.error('❌ [CRON JOB] Error fatal durante la búsqueda de presupuestos pendientes:', error);
  }

  // --- TAREA 2: VERIFICAR ÓRDENES DE CAMBIO PENDIENTES DE FIRMA ---
  try {
    const pendingChangeOrders = await ChangeOrder.findAll({
      where: {
        status: 'approved', // El estado principal ya es 'approved'
        signatureStatus: 'pending' // Pero la firma está pendiente
      }
    });

    if (pendingChangeOrders.length > 0) {
      console.log(`[CRON JOB] Se encontraron ${pendingChangeOrders.length} órdenes de cambio pendientes de firma.`);
      for (const co of pendingChangeOrders) {
        try {
          if (!co.signNowDocumentId) {
            console.warn(`⚠️ [CRON JOB] La Orden de Cambio ${co.id} no tiene signNowDocumentId. Omitiendo.`);
            continue;
          }

          const signatureStatus = await signNowService.isDocumentSigned(co.signNowDocumentId);

          if (signatureStatus.isSigned) {
            console.log(`✅ ¡Firma de Orden de Cambio COMPLETADA! ID: ${co.id}.`);
            // Actualizamos solo los campos de la firma, no el estado principal
            await co.update({
              signatureStatus: 'completed',
              signedAt: new Date()
            });
            console.log(`   -> Estado de firma de la CO ${co.id} actualizado a 'completed'.`);
            // Aquí podrías agregar una notificación si lo deseas
          }
        } catch (error) {
          console.error(`❌ [CRON JOB] Error al verificar la firma de la orden de cambio ${co.id}:`, error.message);
        }
      }
    } else {
      console.log('✅ [CRON JOB] No hay órdenes de cambio pendientes de firma.');
    }
  } catch (error) {
    console.error('❌ [CRON JOB] Error fatal durante la búsqueda de órdenes de cambio pendientes:', error);
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