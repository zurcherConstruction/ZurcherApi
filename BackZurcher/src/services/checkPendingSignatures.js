const cron = require('node-cron');
// 1. Importar TODOS los modelos necesarios
const { Budget, Permit, ChangeOrder, Work } = require('../data');
const { Op } = require('sequelize'); // Para operadores de Sequelize
const SignNowService = require('./ServiceSignNow');
const DocuSignService = require('./ServiceDocuSign'); // 🆕 DOCUSIGN
const { sendNotifications } = require('../utils/notifications/notificationManager');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../utils/cloudinaryConfig');

const checkPendingSignatures = async () => {
  console.log(`\n⏰ [CRON JOB] Iniciando la verificación de firmas pendientes - ${new Date().toISOString()}`);
  
  // 🆕 Inicializar ambos servicios
  const signNowService = new SignNowService();
  const docuSignService = new DocuSignService();

  // --- TAREA 1: VERIFICAR PRESUPUESTOS PENDIENTES ---
  try {
    // 🆕 Buscar presupuestos que tengan documentId pero NO estén firmados ni aprobados
    const { Op } = require('sequelize');
    const pendingBudgets = await Budget.findAll({
      where: {
        [Op.or]: [
          { signatureDocumentId: { [Op.ne]: null } }, // Nuevo campo genérico
          { signNowDocumentId: { [Op.ne]: null } }    // Campo legacy de SignNow
        ],
        status: { 
          [Op.notIn]: ['signed', 'approved', 'rejected'] // Excluir los que ya están firmados, aprobados o rechazados
        },
        signatureMethod: {
          [Op.in]: ['signnow', 'docusign'] // Solo los enviados a servicios de firma
        }
      },
      include: [{ model: Permit, attributes: ['applicantName', 'propertyAddress'] }]
    });

    if (pendingBudgets.length > 0) {
      console.log(`[CRON JOB] Se encontraron ${pendingBudgets.length} presupuestos pendientes para verificar.`);
      for (const budget of pendingBudgets) {
        try {
          // Determinar qué servicio usar y qué documentId
          const isDocuSign = budget.signatureMethod === 'docusign';
          const serviceName = isDocuSign ? 'DocuSign' : 'SignNow';
          const documentId = budget.signatureDocumentId || budget.signNowDocumentId;
          const signatureService = isDocuSign ? docuSignService : signNowService;

          if (!documentId) {
            console.warn(`⚠️ [CRON JOB] El presupuesto ${budget.idBudget} no tiene documentId. Omitiendo.`);
            continue;
          }

          console.log(`🔍 Verificando presupuesto ${budget.idBudget} en ${serviceName}...`);
          
          const signatureStatus = await signatureService.isDocumentSigned(documentId);
          const isSigned = isDocuSign ? signatureStatus.signed : signatureStatus.isSigned;

          if (isSigned) {
            console.log(`✅ ¡Presupuesto FIRMADO! ID: ${budget.idBudget} (${serviceName}).`);
            
            // 🆕 MEJORA: Descargar automáticamente el PDF firmado a Cloudinary
            try {
              const tempDir = path.join(__dirname, '../../temp');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }

              const tempFilePath = path.join(tempDir, `budget_${budget.idBudget}_signed_${Date.now()}.pdf`);
              
              // Descargar desde el servicio correspondiente
              await signatureService.downloadSignedDocument(documentId, tempFilePath);
              console.log(`   -> PDF descargado temporalmente: ${tempFilePath}`);

              // Subir a Cloudinary con metadata
              const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
                folder: 'signed_budgets',
                resource_type: 'raw',
                public_id: `budget_${budget.idBudget}_signed_${Date.now()}`,
                tags: [
                  `invoice-${budget.idBudget}`,
                  `property-${(budget.Permit?.propertyAddress || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
                  'budget',
                  'signed',
                  serviceName.toLowerCase()
                ],
                context: {
                  invoice: budget.idBudget.toString(),
                  property: budget.Permit?.propertyAddress || budget.propertyAddress,
                  signed_at: new Date().toISOString(),
                  signature_service: serviceName
                }
              });

              console.log(`   -> PDF subido a Cloudinary: ${uploadResult.secure_url}`);

              // ✅ Actualizar Budget a 'signed' (el hook del modelo lo pasará a 'approved' si tiene pago)
              await budget.update({
                status: 'signed',
                signedAt: new Date(),
                signedPdfPath: uploadResult.secure_url,
                signedPdfPublicId: uploadResult.public_id
              });

              // Borrar archivo temporal
              fs.unlinkSync(tempFilePath);
              console.log(`   -> Archivo temporal eliminado`);
              
            } catch (downloadError) {
              console.error(`❌ Error al descargar/subir PDF firmado del presupuesto ${budget.idBudget}:`, downloadError.message);
              // Aún así actualizamos el status pero sin el PDF
              await budget.update({
                status: 'signed',
                signedAt: new Date()
              });
            }
            
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
            
            // 🆕 MEJORA: Descargar automáticamente el PDF firmado a Cloudinary
            try {
              const tempDir = path.join(__dirname, '../../temp');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }

              const tempFilePath = path.join(tempDir, `change_order_${co.id}_signed_${Date.now()}.pdf`);
              
              // Descargar de SignNow
              await signNowService.downloadSignedDocument(co.signNowDocumentId, tempFilePath);
              console.log(`   -> PDF de CO descargado temporalmente: ${tempFilePath}`);

              // Obtener información de la obra para metadata
              const work = await Work.findByPk(co.WorkIdWork, {
                include: [{ model: Permit, attributes: ['propertyAddress'] }]
              });

              // Subir a Cloudinary con metadata
              const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
                folder: 'signed_change_orders',
                resource_type: 'raw',
                public_id: `change_order_${co.id}_signed_${Date.now()}`,
                tags: [
                  `change-order-${co.id}`,
                  work ? `property-${(work.propertyAddress || work.Permit?.propertyAddress || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}` : '',
                  'change-order',
                  'signed'
                ].filter(Boolean),
                context: {
                  change_order_id: co.id.toString(),
                  property: work?.propertyAddress || work?.Permit?.propertyAddress || '',
                  signed_at: new Date().toISOString()
                }
              });

              console.log(`   -> PDF de CO subido a Cloudinary: ${uploadResult.secure_url}`);

              // Actualizar CO con la URL de Cloudinary
              await co.update({
                signatureStatus: 'completed',
                signedAt: new Date(),
                signedPdfPath: uploadResult.secure_url,
                signedPdfPublicId: uploadResult.public_id
              });

              // Borrar archivo temporal
              fs.unlinkSync(tempFilePath);
              console.log(`   -> Archivo temporal de CO eliminado`);
              
            } catch (downloadError) {
              console.error(`❌ Error al descargar/subir PDF firmado de la CO ${co.id}:`, downloadError.message);
              // Aún así actualizamos el status pero sin el PDF
              await co.update({
                signatureStatus: 'completed',
                signedAt: new Date()
              });
            }
            
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
  // Ejecutar a las 23:00 y 7:00 (horarios de baja actividad)
  cron.schedule('0 23,7 * * *', checkPendingSignatures, {
    scheduled: true,
    timezone: "America/New_York"
  });

  console.log('✅ Cron job para verificar firmas programado para las 23:00 y 7:00 (horarios de baja actividad).');
};

module.exports = { startSignatureCheckCron, checkPendingSignatures };