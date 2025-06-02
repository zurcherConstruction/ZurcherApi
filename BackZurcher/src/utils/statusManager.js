const { Image, InstallationDetail, Inspection, FinalInvoice, WorkExtraItem, MaintenanceVisit, Receipt } = require('../data');
const { deleteFromCloudinary } = require('./cloudinaryUploader');
const { Op } = require('sequelize');

// Orden de los estados del workflow
const STATUS_ORDER = [
  'pending', 
  'assigned', 
  'inProgress', 
  'installed', 
  'firstInspectionPending', 
  'approvedInspection', 
  'rejectedInspection',
  'coverPending', 
  'covered', 
  'finalInspectionPending', 
  'finalApproved', 
  'finalRejected', 
  'invoiceFinal', 
  'paymentReceived', 
  'maintenance'
];

// Mapeo de dependencias por estado
const STATE_DEPENDENCIES = {
  'pending': {
    creates: [],
    requires: []
  },
  'assigned': {
    creates: ['staffId assignment'],
    requires: []
  },
  'inProgress': {
    creates: ['startDate'],
    requires: ['staffId']
  },
  'installed': {
    creates: ['InstallationDetail', 'Images (sistema instalado)'],
    requires: ['Images (materiales, excavación, etc.)']
  },
  'firstInspectionPending': {
    creates: ['Inspection (type: first)'],
    requires: ['InstallationDetail']
  },
  'approvedInspection': {
    creates: [],
    requires: ['Inspection (finalStatus: approved)']
  },
  'rejectedInspection': {
    creates: [],
    requires: ['Inspection (finalStatus: rejected)']
  },
  'coverPending': {
    creates: [],
    requires: ['approvedInspection']
  },
  'covered': {
    creates: ['Images (trabajo cubierto)'],
    requires: []
  },
  'finalInspectionPending': {
    creates: ['Inspection (type: final)'],
    requires: ['covered']
  },
  'finalApproved': {
    creates: [],
    requires: ['Inspection (type: final, finalStatus: approved)']
  },
  'finalRejected': {
    creates: [],
    requires: ['Inspection (type: final, finalStatus: rejected)']
  },
  'invoiceFinal': {
    creates: ['FinalInvoice'],
    requires: ['finalApproved']
  },
  'paymentReceived': {
    creates: [],
    requires: ['FinalInvoice (status: paid)']
  },
  'maintenance': {
    creates: ['maintenanceStartDate', 'MaintenanceVisit records'],
    requires: ['paymentReceived']
  }
};

const isStatusBackward = (currentStatus, targetStatus) => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const targetIndex = STATUS_ORDER.indexOf(targetStatus);
  return targetIndex < currentIndex;
};

const isStatusForward = (currentStatus, targetStatus) => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const targetIndex = STATUS_ORDER.indexOf(targetStatus);
  return targetIndex > currentIndex;
};

const validateStatusChange = async (work, targetStatus, isMovingBackward, force) => {
  const conflicts = [];
  
  if (isMovingBackward && !force) {
    // Validar qué se perdería al retroceder
    const statusIndex = STATUS_ORDER.indexOf(work.status);
    const targetIndex = STATUS_ORDER.indexOf(targetStatus);
    
    for (let i = targetIndex + 1; i <= statusIndex; i++) {
      const statusToRollback = STATUS_ORDER[i];
      const statusConflicts = await checkStatusConflicts(work, statusToRollback);
      conflicts.push(...statusConflicts);
    }
    
    if (conflicts.length > 0) {
      return {
        valid: false,
        message: 'El cambio de estado resultará en pérdida de datos',
        conflicts
      };
    }
  }
  
  return { valid: true };
};

