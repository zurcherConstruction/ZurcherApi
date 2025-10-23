const SignNowService = require('../services/ServiceSignNow');
const { Budget, Permit, ChangeOrder, Work } = require('../data');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../utils/cloudinaryConfig');
const { Op } = require('sequelize');

const signNowController = {
  // Test de conexión
  async testConnection(req, res) {
    try {
      const signNowService = new SignNowService();
      const result = await signNowService.testConnection();
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Conexión con SignNow exitosa',
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Error conectando con SignNow',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error en test de conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // 📋 Listar todos los documentos de SignNow
  async listAllDocuments(req, res) {
    try {
      const page = parseInt(req.query.page) || 0;
      const perPage = parseInt(req.query.per_page) || 50;

      const signNowService = new SignNowService();
      const result = await signNowService.listAllDocuments(page, perPage);

      // Enriquecer con información de la BD si existe
      const enrichedDocuments = await Promise.all(
        result.documents.map(async (doc) => {
          // Buscar si este documento está vinculado a un Budget
          const budget = await Budget.findOne({
            where: { signNowDocumentId: doc.id },
            include: [{ model: Permit, attributes: ['propertyAddress', 'applicantName'] }]
          });

          // Buscar si está vinculado a una Change Order
          const changeOrder = await ChangeOrder.findOne({
            where: { signNowDocumentId: doc.id },
            include: [{ 
              model: Work, 
              attributes: ['propertyAddress'],
              include: [{ model: Permit, attributes: ['propertyAddress'] }]
            }]
          });

          return {
            ...doc,
            linkedBudget: budget ? {
              idBudget: budget.idBudget,
              propertyAddress: budget.Permit?.propertyAddress || budget.propertyAddress,
              applicantName: budget.Permit?.applicantName,
              status: budget.status
            } : null,
            linkedChangeOrder: changeOrder ? {
              id: changeOrder.id,
              propertyAddress: changeOrder.Work?.propertyAddress || changeOrder.Work?.Permit?.propertyAddress,
              status: changeOrder.status,
              signatureStatus: changeOrder.signatureStatus
            } : null
          };
        })
      );

      res.status(200).json({
        success: true,
        documents: enrichedDocuments,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error listing SignNow documents:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // 🔍 Obtener estado de un documento específico
  async getDocumentStatus(req, res) {
    try {
      const { documentId } = req.params;
      const signNowService = new SignNowService();

      const signatureStatus = await signNowService.isDocumentSigned(documentId);
      const documentDetails = await signNowService.getDocumentDetails(documentId);

      res.status(200).json({
        success: true,
        documentId,
        ...signatureStatus,
        details: documentDetails
      });
    } catch (error) {
      console.error('Error getting document status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // 🔁 Reintentar descarga de PDF firmado para un Budget
  async retryBudgetSignedDownload(req, res) {
    try {
      const { idBudget } = req.params;

      const budget = await Budget.findByPk(idBudget, {
        include: [{ model: Permit, attributes: ['propertyAddress', 'applicantName'] }]
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget no encontrado'
        });
      }

      if (!budget.signNowDocumentId) {
        return res.status(400).json({
          success: false,
          message: 'Este presupuesto no tiene un documento de SignNow vinculado'
        });
      }

      if (budget.status !== 'signed' && budget.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'El presupuesto no está marcado como firmado o aprobado. Verifica primero el estado en SignNow.'
        });
      }

      const signNowService = new SignNowService();
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `budget_${budget.idBudget}_signed_retry_${Date.now()}.pdf`);

      // Descargar de SignNow
      await signNowService.downloadSignedDocument(budget.signNowDocumentId, tempFilePath);

      // Subir a Cloudinary
      const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
        folder: 'signed_budgets',
        resource_type: 'raw',
        public_id: `budget_${budget.idBudget}_signed_${Date.now()}`,
        tags: [
          `invoice-${budget.idBudget}`,
          `property-${(budget.Permit?.propertyAddress || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          'budget',
          'signed'
        ],
        context: {
          invoice: budget.idBudget.toString(),
          property: budget.Permit?.propertyAddress || budget.propertyAddress,
          signed_at: budget.signedAt || (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })()
        }
      });

      // Actualizar Budget
      await budget.update({
        signedPdfPath: uploadResult.secure_url,
        signedPdfPublicId: uploadResult.public_id
      });

      // Borrar archivo temporal
      fs.unlinkSync(tempFilePath);

      res.status(200).json({
        success: true,
        message: 'PDF firmado descargado y guardado correctamente',
        signedPdfPath: uploadResult.secure_url
      });
    } catch (error) {
      console.error('Error retrying signed download:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // 🔗 Sincronizar un documento manual de SignNow con un Budget
  async syncManualSignNowDocument(req, res) {
    try {
      const { idBudget } = req.params;
      const { signNowDocumentId } = req.body;

      if (!signNowDocumentId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere signNowDocumentId en el body'
        });
      }

      const budget = await Budget.findByPk(idBudget, {
        include: [{ model: Permit, attributes: ['propertyAddress', 'applicantName'] }]
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: 'Budget no encontrado'
        });
      }

      const signNowService = new SignNowService();

      // Verificar que el documento existe y está firmado
      const signatureStatus = await signNowService.isDocumentSigned(signNowDocumentId);

      if (!signatureStatus.isSigned) {
        return res.status(400).json({
          success: false,
          message: 'El documento en SignNow aún no está firmado',
          signatureStatus
        });
      }

      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `budget_${budget.idBudget}_manual_sync_${Date.now()}.pdf`);

      // Descargar de SignNow
      await signNowService.downloadSignedDocument(signNowDocumentId, tempFilePath);

      // Subir a Cloudinary
      const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
        folder: 'signed_budgets',
        resource_type: 'raw',
        public_id: `budget_${budget.idBudget}_signed_${Date.now()}`,
        tags: [
          `invoice-${budget.idBudget}`,
          `property-${(budget.Permit?.propertyAddress || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          'budget',
          'signed',
          'manual-sync'
        ],
        context: {
          invoice: budget.idBudget.toString(),
          property: budget.Permit?.propertyAddress || budget.propertyAddress,
          signed_at: (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })(),
          sync_type: 'manual'
        }
      });

      // Actualizar Budget
      const localDate = (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      
      await budget.update({
        signNowDocumentId,
        status: 'signed',
        signedAt: localDate,
        signedPdfPath: uploadResult.secure_url,
        signedPdfPublicId: uploadResult.public_id
      });

      // Borrar archivo temporal
      fs.unlinkSync(tempFilePath);

      res.status(200).json({
        success: true,
        message: 'Documento de SignNow sincronizado correctamente',
        budget: {
          idBudget: budget.idBudget,
          status: budget.status,
          signNowDocumentId: budget.signNowDocumentId,
          signedPdfPath: budget.signedPdfPath
        }
      });
    } catch (error) {
      console.error('Error syncing manual SignNow document:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // 📥 Descargar en batch todos los documentos firmados pendientes
  async batchDownloadSigned(req, res) {
    try {
      const signNowService = new SignNowService();
      const results = {
        budgets: { success: [], failed: [] },
        changeOrders: { success: [], failed: [] }
      };

      // Buscar Budgets firmados sin PDF en Cloudinary
      const pendingBudgets = await Budget.findAll({
        where: {
          status: 'signed',
          signedPdfPath: null,
          signNowDocumentId: { [Op.ne]: null }
        },
        include: [{ model: Permit, attributes: ['propertyAddress', 'applicantName'] }]
      });

      console.log(`📥 Encontrados ${pendingBudgets.length} presupuestos firmados pendientes de descarga`);

      for (const budget of pendingBudgets) {
        try {
          const tempDir = path.join(__dirname, '../../temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(tempDir, `budget_${budget.idBudget}_batch_${Date.now()}.pdf`);

          await signNowService.downloadSignedDocument(budget.signNowDocumentId, tempFilePath);

          const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'signed_budgets',
            resource_type: 'raw',
            public_id: `budget_${budget.idBudget}_signed_${Date.now()}`,
            tags: [
              `invoice-${budget.idBudget}`,
              `property-${(budget.Permit?.propertyAddress || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
              'budget',
              'signed',
              'batch-download'
            ]
          });

          await budget.update({
            signedPdfPath: uploadResult.secure_url,
            signedPdfPublicId: uploadResult.public_id
          });

          fs.unlinkSync(tempFilePath);
          results.budgets.success.push(budget.idBudget);
        } catch (error) {
          console.error(`❌ Error con Budget ${budget.idBudget}:`, error.message);
          results.budgets.failed.push({ id: budget.idBudget, error: error.message });
        }
      }

      // Similar para Change Orders
      const pendingCOs = await ChangeOrder.findAll({
        where: {
          signatureStatus: 'completed',
          signedPdfPath: null,
          signNowDocumentId: { [Op.ne]: null }
        }
      });

      console.log(`📥 Encontradas ${pendingCOs.length} órdenes de cambio firmadas pendientes de descarga`);

      for (const co of pendingCOs) {
        try {
          const tempDir = path.join(__dirname, '../../temp');
          const tempFilePath = path.join(tempDir, `change_order_${co.id}_batch_${Date.now()}.pdf`);

          await signNowService.downloadSignedDocument(co.signNowDocumentId, tempFilePath);

          const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'signed_change_orders',
            resource_type: 'raw',
            public_id: `change_order_${co.id}_signed_${Date.now()}`,
            tags: ['change-order', 'signed', 'batch-download']
          });

          await co.update({
            signedPdfPath: uploadResult.secure_url,
            signedPdfPublicId: uploadResult.public_id
          });

          fs.unlinkSync(tempFilePath);
          results.changeOrders.success.push(co.id);
        } catch (error) {
          console.error(`❌ Error con Change Order ${co.id}:`, error.message);
          results.changeOrders.failed.push({ id: co.id, error: error.message });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Descarga en batch completada',
        results
      });
    } catch (error) {
      console.error('Error in batch download:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};


module.exports = signNowController;

