const { Work, Permit, Budget, Material, Inspection, Image, Staff, InstallationDetail, MaterialSet, Receipt, Expense, Income, ChangeOrder, FinalInvoice, MaintenanceVisit, MaintenanceMedia } = require('../data');

const convertPdfDataToUrl = require('../utils/convertPdfDataToUrl');
const { sendNotifications } = require('../utils/notifications/notificationManager');
const {  deleteFromCloudinary, uploadBufferToCloudinary } = require('../utils/cloudinaryUploader'); // Asegúrate de importar la función de subida a Cloudinary
const multer = require('multer');
const path = require('path');
const {generateAndSaveChangeOrderPDF} = require('../utils/pdfGenerator')
const fs = require('fs'); 
const { v4: uuidv4 } = require('uuid');
const { Op, literal} = require('sequelize');
const {scheduleInitialMaintenanceVisits} = require('./MaintenanceController'); // Asegúrate de importar la función de programación de mantenimientos iniciales
const { sequelize } = require('../data'); 

const { 
  STATUS_ORDER,
  STATE_DEPENDENCIES,
  isStatusBackward,
  isStatusForward,
  validateStatusChange,
  checkStatusConflicts,
  rollbackToStatus,
  rollbackSpecificStatus,
  deleteImagesByStage,
  advanceToStatus,
  logStatusChange,
  deleteReceiptsByWorkAndType,
} = require('../utils/statusManager'); 