const checkStatusConflicts = async (work, status) => {
  const conflicts = [];
  
  switch (status) {
    case 'installed':
      if (work.installationDetails?.length > 0) {
        conflicts.push({
          type: 'InstallationDetail',
          count: work.installationDetails.length,
          message: 'Se eliminarán los detalles de instalación'
        });
      }
      
      // Verificar imágenes de sistema instalado
      const systemImages = work.images?.filter(img => img.stage === 'sistema instalado');
      if (systemImages?.length > 0) {
        conflicts.push({
          type: 'Images',
          stage: 'sistema instalado',
          count: systemImages.length,
          message: 'Se eliminarán las imágenes del sistema instalado'
        });
      }
      break;

      // NUEVO: Manejar rollback desde inProgress
    case 'inProgress':
      // Verificar comprobantes de materiales - CONSULTA SEPARADA
      const materialReceipts = await Receipt.findAll({
        where: {
          relatedModel: 'Work',
          relatedId: work.idWork,
          type: { [Op.in]: ['Materiales', 'Materiales Iniciales'] }
        }
      });
      if (materialReceipts?.length > 0) {
        conflicts.push({
          type: 'Receipt',
          subtype: 'Materiales',
          count: materialReceipts.length,
          message: 'Se eliminarán los comprobantes de compra de materiales'
        });
      }

      // Verificar gastos relacionados - CONSULTA SEPARADA
      const workExpenses = await Expense.findAll({
        where: { workId: work.idWork }
      });
      if (workExpenses?.length > 0) {
        conflicts.push({
          type: 'Expense',
          count: workExpenses.length,
          message: 'Se eliminarán todos los gastos registrados para este trabajo'
        });
      }
      break;
      
    case 'firstInspectionPending':
    case 'finalInspectionPending':
      const inspectionType = status === 'firstInspectionPending' ? 'first' : 'final';
      const inspections = work.inspections?.filter(i => i.type === inspectionType);
      if (inspections?.length > 0) {
        conflicts.push({
          type: 'Inspection',
          count: inspections.length,
          message: `Se eliminarán ${inspections.length} inspección(es) tipo ${inspectionType}`
        });
      }
      break;
      
    case 'covered':
      const coveredImages = work.images?.filter(img => img.stage === 'trabajo cubierto');
      if (coveredImages?.length > 0) {
        conflicts.push({
          type: 'Images',
          stage: 'trabajo cubierto',
          count: coveredImages.length,
          message: 'Se eliminarán las imágenes del trabajo cubierto'
        });
      }
      break;
      
    case 'invoiceFinal':
      if (work.finalInvoice) {
        conflicts.push({
          type: 'FinalInvoice',
          count: 1,
          message: 'Se eliminará la factura final y todos sus elementos extra'
        });
      }
      break;
       case 'approvedInspection':
      // Verificar inspecciones iniciales aprobadas
      const approvedInitialInspections = work.inspections?.filter(i => 
        i.type === 'initial' && i.finalStatus === 'approved'
      );
      if (approvedInitialInspections?.length > 0) {
        conflicts.push({
          type: 'InitialInspection',
          count: approvedInitialInspections.length,
          message: 'Se revertirá la aprobación de la inspección inicial (volverá a estado pendiente de resultado)'
        });
      }
      break;

      
     case 'maintenance':
      if (work.maintenanceVisits?.length > 0) {
        conflicts.push({
          type: 'MaintenanceVisit',
          count: work.maintenanceVisits.length,
          message: 'Se eliminarán todas las visitas de mantenimiento programadas'
        });
      }
      
      // AGREGAR ESTA PARTE:
      const approvedFinalInspections = work.inspections?.filter(i => 
        i.type === 'final' && i.finalStatus === 'approved'
      );
      if (approvedFinalInspections?.length > 0) {
        conflicts.push({
          type: 'FinalInspection',
          count: approvedFinalInspections.length,
          message: 'Se revertirá la aprobación de la inspección final (volverá a estado pendiente)'
        });
      }
      break;
  }
  
  return conflicts;
};

const rollbackToStatus = async (work, targetStatus, transaction, reason) => {
  const currentStatusIndex = STATUS_ORDER.indexOf(work.status);
  const targetStatusIndex = STATUS_ORDER.indexOf(targetStatus);
  
  console.log(`🔄 Rolling back work ${work.idWork} from ${work.status} to ${targetStatus}`);
  
  // Rollback en orden inverso
  for (let i = currentStatusIndex; i > targetStatusIndex; i--) {
    const statusToRollback = STATUS_ORDER[i];
    await rollbackSpecificStatus(work, statusToRollback, transaction, reason);
  }
};

const rollbackSpecificStatus = async (work, status, transaction, reason) => {
  console.log(`🔄 Rolling back status: ${status} for work ${work.idWork}`);
  
  switch (status) {
    case 'installed':
      // Eliminar detalles de instalación
      await InstallationDetail.destroy({
        where: { idWork: work.idWork },
        transaction
      });
      console.log(`✅ Eliminados InstallationDetails para work ${work.idWork}`);
      
      // Eliminar imágenes de sistema instalado
      await deleteImagesByStage(work.idWork, 'sistema instalado', transaction);
      break;

       // NUEVO: Rollback desde inProgress
    case 'inProgress':
      // Limpiar fecha de inicio
      work.startDate = null;
      
      // Eliminar comprobantes de materiales
      const materialReceipts = await Receipt.findAll({
        where: {
          relatedModel: 'Work',
          relatedId: work.idWork,
          type: { [Op.in]: ['Materiales', 'Materiales Iniciales'] }
        },
        transaction
      });
      
      // Eliminar archivos de Cloudinary de los comprobantes
      for (const receipt of materialReceipts) {
        if (receipt.publicId) {
          try {
            await deleteFromCloudinary(receipt.publicId);
            console.log(`✅ Comprobante eliminado de Cloudinary: ${receipt.publicId}`);
          } catch (cloudinaryError) {
            console.error(`❌ Error eliminando comprobante de Cloudinary: ${receipt.publicId}`, cloudinaryError);
          }
        }
      }
      
      // Eliminar comprobantes de la BD
      await Receipt.destroy({
        where: {
          relatedModel: 'Work',
          relatedId: work.idWork,
          type: { [Op.in]: ['Materiales', 'Materiales Iniciales'] }
        },
        transaction
      });
      console.log(`✅ Eliminados ${materialReceipts.length} comprobantes de materiales para work ${work.idWork}`);
      
      // Eliminar gastos del trabajo
      const deletedExpenses = await Expense.destroy({
        where: { workId: work.idWork },
        transaction
      });
      console.log(`✅ Eliminados ${deletedExpenses} gastos para work ${work.idWork}`);
      break;
      
    case 'firstInspectionPending':
    case 'finalInspectionPending':
      const inspectionType = status === 'firstInspectionPending' ? 'first' : 'final';
      await Inspection.destroy({
        where: { 
          workId: work.idWork,
          type: inspectionType 
        },
        transaction
      });
      console.log(`✅ Eliminadas inspecciones tipo ${inspectionType} para work ${work.idWork}`);
      break;
      
    case 'covered':
      // Eliminar imágenes de trabajo cubierto
      await deleteImagesByStage(work.idWork, 'trabajo cubierto', transaction);
      break;
      
    case 'invoiceFinal':
      // Eliminar factura final y sus extras
      if (work.finalInvoice) {
        await WorkExtraItem.destroy({
          where: { finalInvoiceId: work.finalInvoice.id },
          transaction
        });
        await FinalInvoice.destroy({
          where: { id: work.finalInvoice.id },
          transaction
        });
        console.log(`✅ Eliminada FinalInvoice para work ${work.idWork}`);
      }
      break;

       case 'approvedInspection':
      // Revertir inspección inicial aprobada a estado pendiente de resultado
      const updatedInitialInspections = await Inspection.update(
        { 
          finalStatus: null, // Quitar la aprobación
          processStatus: 'applicant_document_received', // Volver al estado donde espera resultado
          dateResultReceived: null // Limpiar fecha de resultado
        },
        { 
          where: { 
            workId: work.idWork,
            type: 'initial', // Usar 'initial' según tu modelo
            finalStatus: 'approved'
          },
          transaction 
        }
      );
      console.log(`✅ ${updatedInitialInspections[0]} inspección(es) inicial(es) revertida(s) a pendiente para work ${work.idWork}`);
      break;

      case 'finalApproved':
  // Revertir inspección final aprobada a estado pendiente de resultado
  const revertedFinalInspections = await Inspection.update(
    { 
      finalStatus: null,
      processStatus: 'final_payment_notified_to_inspector',
      dateResultReceived: null
    },
    { 
      where: { 
        workId: work.idWork,
        type: 'final',
        finalStatus: 'approved'
      },
      transaction 
    }
  );
  console.log(`✅ ${revertedFinalInspections[0]} inspección(es) final(es) revertida(s) a pendiente para work ${work.idWork}`);
  break;
      
     case 'maintenance':
      // Eliminar visitas de mantenimiento
      await MaintenanceVisit.destroy({
        where: { workId: work.idWork },
        transaction
      });
      console.log(`✅ Eliminadas MaintenanceVisits para work ${work.idWork}`);
      
      // Limpiar fecha de inicio de mantenimiento
      work.maintenanceStartDate = null;
      
      // AGREGAR ESTA PARTE:
      // Revertir inspección final aprobada a estado pendiente
      await Inspection.update(
        { 
          finalStatus: null,
          processStatus: 'final_payment_notified_to_inspector',
          dateResultReceived: null
        },
        { 
          where: { 
            workId: work.idWork,
            type: 'final',
            finalStatus: 'approved'
          },
          transaction 
        }
      );
      console.log(`✅ Inspección final revertida a estado pendiente para work ${work.idWork}`);
      break;
      
    case 'assigned':
      // Limpiar asignación de staff
      work.staffId = null;
      break;
  }
};