const createWork = async (req, res) => {
  try {
   
    const { idBudget } = req.body;

    // Buscar el presupuesto con estado "approved"
    const budget = await Budget.findOne({
      where: { idBudget, status: 'approved' },
      include: [{ model: Permit }], // Incluir el permiso relacionado
    });

    if (!budget) {
      return res.status(404).json({ error: true, message: 'Presupuesto no encontrado o no aprobado' });
    }

    // Verificar si ya existe un Work asociado al Budget
    const existingWork = await Work.findOne({ where: { propertyAddress: budget.propertyAddress } });
    if (existingWork) {
      return res.status(400).json({ error: true, message: 'Ya existe una obra asociada a este presupuesto' });
    }

    // Crear la obra
    const work = await Work.create({
      propertyAddress: budget.propertyAddress,
      status: 'pending', // Estado inicial
      idBudget: budget.idBudget, // Asociar el presupuesto
      notes: `Work creado a partir del presupuesto N° ${idBudget}`,
    });

    
    await sendNotifications('pending', work, req.app.get('io'));

    res.status(201).json({ message: 'Obra creada correctamente', work });
  } catch (error) {
    console.error('Error al crear la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener todas las obras
const getWorks = async (req, res) => {
  try {
    const worksInstances = await Work.findAll({
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'initialPayment', 'paymentProofAmount', 'date'],
        },
        {
          model: Permit,
          attributes: ['idPermit', 'propertyAddress', 'applicantName', 'expirationDate', 'applicantEmail'],
        },
        {
          model: FinalInvoice,
          as: 'finalInvoice',
          required: false
        },
        {
          model: Expense,
          as: 'expenses',
        },
        {
          model: Receipt,
          as: 'Receipts',
          required: false,
          on: {
            [Op.and]: [
              literal(`"Receipts"."relatedModel" = 'Work'`),
              literal(`"Work"."idWork" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'type', 'notes', 'fileUrl', 'publicId', 'mimeType', 'originalName','createdAt'],
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    // Para cada work, combinar los receipts directos y los de expenses (sin romper la estructura original)
    const worksWithDetails = await Promise.all(worksInstances.map(async (workInstance) => {
      const workJson = workInstance.get({ plain: true });

      // Receipts directos (como siempre)
      let directReceipts = [];
      if (workJson.Receipts && Array.isArray(workJson.Receipts)) {
        directReceipts = convertPdfDataToUrl(workJson.Receipts);
      }

      // Receipts de tipo Inspección Inicial asociados a Expenses (agregado, no rompe nada)
      let expenseReceipts = [];
      if (workJson.expenses && Array.isArray(workJson.expenses) && workJson.expenses.length > 0) {
        const expenseIds = workJson.expenses.map(e => e.idExpense);
        if (expenseIds.length > 0) {
          const foundReceipts = await Receipt.findAll({
            where: {
              relatedModel: 'Expense',
              relatedId: expenseIds,
              type: 'Inspección Inicial'
            }
          });
          expenseReceipts = convertPdfDataToUrl(foundReceipts.map(r => ({ ...r.get({ plain: true }), fromExpense: true })));
        }
      }

      // Eliminar el campo startDate si no está asignado (lógica existente)
      if (!workJson.startDate) {
        delete workJson.startDate;
      }

      // --- Calcular y añadir estado de expiración del Permit si existe ---
      if (workJson.Permit && workJson.Permit.expirationDate) {
        let permitExpirationStatus = "valid";
        let permitExpirationMessage = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expirationDateString = typeof workJson.Permit.expirationDate === 'string'
          ? workJson.Permit.expirationDate.split('T')[0]
          : new Date(workJson.Permit.expirationDate).toISOString().split('T')[0];

        const expDateParts = expirationDateString.split('-');
        const year = parseInt(expDateParts[0], 10);
        const month = parseInt(expDateParts[1], 10) - 1;
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
            console.warn(`Fecha de expiración de permiso inválida (post-parse) para work ${workJson.idWork}, permit ${workJson.Permit.idPermit}: ${expirationDateString}`);
          }
        } else {
          console.warn(`Formato de fecha de expiración de permiso inválido para work ${workJson.idWork}, permit ${workJson.Permit.idPermit}: ${expirationDateString}`);
        }
        workJson.Permit.expirationStatus = permitExpirationStatus;
        workJson.Permit.expirationMessage = permitExpirationMessage;
      } else if (workJson.Permit) {
        workJson.Permit.expirationStatus = "valid";
        workJson.Permit.expirationMessage = "Permiso sin fecha de expiración especificada.";
      }

      // Unir ambos arrays de receipts (sin romper la estructura original)
      workJson.Receipts = [...directReceipts, ...expenseReceipts];
      return workJson;
    }));

    res.status(200).json(worksWithDetails);
  } catch (error) {
    console.error('Error al obtener las obras:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener una obra por ID
const getWorkById = async (req, res) => {
  try {
    const { idWork } = req.params;
    const work = await Work.findByPk(idWork, {
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'paymentProofType', 'initialPayment', 'paymentProofAmount', 'date', 'applicantName','totalPrice', 'initialPaymentPercentage'],
        },
        {
          model: Permit,
          attributes: [
            'idPermit',
            'propertyAddress',
            'permitNumber',
            'applicantName',
            'applicantEmail',
            'pdfData',
            'optionalDocs',
            'expirationDate',
          ],
        },
        {
          model: Material,
          attributes: ['idMaterial', 'name', 'quantity', 'cost'],
        },
        {
          model: Inspection,
          as: 'inspections',
          attributes: [
            'idInspection',
            'type',
            'processStatus',
            'finalStatus',
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected',
            'dateWorkerCorrected',
            'createdAt',
            'updatedAt',
          ],
          order: [['createdAt', 'DESC']],
        },
        {
          model: InstallationDetail,
          as: 'installationDetails',
          attributes: ['idInstallationDetail', 'date', 'extraDetails', 'extraMaterials', 'images'],
        },
        {
          model: MaterialSet,
          as: 'MaterialSets',
          attributes: ['idMaterialSet', 'invoiceFile', 'totalCost'],
        },
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount'],
        },
        {
          model: Expense,
          as: 'expenses',
        },
        {
          model: Receipt,
          as: 'Receipts',
          required: false,
          on: {
            [Op.and]: [
              literal(`"Receipts"."relatedModel" = 'Work'`),
              literal(`"Work"."idWork" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'type', 'notes', 'fileUrl', 'publicId', 'mimeType', 'originalName','createdAt'],
        },
        {
          model: ChangeOrder,
          as: 'changeOrders',
        },
        {
          model: FinalInvoice,
          as: 'finalInvoice',
          required: false,
        }
      ],
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Receipts directos
    let directReceipts = [];
    if (work.Receipts) {
      directReceipts = convertPdfDataToUrl(work.Receipts);
    }

    // Receipts de tipo Inspección Inicial asociados a Expenses (consulta JS, no include)
    let expenseReceipts = [];
    const workJson = work.get({ plain: true });
    if (workJson.expenses && Array.isArray(workJson.expenses) && workJson.expenses.length > 0) {
      const expenseIds = workJson.expenses.map(e => e.idExpense);
      if (expenseIds.length > 0) {
        const foundReceipts = await Receipt.findAll({
          where: {
            relatedModel: 'Expense',
            relatedId: expenseIds,
            type: 'Inspección Inicial'
          }
        });
        expenseReceipts = convertPdfDataToUrl(foundReceipts.map(r => ({ ...r.get({ plain: true }), fromExpense: true })));
      }
    }

    // Unir ambos arrays de receipts
    workJson.Receipts = [...directReceipts, ...expenseReceipts];

    res.status(200).json(workJson);
  } catch (error) {
    console.error('Error al obtener la obra:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Actualizar una obra
const updateWork = async (req, res) => {
  try {
    const { idWork } = req.params;
    const { propertyAddress, status, startDate, notes, staffId, stoneExtractionCONeeded  } = req.body;

    let workInstance = await Work.findByPk(idWork);
    if (!workInstance) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }
    // --- Guardar valores antiguos ---
    const oldStatus = workInstance.status;
    const oldStartDate = workInstance.startDate;
    const oldStaffId = workInstance.staffId;
    const oldStoneExtractionCONeeded = workInstance.stoneExtractionCONeeded;
    let statusChanged = false;
    let assignmentChanged = false;

    // --- Actualizar los campos ---
    workInstance.propertyAddress = propertyAddress || workInstance.propertyAddress;

    // Permitir reactivar trabajos cancelados
    if (oldStatus === 'cancelled' && status && status !== 'cancelled') {
      workInstance.status = status;
      statusChanged = true;
    } else if (status && status !== oldStatus) {
      workInstance.status = status;
      statusChanged = true;
      if (status === 'inProgress' && !workInstance.startDate) {
        workInstance.startDate = new Date();
      }
    }

    // --- LÓGICA DE MANTENIMIENTO ---
    if (workInstance.status === 'maintenance') {
      if (!workInstance.maintenanceStartDate) {
        workInstance.maintenanceStartDate = new Date();
      }
      if (status === 'maintenance' && oldStatus !== 'maintenance') {
        await workInstance.save();
        try {
          await scheduleInitialMaintenanceVisits(idWork);
        } catch (scheduleError) {
          console.error(`[WorkController - updateWork] ERROR CALLING scheduleInitialMaintenanceVisits for work ${idWork}:`, scheduleError);
        }
      }
    }

    // Detectar cambios en asignación (staffId o startDate)
    if ((staffId && staffId !== oldStaffId) || (startDate && startDate !== oldStartDate)) {
      assignmentChanged = true;
    }

    workInstance.startDate = startDate || workInstance.startDate;
    workInstance.staffId = staffId || workInstance.staffId;
    workInstance.notes = notes || workInstance.notes;
    if (typeof stoneExtractionCONeeded === 'boolean') {
      workInstance.stoneExtractionCONeeded = stoneExtractionCONeeded;
    }

    await workInstance.save();

    // Volver a buscar la obra incluyendo el Staff asignado
    const workWithStaff = await Work.findByPk(workInstance.idWork, {
      include: [
        { model: Staff, attributes: ['name', 'email', 'id'] }
      ]
    });

    // --- Notificaciones ---
    if (statusChanged) {
      try {
        await sendNotifications(workInstance.status, workWithStaff, req.app.get('io'));
      } catch (notificationError) {
        console.error(`Error sending notifications for work ${idWork} status ${workInstance.status}:`, notificationError);
      }
    }
    // Notificar si cambia asignación aunque el estado no cambie
    if (assignmentChanged) {
      try {
        await sendNotifications('assigned', workWithStaff, req.app.get('io'));
      } catch (notificationError) {
        console.error(`Error sending assignment notifications for work ${idWork}:`, notificationError);
      }
    }

    // --- RECARGAR LA OBRA CON SUS ASOCIACIONES ANTES DE DEVOLVERLA ---
    const updatedWorkWithAssociations = await Work.findByPk(idWork, {
      include: [
        { model: Budget, as: 'budget', attributes: ['idBudget', 'propertyAddress', 'status', 'paymentInvoice', 'paymentProofType', 'initialPayment', 'date', 'applicantName','totalPrice', 'initialPaymentPercentage']},
        { model: Permit, attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantName', 'pdfData', 'optionalDocs', 'expirationDate']},
        { model: Material, attributes: ['idMaterial', 'name', 'quantity', 'cost']},
        {
          model: Inspection,
          as: 'inspections',
          attributes: [
           'idInspection',
            'type',
            'processStatus', 
            'finalStatus',   
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected',
            'dateWorkerCorrected',
            'createdAt', 
            'updatedAt',
          ],
          order: [['createdAt', 'DESC']], 
        },
        { model: InstallationDetail, as: 'installationDetails', attributes: ['idInstallationDetail', 'date', 'extraDetails', 'extraMaterials', 'images']},
        { model: MaterialSet, as: 'MaterialSets', attributes: ['idMaterialSet', 'invoiceFile', 'totalCost']},
        { model: Image, as: 'images', attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount']},
       {
          model: Receipt,
          as: 'Receipts',
          required: false,
          on: {
            [Op.and]: [
              literal(`"Receipts"."relatedModel" = 'Work'`),
              literal(`"Work"."idWork" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'type', 'notes', 'fileUrl', 'publicId', 'mimeType', 'originalName','createdAt'],
        },
         { model: ChangeOrder, as: 'changeOrders' },
      ],
    });

    if (!updatedWorkWithAssociations) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada después de la actualización (inesperado)' });
    }
    const finalWorkResponse = {
      ...updatedWorkWithAssociations.get({ plain: true }),
      Receipts: updatedWorkWithAssociations.Receipts ? convertPdfDataToUrl(updatedWorkWithAssociations.Receipts) : [],
    };
    res.status(200).json(finalWorkResponse);
  } catch (error) {
    console.error(`Error al actualizar la obra ${req.params.idWork}:`, error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al actualizar la obra' });
  }
};


// Eliminar una obra
const deleteWork = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { idWork } = req.params;

    // Buscar el trabajo con todas sus relaciones (excepto Receipts que tiene tipo incompatible)
    const work = await Work.findByPk(idWork, {
      include: [
        { model: Image, as: 'images' },
        // Receipt excluido - se consulta por separado debido a tipo polimórfico STRING vs UUID
        { model: Expense, as: 'expenses' },
        { model: Income, as: 'incomes' },
        { model: MaterialSet, as: 'MaterialSets' },
        { model: ChangeOrder, as: 'changeOrders' },
        { model: MaintenanceVisit, as: 'maintenanceVisits' },
        { model: Material }, // Sin alias, usa el plural del modelo: Materials
        { model: Inspection, as: 'inspections' },
        { model: InstallationDetail, as: 'installationDetails' },
        { model: FinalInvoice, as: 'finalInvoice' }
      ],
      transaction
    });

    if (!work) {
      await transaction.rollback();
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Consulta separada para Receipts debido a incompatibilidad de tipos (UUID vs STRING)
    const workReceipts = await Receipt.findAll({
      where: {
        relatedModel: 'Work',
        relatedId: idWork.toString() // Convertir UUID a string para comparación
      },
      transaction
    });

    console.log(`🗑️ Eliminando Work #${idWork} (${work.address || work.propertyAddress})...`);

    // Contadores para el resumen
    let deletedCounts = {
      images: 0,
      receipts: 0,
      materials: 0,
      inspections: 0,
      incomes: 0,
      expenses: 0,
      materialSets: 0,
      changeOrders: 0,
      maintenanceVisits: 0
    };

    // 1. Eliminar imágenes de Cloudinary
    if (work.images && work.images.length > 0) {
      deletedCounts.images = work.images.length;
      console.log(`📸 Eliminando ${deletedCounts.images} imágenes de Cloudinary...`);
      const imageDeletes = work.images.map(img => 
        deleteFromCloudinary(img.publicId)
          .catch(err => console.warn(`⚠️ Error eliminando imagen ${img.publicId}:`, err.message))
      );
      await Promise.all(imageDeletes);
    }

    // 2. Eliminar receipts de Cloudinary y sus datos asociados
    if (workReceipts && workReceipts.length > 0) {
      deletedCounts.receipts = workReceipts.length;
      console.log(`🧾 Eliminando ${deletedCounts.receipts} receipts de Cloudinary...`);
      const receiptDeletes = workReceipts.map(receipt => 
        deleteFromCloudinary(receipt.publicId)
          .catch(err => console.warn(`⚠️ Error eliminando receipt ${receipt.publicId}:`, err.message))
      );
      await Promise.all(receiptDeletes);
    }

    // 3. Eliminar receipts asociados a expenses del work
    if (work.expenses && work.expenses.length > 0) {
      deletedCounts.expenses = work.expenses.length;
      console.log(`💸 Procesando ${deletedCounts.expenses} gastos y sus receipts...`);
      for (const expense of work.expenses) {
        const expenseReceipts = await Receipt.findAll({
          where: {
            relatedModel: 'Expense',
            relatedId: expense.idExpense.toString()
          },
          transaction
        });
        
        if (expenseReceipts.length > 0) {
          const expenseReceiptDeletes = expenseReceipts.map(receipt =>
            deleteFromCloudinary(receipt.publicId)
              .catch(err => console.warn(`⚠️ Error eliminando expense receipt:`, err.message))
          );
          await Promise.all(expenseReceiptDeletes);
        }
      }
    }

    // 4. Procesar Incomes
    if (work.incomes && work.incomes.length > 0) {
      deletedCounts.incomes = work.incomes.length;
      console.log(`💰 Marcando ${deletedCounts.incomes} ingresos para eliminación (CASCADE)...`);
    }

    // 5. Eliminar MaterialSet invoices de Cloudinary
    if (work.MaterialSets && work.MaterialSets.length > 0) {
      deletedCounts.materialSets = work.MaterialSets.length;
      console.log(`📦 Eliminando invoices de ${deletedCounts.materialSets} MaterialSets...`);
      for (const matSet of work.MaterialSets) {
        if (matSet.invoiceFile && matSet.invoiceFile.includes('cloudinary')) {
          const urlParts = matSet.invoiceFile.split('/');
          const publicId = urlParts.slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId)
            .catch(err => console.warn(`⚠️ Error eliminando invoice de MaterialSet:`, err.message));
        }
      }
    }

    // 6. Eliminar PDFs de ChangeOrders
    if (work.changeOrders && work.changeOrders.length > 0) {
      deletedCounts.changeOrders = work.changeOrders.length;
      console.log(`📝 Eliminando PDFs de ${deletedCounts.changeOrders} ChangeOrders...`);
      for (const co of work.changeOrders) {
        if (co.pdfPath && fs.existsSync(co.pdfPath)) {
          fs.unlinkSync(co.pdfPath);
          console.log(`  ✓ Eliminado: ${co.pdfPath}`);
        }
      }
    }

    // 7. Eliminar MaintenanceVisit media files
    if (work.maintenanceVisits && work.maintenanceVisits.length > 0) {
      deletedCounts.maintenanceVisits = work.maintenanceVisits.length;
      console.log(`🔧 Eliminando media de ${deletedCounts.maintenanceVisits} MaintenanceVisits...`);
      for (const visit of work.maintenanceVisits) {
        const mediaFiles = await MaintenanceMedia.findAll({
          where: { maintenanceVisitId: visit.idMaintenanceVisit },
          transaction
        });
        
        if (mediaFiles.length > 0) {
          const mediaDeletes = mediaFiles.map(media =>
            deleteFromCloudinary(media.publicId)
              .catch(err => console.warn(`⚠️ Error eliminando maintenance media:`, err.message))
          );
          await Promise.all(mediaDeletes);
        }
      }
    }

    // 8. Contar Materials e Inspections antes de eliminar
    if (work.Materials) deletedCounts.materials = work.Materials.length;
    if (work.inspections) deletedCounts.inspections = work.inspections.length;

    // 9. Limpiar campos de pago del Budget asociado (si existe)
    if (work.idBudget) {
      const budget = await Budget.findByPk(work.idBudget, { transaction });
      if (budget && (budget.paymentProofAmount || budget.paymentInvoice)) {
        console.log(`💳 Limpiando información de pago del Budget #${work.idBudget}...`);
        await budget.update({
          paymentProofAmount: null,
          paymentProofMethod: null,
          paymentInvoice: null,
          paymentProofType: null
        }, { transaction });
        console.log(`   ✓ Campos de pago del Budget limpiados`);
      }
    }

    // 10. CASCADE en DB eliminará automáticamente:
    //    - Materials ✅
    //    - MaterialSets ✅
    //    - Inspections ✅
    //    - InstallationDetails ✅
    //    - Images (registros DB) ✅
    //    - ChangeOrders ✅
    //    - FinalInvoices ✅
    //    - MaintenanceVisits ✅
    //    - Incomes ✅
    //    - Expenses ✅
    //    - Receipts ✅

    // 11. Eliminar el Work (trigger CASCADE en DB)
    await work.destroy({ transaction });

    await transaction.commit();
    
    // Resumen detallado de eliminación
    console.log(`\n✅ Work #${idWork} eliminado exitosamente!`);
    console.log(`📊 Resumen de eliminación:`);
    console.log(`   🏠 Dirección: ${work.address || work.propertyAddress}`);
    console.log(`   📸 Imágenes: ${deletedCounts.images}`);
    console.log(`   🧾 Receipts: ${deletedCounts.receipts}`);
    console.log(`   🔨 Materiales: ${deletedCounts.materials}`);
    console.log(`   🔍 Inspecciones: ${deletedCounts.inspections}`);
    console.log(`   💰 Ingresos: ${deletedCounts.incomes}`);
    console.log(`   💸 Gastos: ${deletedCounts.expenses}`);
    console.log(`   📦 Material Sets: ${deletedCounts.materialSets}`);
    console.log(`   📝 Change Orders: ${deletedCounts.changeOrders}`);
    console.log(`   🔧 Mantenimientos: ${deletedCounts.maintenanceVisits}\n`);
    
    res.status(200).json({ 
      success: true,
      message: `Obra "${work.address || work.propertyAddress}" eliminada exitosamente`,
      deleted: deletedCounts
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error al eliminar la obra:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error al eliminar la obra: ' + error.message 
    });
  }
};
const addInstallationDetail = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { idWork } = req.params; // ID del Work al que se asociará el detalle
    const { date, extraDetails, extraMaterials, images } = req.body;

    // Verificar que el Work exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Crear el detalle de instalación
    const installationDetail = await InstallationDetail.create({
      idWork,
      date,
      extraDetails,
      extraMaterials,
      images,
    });

    // --- Actualizar el estado del Work a "installed" ---
    const oldStatus = work.status; // Guardar estado anterior por si acaso
    work.status = 'installed';
    await work.save();
    const statusChanged = work.status !== oldStatus; // Verificar si realmente cambió

    // --- INICIO: Enviar Notificación ---
    if (statusChanged) { // Solo notificar si el estado cambió a 'installed'
      console.log(`Work ${idWork}: Status changed to '${work.status}'. Sending 'installed' notifications...`);
      try {
        // Usar el estado 'installed' y el objeto work actualizado
        await sendNotifications(work.status, work, null, req.app.get('io')); // Pasas work, null para budget, y io
        console.log(`Notifications sent for status '${work.status}'.`);
      } catch (notificationError) {
        console.error(`Error sending notifications for work ${idWork} status ${work.status}:`, notificationError);
        // Manejar el error como en updateWork (opcionalmente)
        if (notificationError.message.includes('Estado de notificación no configurado')) {
          console.warn(notificationError.message);
        }
      }
    }
    // --- FIN: Enviar Notificación ---

    res.status(201).json({
      message: 'Detalle de instalación agregado correctamente y estado actualizado a installed.',
      installationDetail,
      work // Devolver el work actualizado
    });
  } catch (error) {
    console.error('Error al agregar el detalle de instalación:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const attachInvoiceToWork = async (req, res) => {
  try {
    const { idWork } = req.params; // ID de la obra
    const { totalCost } = req.body; // Costo total enviado en el cuerpo de la solicitud

    // Verificar si se subió un archivo
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se subió ningún archivo' });
    }

    // Obtener el nombre del archivo subido
    const invoiceFile = req.file.filename;

    // Verificar que la obra exista
    const work = await Work.findByPk(idWork, {
      include: [
        {
          model: MaterialSet,
          as: 'MaterialSets',
        },
      ],
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    // Crear o actualizar el conjunto de materiales asociado a la obra
    let materialSet = work.MaterialSets[0]; // Asumimos que hay un único conjunto de materiales
    if (!materialSet) {
      materialSet = await MaterialSet.create({
        workId: idWork,
        invoiceFile,
        totalCost,
      });
    } else {
      materialSet.invoiceFile = invoiceFile;
      materialSet.totalCost = totalCost;
      await materialSet.save();
    }

    res.status(200).json({
      message: 'Factura y costo total guardados correctamente',
      materialSet,
    });
  } catch (error) {
    console.error('Error al guardar la factura y el costo total:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const getAssignedWorks = async (req, res) => {
  try {
    

    // Obtener las obras asignadas al worker autenticado
    const works = await Work.findAll({
      where: { staffId: req.staff.id }, // Filtrar por el ID del usuario autenticado
      include: [
        {
          model: Permit,
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'pdfData', 'optionalDocs'],
        },
        {
          model: Material,
          attributes: ['idMaterial', 'name', 'quantity', 'cost'],
        },
        {
          model: Inspection,
          as: 'inspections', // <--- ALIAS AÑADIDO
          attributes: [     // <--- ATRIBUTOS ACTUALIZADOS
            'idInspection',
            'type',
            'processStatus',
            'finalStatus',
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected', // <--- AÑADIR ESTE CAMPO
            'dateWorkerCorrected', // <--- AÑADIR ESTE CAMPO
            'createdAt',
            'updatedAt',
          ],
          order: [['createdAt', 'DESC']], // Opcional, pero consistente con otros includes
        },
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount'],
        },
      ],
    });

    if (works.length === 0) {
      return res.status(404).json({ error: false, message: 'No tienes tareas asignadas actualmente' });
    }

    res.status(200).json({ error: false, works });
  } catch (error) {
    console.error('Error al obtener las tareas asignadas:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const addImagesToWork = async (req, res) => {
 
  try {
    const { idWork } = req.params; // ID del trabajo
    const { stage, dateTime, comment, truckCount } = req.body; // Etapa, imagen en Base64 y fecha/hora
    
    if (!req.file) {
      console.error("Controlador addImagesToWork: No se proporcionó ningún archivo.");
      return res.status(400).json({ error: true, message: 'No se proporcionó ningún archivo de imagen.' });
    }

    // Verificación adicional del tipo de archivo para esta ruta específica (imágenes)
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      console.error("Controlador addImagesToWork: Tipo de archivo no permitido:", req.file.mimetype);
      return res.status(400).json({ error: true, message: 'Tipo de archivo no permitido para esta operación. Solo se aceptan imágenes (JPG, PNG, GIF, WEBP).' });
    }
    // Verificar que el trabajo exista
    const work = await Work.findByPk(idWork);
    if (!work) {
      console.error("Controlador addImagesToWork: Trabajo no encontrado:", idWork);
      // Si el archivo ya se guardó temporalmente por multer, elimínalo
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: true, message: 'Trabajo no encontrado' });
    }


    // Validar que la etapa sea válida
    const validStages = [
    'foto previa del lugar',
    'materiales',
    'foto excavación',
    'camiones de arena',
    'sistema instalado',
    'extracción de piedras',
    'camiones de tierra',
    'trabajo cubierto',
    'inspeccion final'
    ];
    if (!validStages.includes(stage)) {
      console.error("Controlador addImagesToWork: Etapa no válida:", stage);
      return res.status(400).json({ error: true, message: 'Etapa no válida' });
    }
    console.log("Controlador addImagesToWork: Intentando subir a Cloudinary...");
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `works/${idWork}/${stage}`,
      resource_type: "image"
    });
    
    
    // --- ASIGNAR EL RESULTADO DE Image.create A newImage ---
    const newImage = await Image.create({ // <--- CAMBIO AQUÍ
      idWork,
      stage,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      dateTime: dateTime,
      comment: comment,
      truckCount: truckCount,
    });
   
    const updatedWork = await Work.findByPk(idWork, {
     
      include: [
        {
          model: Image,
          as: 'images',
          attributes: ['id', 'stage', 'dateTime', 'imageUrl', 'publicId', 'comment', 'truckCount'],
        },
        {
          model: Permit,
          as: 'Permit', // Asegúrate que el alias 'as' coincida con tu definición de modelo si existe
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'pdfData', 'optionalDocs'],
        },
        {
          model: Inspection,
          as: 'inspections', // <--- ALIAS AÑADIDO
          attributes: [     // <--- ATRIBUTOS ACTUALIZADOS
            'idInspection',
            'type',
            'processStatus',
            'finalStatus',
            'dateRequestedToInspectors',
            'inspectorScheduledDate',
            'documentForApplicantUrl',
            'dateDocumentSentToApplicant',
            'signedDocumentFromApplicantUrl',
            'dateSignedDocumentReceived',
            'dateInspectionPerformed',
            'resultDocumentUrl',
            'dateResultReceived',
            'notes',
            'workerHasCorrected', // <--- AÑADIR ESTE CAMPO
            'dateWorkerCorrected', // <--- AÑADIR ESTE CAMPO
            'createdAt',
            'updatedAt',
          ],
          order: [['createdAt', 'DESC']], // Opcional, pero consistente con otros includes
        },
        {
          model: InstallationDetail,
          as: 'installationDetails',
          attributes: ['idInstallationDetail', 'date', 'extraDetails', 'extraMaterials', 'images'],
        },
        {
          model: MaterialSet,
          as: 'MaterialSets',
          attributes: ['idMaterialSet', 'invoiceFile', 'totalCost'],
        },
       
        // ... incluye cualquier otra asociación que UploadScreen pueda necesitar indirectamente
        // a través de currentWork o sus componentes hijos.
      ]
    });
    
    res.status(201).json({
      message: 'Imagen agregada correctamente a Cloudinary y DB',
      work: updatedWork,
      createdImage: newImage 
    });

  } catch (error) {
    console.error('Controlador addImagesToWork: ERROR CAPTURADO:', error); // LOG DETALLADO DEL ERROR
    if (error instanceof multer.MulterError) {
        console.error('Error de Multer al agregar imagen:', error);
        return res.status(400).json({ error: true, message: `Error de Multer: ${error.message}` });
    } else if (error.http_code && error.http_code === 400) { // Error específico de Cloudinary por formato, etc.
        console.error('Error de Cloudinary (posiblemente formato):', error);
        return res.status(400).json({ error: true, message: `Error de Cloudinary: ${error.message}` });
    }
    // Error genérico
    res.status(500).json({ error: true, message: 'Error interno del servidor al subir imagen.' });
  }
};

const deleteImagesFromWork = async (req, res) => {
  try {
    const { idWork, imageId } = req.params; // Obtener IDs de los parámetros de la URL

  



   const imageToDelete = await Image.findOne({
      where: { id: imageId, idWork: idWork }
    });

    if (!imageToDelete) {
      return res.status(404).json({ error: true, message: 'Imagen no encontrada o no pertenece a este trabajo' });
    }

    // Eliminar de Cloudinary si tiene publicId
    if (imageToDelete.publicId) {
      await deleteFromCloudinary(imageToDelete.publicId);
    }

    // Eliminar de la base de datos
    await imageToDelete.destroy();

    
    res.status(204).send();

  } catch (error) {
    console.error('Error al eliminar imagen (Cloudinary):', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor al eliminar imagen.' });
  }
};

// --- NUEVA FUNCIÓN PARA OBTENER OBRAS EN MANTENIMIENTO CON DETALLES DE PRÓXIMA VISITA ---
const getMaintenanceOverviewWorks = async (req, res) => {
  try {
    const worksInMaintenance = await Work.findAll({
      where: { status: 'maintenance' },
      include: [
         {
          model: Permit,
          as: 'Permit', // Asegúrate que el alias 'as' coincida con tu definición de modelo si existe
          attributes: ['idPermit', 'propertyAddress', 'permitNumber', 'applicantEmail', 'applicantName'],
        },
      
        {
          model: MaintenanceVisit,
          as: 'maintenanceVisits', // Asegúrate que este 'as' coincida con tu definición de asociación
          attributes: ['id', 'visitNumber', 'scheduledDate', 'status', 'actualVisitDate'],
          // Solo nos interesan las visitas que no están completadas o saltadas para determinar la "próxima"
          where: {
            status: { [Op.notIn]: ['completed', 'skipped'] }
          },
          order: [['scheduledDate', 'ASC']], // La más próxima primero
          required: false, // LEFT JOIN para incluir obras en mantenimiento aunque aún no tengan visitas programadas (raro, pero posible)
        },
        // Puedes añadir otros includes que sean relevantes para la vista de "obras en mantenimiento"
      ],
      order: [['propertyAddress', 'ASC']], // O por la fecha de la próxima visita si prefieres
    });
 
    const worksWithNextVisitDetails = worksInMaintenance.map(workInstance => {
      const work = workInstance.get({ plain: true });

      let nextMaintenanceDate = null;
      let nextVisitNumber = null;
      let nextVisitStatus = null;
      let nextVisitId = null;

       // --- RE-ORDENAR LAS VISITAS EN JAVASCRIPT ---
      if (work.maintenanceVisits && work.maintenanceVisits.length > 0) {
        work.maintenanceVisits.sort((a, b) => {
          // Ordenar por scheduledDate ASC. Si son iguales, por visitNumber ASC.
          const dateA = new Date(a.scheduledDate);
          const dateB = new Date(b.scheduledDate);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          // Si las fechas son iguales, ordenar por número de visita
          if (a.visitNumber < b.visitNumber) return -1;
          if (a.visitNumber > b.visitNumber) return 1;
          return 0;
        });
        // La primera visita en la lista ordenada es la próxima
        const nextVisit = work.maintenanceVisits[0];
        nextMaintenanceDate = nextVisit.scheduledDate;
        nextVisitNumber = nextVisit.visitNumber;
        nextVisitStatus = nextVisit.status;
        nextVisitId = nextVisit.id;
      }

      // Eliminar el array completo de maintenanceVisits si solo quieres el resumen en esta vista
      // delete work.maintenanceVisits; 

      return {
        ...work, // Todos los campos de la obra y sus otros includes (Permit, Budget)
        nextMaintenanceDate,
        nextVisitNumber,
        nextVisitStatus,
        nextVisitId,
      };
    });

    res.status(200).json(worksWithNextVisitDetails);
  } catch (error) {
    console.error('Error al obtener obras en mantenimiento con detalles:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor.' });
  }
};

// Nueva función para cambiar estados
const changeWorkStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { idWork } = req.params;
    const { targetStatus, reason, force = false } = req.body;

    // Validar que targetStatus sea válido
    const validStatuses = [
      'pending', 'assigned', 'inProgress', 'installed', 
      'firstInspectionPending', 'approvedInspection', 'rejectedInspection',
      'coverPending', 'covered', 'finalInspectionPending', 
      'finalApproved', 'finalRejected', 'invoiceFinal', 
      'paymentReceived', 'maintenance'
    ];

    if (!validStatuses.includes(targetStatus)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: true, 
        message: 'Estado objetivo no válido',
        validStatuses 
      });
    }

    // Obtener el trabajo con todas sus asociaciones
    const work = await Work.findByPk(idWork, {
      include: [
        { model: Inspection, as: 'inspections' },
        { model: InstallationDetail, as: 'installationDetails' },
        { model: Image, as: 'images' },
        { model: FinalInvoice, as: 'finalInvoice' },
        { model: MaintenanceVisit, as: 'maintenanceVisits' }
      ],
      transaction
    });

    if (!work) {
      await transaction.rollback();
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    const currentStatus = work.status;

    // Si el estado es el mismo, no hacer nada
    if (currentStatus === targetStatus) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: true, 
        message: `La obra ya está en estado '${targetStatus}'` 
      });
    }

    const isMovingBackward = isStatusBackward(currentStatus, targetStatus);
    const isMovingForward = isStatusForward(currentStatus, targetStatus);

    // Validar el cambio
    const validation = await validateStatusChange(work, targetStatus, isMovingBackward, force);
    if (!validation.valid) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: true, 
        message: validation.message,
        conflicts: validation.conflicts,
        suggestion: "Use 'force: true' para forzar el cambio ignorando los conflictos"
      });
    }

    // Ejecutar el cambio de estado
    if (isMovingBackward) {
      await rollbackToStatus(work, targetStatus, transaction, reason);
    } else if (isMovingForward) {
      await advanceToStatus(work, targetStatus, transaction);
    }

    // Actualizar el trabajo
    work.status = targetStatus;
    await work.save({ transaction });

    // Log del cambio
    await logStatusChange(idWork, currentStatus, targetStatus, reason, req.staff?.id, transaction);

    await transaction.commit();

    // Recargar trabajo con asociaciones
    const updatedWork = await Work.findByPk(idWork, {
      include: [
        { model: Budget, as: 'budget' },
        { model: Permit },
        { model: Inspection, as: 'inspections' },
        { model: InstallationDetail, as: 'installationDetails' },
        { model: Image, as: 'images' },
        { model: FinalInvoice, as: 'finalInvoice' },
        { model: MaintenanceVisit, as: 'maintenanceVisits' }
      ]
    });

    console.log(`✅ Estado cambiado exitosamente: ${currentStatus} → ${targetStatus} para work ${idWork}`);

    res.status(200).json({
      message: `Estado cambiado de '${currentStatus}' a '${targetStatus}'`,
      work: updatedWork,
      changedBy: req.staff?.id,
      reason,
      direction: isMovingBackward ? 'backward' : isMovingForward ? 'forward' : 'same'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error interno del servidor',
      details: error.message 
    });
  }
};

const validateStatusChangeOnly = async (req, res) => {
  try {
    const { idWork } = req.params;
    const { targetStatus } = req.body;

    const work = await Work.findByPk(idWork, {
      include: [
        { model: Inspection, as: 'inspections' },
        { model: InstallationDetail, as: 'installationDetails' },
        { model: Image, as: 'images' },
        { model: FinalInvoice, as: 'finalInvoice' },
        { model: MaintenanceVisit, as: 'maintenanceVisits' }
      ]
    });

    if (!work) {
      return res.status(404).json({ error: true, message: 'Obra no encontrada' });
    }

    const currentStatus = work.status;
    const isMovingBackward = isStatusBackward(currentStatus, targetStatus);
    
    // Solo validar, no ejecutar
    const validation = await validateStatusChange(work, targetStatus, isMovingBackward, false);
    
    res.status(200).json({
      currentStatus,
      targetStatus,
      isValid: validation.valid,
      conflicts: validation.conflicts || [],
      message: validation.message || 'Validación completada',
      direction: isMovingBackward ? 'backward' : 'forward'
    });

  } catch (error) {
    console.error('Error en validación de estado:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener obras en estado de mantenimiento
const getWorksInMaintenance = async (req, res) => {
  try {
    const works = await Work.findAll({
      where: { status: 'maintenance' },
      include: [
        {
          model: MaintenanceVisit,
          as: 'maintenanceVisits',
          include: [
            { model: Staff, as: 'assignedStaff', attributes: ['id', 'name', 'email'] }
          ]
        },
        { 
          model: Budget, 
          as: 'budget', 
          attributes: ['applicantName', 'propertyAddress'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(works);
  } catch (error) {
    console.error('Error al obtener obras en mantenimiento:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};






module.exports = {
  createWork,
  getWorks,
  getWorkById,
  updateWork,
  deleteWork,
  addInstallationDetail,
  attachInvoiceToWork,
  getAssignedWorks,
  addImagesToWork,
  deleteImagesFromWork,
  getMaintenanceOverviewWorks,
  changeWorkStatus,
  validateStatusChangeOnly,
  getWorksInMaintenance,
};