// NUEVA FUNCIÓN: Eliminar comprobantes con archivos de Cloudinary
const deleteReceiptsByWorkAndType = async (workId, receiptTypes, transaction) => {
  const receipts = await Receipt.findAll({
    where: {
      relatedModel: 'Work',
      relatedId: workId,
      type: { [Op.in]: receiptTypes }
    },
    transaction
  });
  
  console.log(`🧾 Eliminando ${receipts.length} comprobantes de tipos [${receiptTypes.join(', ')}] para work ${workId}`);
  
  // Eliminar archivos de Cloudinary
  for (const receipt of receipts) {
    if (receipt.publicId) {
      try {
        await deleteFromCloudinary(receipt.publicId);
        console.log(`✅ Comprobante eliminado de Cloudinary: ${receipt.publicId}`);
      } catch (cloudinaryError) {
        console.error(`❌ Error eliminando comprobante de Cloudinary: ${receipt.publicId}`, cloudinaryError);
      }
    }
  }
  
  // Eliminar de BD
  await Receipt.destroy({
    where: {
      relatedModel: 'Work',
      relatedId: workId,
      type: { [Op.in]: receiptTypes }
    },
    transaction
  });
  
  return receipts.length;
};



const deleteImagesByStage = async (workId, stage, transaction) => {
  const images = await Image.findAll({
    where: { idWork: workId, stage },
    transaction
  });
  
  console.log(`🖼️ Eliminando ${images.length} imágenes de etapa '${stage}' para work ${workId}`);
  
  // Eliminar de Cloudinary
  for (const image of images) {
    if (image.publicId) {
      try {
        await deleteFromCloudinary(image.publicId);
        console.log(`✅ Imagen eliminada de Cloudinary: ${image.publicId}`);
      } catch (cloudinaryError) {
        console.error(`❌ Error eliminando de Cloudinary: ${image.publicId}`, cloudinaryError);
      }
    }
  }
  
  // Eliminar de BD
  await Image.destroy({
    where: { idWork: workId, stage },
    transaction
  });
};

const advanceToStatus = async (work, targetStatus, transaction) => {
  console.log(`⏩ Advancing work ${work.idWork} to status ${targetStatus}`);
  
  // Lógica para avanzar estados si es necesario
  // Por ejemplo, establecer fechas automáticamente
  switch (targetStatus) {
    case 'inProgress':
      if (!work.startDate) {
        work.startDate = new Date();
      }
      break;
    case 'maintenance':
      if (!work.maintenanceStartDate) {
        work.maintenanceStartDate = new Date();
      }
      break;
  }
};

const logStatusChange = async (workId, fromStatus, toStatus, reason, changedBy, transaction) => {
  const logEntry = {
    workId,
    fromStatus,
    toStatus,
    reason,
    changedBy,
    timestamp: new Date()
  };
  
  console.log(`📝 Status Change Log:`, logEntry);
  
  // Podrías crear una tabla específica para logs de cambios de estado
  // await StatusChangeLog.create(logEntry, { transaction });
};

module.exports = {
  STATUS_ORDER,
  STATE_DEPENDENCIES,
  isStatusBackward,
  isStatusForward,
  validateStatusChange,
  checkStatusConflicts,
  rollbackToStatus,
  rollbackSpecificStatus,
  deleteImagesByStage,
  deleteReceiptsByWorkAndType,
  advanceToStatus,
  logStatusChange
};