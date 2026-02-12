const express = require('express');
const { Budget, Work, WorkNote, BudgetItem, Image, Receipt, Permit } = require('../data');
const { Op } = require('sequelize');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const DocuSignService = require('../services/ServiceDocuSign');
const { verifyToken } = require('../middleware/isAuth'); // 🔒 Middleware de autenticación
const router = express.Router();

// ========== RUTAS PÚBLICAS DEL PORTAL DEL CLIENTE ==========
// Permite a los clientes ver el estado de sus proyectos usando un token único

/**
 * Generar token único para cliente
 * POST /api/client-portal/generate-token
 * Body: { applicantEmail, contactCompany? }
 * 🔒 PROTEGIDO: Solo administradores pueden generar tokens
 */
router.post('/generate-token', verifyToken, async (req, res) => {
  try {
    const { applicantEmail, contactCompany } = req.body;

    if (!applicantEmail) {
      return res.status(400).json({
        success: false,
        message: 'applicantEmail es requerido'
      });
    }

    // Generar token único basado en email + salt random
    const tokenSalt = crypto.randomBytes(16).toString('hex');
    const clientToken = crypto
      .createHash('sha256')
      .update(applicantEmail + tokenSalt + process.env.JWT_SECRET || 'default-secret')
      .digest('hex');

    // Buscar presupuestos del cliente
    const whereClause = { applicantEmail };
    if (contactCompany) {
      whereClause.contactCompany = contactCompany;
    }

    const budgets = await Budget.findAll({
      where: whereClause,
      attributes: ['idBudget', 'applicantName', 'propertyAddress', 'status']
    });

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron presupuestos para este cliente'
      });
    }

    // Actualizar todos los budgets del cliente con el mismo token
    await Budget.update(
      { clientPortalToken: clientToken },
      { where: whereClause }
    );

    res.status(200).json({
      success: true,
      message: 'Token de portal del cliente generado exitosamente',
      data: {
        clientToken,
        clientEmail: applicantEmail,
        projectsCount: budgets.length,
        portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client-portal/${clientToken}`
      }
    });

  } catch (error) {
    console.error('❌ Error generando token del portal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Obtener dashboard completo del cliente (info + works)
 * GET /client-portal/:token
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const budgets = await Budget.findAll({
      where: { clientPortalToken: token },
      attributes: [
        'idBudget', 'applicantName', 'applicantEmail', 'contactCompany',
        'propertyAddress', 'status', 'date', 'initialPayment'
      ],
      include: [{
        model: Work,
        required: false,
        attributes: [
          'idWork', 'status', 'startDate', 'endDate', 'propertyAddress',
          'maintenanceStartDate', 'installationStartDate'
        ]
      }]
    });

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Organizar datos del cliente y works
    const clientInfo = {
      name: budgets[0].applicantName,
      email: budgets[0].applicantEmail,
      company: budgets[0].contactCompany,
      projectsCount: budgets.length,
    };

    const works = budgets
      .filter(budget => budget.Work)
      .map(budget => {
        const work = budget.Work;
        return {
          idWork: work.idWork,
          idBudget: budget.idBudget,
          propertyAddress: work.propertyAddress || budget.propertyAddress,
          status: work.status,
          startDate: work.startDate,
          endDate: work.endDate,
          installationStartDate: work.installationStartDate,
          maintenanceStartDate: work.maintenanceStartDate,
          budgetStatus: budget.status,
          initialPayment: budget.initialPayment
        };
      });

    res.status(200).json({
      success: true,
      message: 'Dashboard del cliente cargado exitosamente',
      data: {
        client: clientInfo,
        works: works,
        totalWorks: works.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo dashboard del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Obtener información del cliente por token
 * GET /client-portal/:token/info
 */
router.get('/:token/info', async (req, res) => {
  try {
    const { token } = req.params;

    const budgets = await Budget.findAll({
      where: { clientPortalToken: token },
      attributes: [
        'idBudget', 'applicantName', 'applicantEmail', 'contactCompany',
        'propertyAddress', 'status', 'date', 'initialPayment'
      ],
      include: [{
        model: Work,
        required: false,
        attributes: [
          'idWork', 'status', 'startDate', 'endDate', 'propertyAddress',
          'maintenanceStartDate', 'installationStartDate'
        ]
      }]
    });

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Organizar datos del cliente
    const clientInfo = {
      name: budgets[0].applicantName,
      email: budgets[0].applicantEmail,
      company: budgets[0].contactCompany,
      projectsCount: budgets.length,
      projects: budgets.map(budget => ({
        idBudget: budget.idBudget,
        propertyAddress: budget.propertyAddress,
        status: budget.status,
        date: budget.date,
        initialPayment: budget.initialPayment,
        hasWork: !!budget.Work,
        workStatus: budget.Work?.status || null,
        workStartDate: budget.Work?.startDate || null,
        workEndDate: budget.Work?.endDate || null,
        workInstallationStartDate: budget.Work?.installationStartDate || null,
        workMaintenanceStartDate: budget.Work?.maintenanceStartDate || null
      }))
    };

    res.status(200).json({
      success: true,
      data: clientInfo
    });

  } catch (error) {
    console.error('❌ Error obteniendo información del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Obtener works del cliente
 * GET /api/client-portal/:token/works
 */
router.get('/:token/works', async (req, res) => {
  try {
    const { token } = req.params;

    // Primero verificar que el token es válido
    const budgets = await Budget.findAll({
      where: { clientPortalToken: token },
      attributes: ['idBudget']
    });

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Token inválido'
      });
    }

    const budgetIds = budgets.map(b => b.idBudget);

    // Obtener works asociados a estos budgets con información completa
    const works = await Work.findAll({
      where: {
        idBudget: { [Op.in]: budgetIds }
      },
      attributes: [
        'idWork', 'propertyAddress', 'status', 'startDate', 'endDate',
        'maintenanceStartDate', 'installationStartDate', 'idBudget',
        'operatingPermitUrl', 'operatingPermitSentAt',
        'maintenanceServiceUrl', 'maintenanceServiceSentAt', 'createdAt'
      ],
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: [
            'idBudget', 'applicantName', 'propertyAddress', 'initialPayment',
            'status', 'date', 'signatureMethod', 'signedPdfPath', 
            'manualSignedPdfPath', 'clientPortalToken'
          ]
        },
        {
          model: WorkNote,
          as: 'workNotes',
          required: false,
          where: { isVisibleToClient: true }, // Solo notas visibles al cliente
          attributes: ['message', 'createdAt']
        }
      ],
      order: [['startDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: works
    });

  } catch (error) {
    console.error('❌ Error obteniendo works del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Obtener presupuesto firmado
 * GET /api/client-portal/:token/budget/:idBudget
 */
router.get('/:token/budget/:idBudget', async (req, res) => {
  try {
    const { token, idBudget } = req.params;

    const budget = await Budget.findOne({
      where: {
        idBudget: parseInt(idBudget),
        clientPortalToken: token
      },
      include: [{
        model: BudgetItem,
        as: 'budgetItems',
        attributes: ['description', 'quantity', 'unitPrice', 'totalPrice']
      }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Presupuesto no encontrado o no autorizado'
      });
    }

    // Solo mostrar si está aprobado
    if (budget.status !== 'approved' && budget.status !== 'in_progress') {
      return res.status(403).json({
        success: false,
        message: 'Presupuesto no está aprobado aún'
      });
    }

    res.status(200).json({
      success: true,
      data: budget
    });

  } catch (error) {
    console.error('❌ Error obteniendo presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ========== RUTAS DE ADMINISTRACIÓN ==========

/**
 * Ruta: GET /api/client-portal/admin/budgets-with-portal-status
 * Descripción: Obtiene todos los presupuestos con información del estado de su portal
 * Acceso: Solo administradores y personal autorizado
 */
router.get('/admin/budgets-with-portal-status', verifyToken, async (req, res) => {
  try {
    // Obtener presupuestos con conteo de trabajos
    const budgets = await Budget.findAll({
      attributes: [
        'idBudget',
        'applicantEmail',
        'contactCompany',
        'applicantName',
        'clientPortalToken',
        'createdAt'
      ],
      include: [{
        model: Work,
        attributes: ['idWork'],
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    // Procesar datos para incluir información del portal
    const budgetsWithPortalInfo = budgets.map(budget => {
      const budgetData = budget.toJSON();
      
      return {
        id: budgetData.idBudget,
        applicantEmail: budgetData.applicantEmail,
        contactCompany: budgetData.contactCompany,
        applicantName: budgetData.applicantName,
        clientPortalToken: budgetData.clientPortalToken,
        createdAt: budgetData.createdAt,
        worksCount: budgetData.Work ? 1 : 0, // Ajustar si hay múltiples works por budget
        hasPortal: !!budgetData.clientPortalToken,
        portalUrl: budgetData.clientPortalToken 
          ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client-portal/${budgetData.clientPortalToken}`
          : null
      };
    });

    res.json(budgetsWithPortalInfo);
    
  } catch (error) {
    console.error('Error obteniendo presupuestos con estado de portal:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
});

// ========== ENDPOINTS PARA DETALLES DE PROYECTO INDIVIDUAL ==========

/**
 * Obtener documentos específicos de un work
 * GET /api/client-portal/:token/work/:workId/documents
 */
router.get('/:token/work/:workId/documents', async (req, res) => {
  try {
    const { token, workId } = req.params;

    // Verificar token y obtener work con información completa
    const budgets = await Budget.findAll({
      where: { clientPortalToken: token },
      include: [{
        model: Work,
        where: { idWork: workId },
        required: true,
        attributes: [
          'idWork', 'operatingPermitUrl', 'operatingPermitSentAt',
          'maintenanceServiceUrl', 'maintenanceServiceSentAt',
          'noticeToOwnerDocumentUrl', 'lienDocumentUrl', 'createdAt'
        ],
        include: [{
          model: Permit,
          as: 'Permit',
          required: false
        }]
      }],
      attributes: [
        'idBudget', 'signedPdfPath', 'manualSignedPdfPath', 'signatureMethod',
        'signatureDocumentId', 'paymentInvoice', 'paymentProofAmount',
        'applicantName', 'propertyAddress', 'initialPayment'
      ]
    });

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work not found or invalid token'
      });
    }

    // Buscar FinalInvoice para este work
    const FinalInvoice = require('../data').FinalInvoice;
    const finalInvoice = await FinalInvoice.findOne({
      where: { workId: workId },
      attributes: ['id', 'invoiceNumber', 'finalAmountDue', 'status']
    });

    // Helper function to convert local paths to server URLs
    const convertToServerUrl = (filePath) => {
      if (!filePath) return null;
      
      // If it's already a Cloudinary URL, ensure it's properly formatted for PDF viewing
      if (filePath.includes('cloudinary.com')) {
        // For Cloudinary raw uploads (like PDFs), ensure proper format
        if (filePath.includes('/raw/upload/')) {
          return filePath; // Return Cloudinary URL as-is for raw uploads
        }
        return filePath;
      }
      
      // If it's a local path, convert to server URL with correct separators
      const uploadsIndex = filePath.indexOf('uploads');
      if (uploadsIndex === -1) return filePath; // Return as-is if no uploads folder found
      const relativePath = filePath.substring(uploadsIndex).replace(/\\/g, '/'); // Fix path separators
      return `${process.env.API_URL || 'http://localhost:3001'}/${relativePath}`;
    };

    const budget = budgets[0];
    const work = budget.Work;

    // Crear respuesta con documentos disponibles - información más completa
    const documents = {
      signedBudget: {
        available: !!(budget.signedPdfPath || budget.manualSignedPdfPath),
        url: convertToServerUrl(budget.signedPdfPath || budget.manualSignedPdfPath),
        signatureMethod: budget.signatureMethod || 'none',
        budgetInfo: {
          applicantName: budget.applicantName,
          propertyAddress: budget.propertyAddress,
          initialPayment: budget.initialPayment
        }
      },
      operationPermit: {
        available: !!(work.operatingPermitUrl || work.Permit),
        url: work.operatingPermitUrl ? convertToServerUrl(work.operatingPermitUrl) : 
             (work.Permit?.permitPdfUrl ? work.Permit.permitPdfUrl : null),
        sentAt: work.operatingPermitSentAt || null,
        permitData: work.Permit || null,
        hasDocument: !!(work.operatingPermitUrl || work.Permit?.permitPdfUrl),
        hasDataOnly: !!work.Permit && !work.operatingPermitUrl && !work.Permit?.permitPdfUrl
      },
      maintenanceService: {
        available: !!work.maintenanceServiceUrl,
        url: convertToServerUrl(work.maintenanceServiceUrl),
        sentAt: work.maintenanceServiceSentAt || null
      },
      finalInvoice: {
        available: !!finalInvoice,
        hasFinalInvoice: !!finalInvoice,
        finalInvoiceId: finalInvoice?.id || null,
        invoiceNumber: finalInvoice?.invoiceNumber || null,
        amount: finalInvoice?.finalAmountDue || budget.paymentProofAmount || null,
        status: finalInvoice?.status || null,
        // Solo para referencia, no se usa en el portal
        paymentProofUrl: budget.paymentInvoice && budget.paymentInvoice.includes('cloudinary.com') ? budget.paymentInvoice : null,
        paymentProofLocalPath: budget.paymentInvoice && !budget.paymentInvoice.includes('cloudinary.com') ? budget.paymentInvoice : null
      },
      additionalDocuments: {
        noticeToOwner: {
          available: !!work.noticeToOwnerDocumentUrl,
          url: convertToServerUrl(work.noticeToOwnerDocumentUrl)
        },
        lien: {
          available: !!work.lienDocumentUrl,
          url: convertToServerUrl(work.lienDocumentUrl)
        }
      },
      ppiSignature: {
        required: true, // Por defecto requerido
        signed: !!(budget.signatureDocumentId),
        signatureUrl: budget.signatureDocumentId ? `/client-portal/${token}/ppi-sign/${workId}` : null
      }
    };

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Error obteniendo documentos del work:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading work documents',
      error: error.message
    });
  }
});

/**
 * Obtener fotos específicas de un work
 * GET /api/client-portal/:token/work/:workId/photos
 */
router.get('/:token/work/:workId/photos', async (req, res) => {
  try {
    const { token, workId } = req.params;
    const { stage } = req.query; // Opcional: filtrar por stage

    // Verificar token
    const budget = await Budget.findOne({
      where: { clientPortalToken: token },
      include: [{
        model: Work,
        where: { idWork: workId },
        required: true
      }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Work not found or invalid token'
      });
    }

    // Buscar fotos del work
    const whereClause = { idWork: workId };
    if (stage) {
      whereClause.stage = stage;
    }

    const photos = await Image.findAll({
      where: whereClause,
      attributes: ['stage', 'imageUrl', 'publicId', 'comment', 'dateTime'],
      order: [['dateTime', 'DESC']]
    });

    // Agrupar fotos por categoría para el cliente
    const photoCategories = {
      installation: photos.filter(p => p.stage === 'sistema instalado'),
      cover: photos.filter(p => p.stage === 'trabajo cubierto'),
      all: photos
    };

    res.json({
      success: true,
      data: photoCategories
    });

  } catch (error) {
    console.error('Error obteniendo fotos del work:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading work photos',
      error: error.message
    });
  }
});

/**
 * Obtener comprobantes de pago de un work
 * GET /api/client-portal/:token/work/:workId/receipts
 */
router.get('/:token/work/:workId/receipts', async (req, res) => {
  try {
    const { token, workId } = req.params;

    // Just return a simple response for now to test the endpoint
    res.json({
      success: true,
      data: {
        initialPayment: [],
        finalPayment: [],
        all: []
      }
    });

  } catch (error) {
    console.error('Error obteniendo receipts del work:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading payment receipts',
      error: error.message
    });
  }
});

/**
 * Generar enlace para firma PPI o vista del documento firmado
 * GET /api/client-portal/:token/ppi-sign/:workId
 */
router.get('/:token/ppi-sign/:workId', async (req, res) => {
  try {
    const { token, workId } = req.params;

    // Verificar token
    const budget = await Budget.findOne({
      where: { clientPortalToken: token },
      include: [{
        model: Work,
        where: { idWork: workId },
        required: true
      }, {
        model: Permit,
        attributes: ['applicantEmail', 'applicantName']
      }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Work not found or invalid token'
      });
    }

    const isSigned = !!(budget.signatureDocumentId);
    
    // Si ya está firmado, retornar URL del documento firmado
    if (isSigned) {
      return res.json({
        success: true,
        data: {
          isSigned: true,
          signedPdfUrl: budget.signedPdfPath || budget.manualSignedPdfPath || null,
          budgetId: budget.idBudget,
          signatureMethod: budget.signatureMethod
        }
      });
    }

    // Si no está firmado, verificar que haya un envelope de DocuSign
    const envelopeId = budget.docusignEnvelopeId || budget.signatureDocumentId;
    
    if (!envelopeId) {
      // No hay documento enviado para firma aún
      return res.json({
        success: true,
        data: {
          isSigned: false,
          notSentYet: true,
          message: 'PPI document has not been sent for signature yet. Please contact support.',
          budgetId: budget.idBudget
        }
      });
    }

    // Solo funciona con DocuSign
    if (budget.signatureMethod !== 'docusign') {
      return res.json({
        success: true,
        data: {
          isSigned: false,
          notDocuSign: true,
          message: 'This document was sent with a different signature method. Please check your email for the signing link.',
          signatureMethod: budget.signatureMethod,
          budgetId: budget.idBudget
        }
      });
    }

    // Obtener datos del cliente
    const clientEmail = budget.Permit?.applicantEmail || budget.applicantEmail;
    const clientName = budget.Permit?.applicantName || budget.applicantName || 'Valued Client';

    if (!clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Client email not found'
      });
    }

    console.log(`📧 Generando enlace de firma PPI para: ${clientEmail}`);
    console.log(`📋 Envelope ID: ${envelopeId}`);

    // Inicializar servicio DocuSign y generar enlace de firma
    const docuSignService = new DocuSignService();
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/client-portal/${token}`;
    
    const signingUrl = await docuSignService.getRecipientViewUrl(
      envelopeId,
      clientEmail,
      clientName,
      returnUrl
    );

    console.log('✅ Enlace de firma generado exitosamente');

    res.json({
      success: true,
      data: {
        isSigned: false,
        signUrl: signingUrl,
        budgetId: budget.idBudget,
        signatureMethod: budget.signatureMethod,
        expiresIn: '5-15 minutes after first access'
      }
    });

  } catch (error) {
    console.error('❌ Error generando enlace PPI:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PPI signature link',
      error: error.message
    });
  }
});

// ========== ENDPOINTS PARA SERVIR PDFs COMO BLOB ==========

/**
 * Servir PDF del presupuesto firmado como blob
 * GET /client-portal/:token/pdf/signed-budget/:budgetId
 */
router.get('/:token/pdf/signed-budget/:budgetId', async (req, res) => {
  try {
    const { token, budgetId } = req.params;

    // Verificar token y obtener budget
    const budget = await Budget.findOne({
      where: { 
        clientPortalToken: token,
        idBudget: budgetId 
      }
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or invalid token'
      });
    }

    const filePath = budget.signedPdfPath || budget.manualSignedPdfPath;
    if (!filePath || !require('fs').existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Signed PDF file not found'
      });
    }

    // Leer el archivo y enviarlo como stream
    const fs = require('fs');
    const path = require('path');
    
    // Obtener estadísticas del archivo
    const stat = fs.statSync(filePath);
    
    // Servir archivo con headers optimizados para vista inline
    const origin = req.headers.origin || '*';
    console.log('🌐 Setting CORS origin to:', origin);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline; filename="signed-budget.pdf"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Crear stream de lectura y pipe a la respuesta
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error serving signed budget PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading signed budget PDF'
    });
  }
});

/**
 * Servir PDF del PPI firmado como blob
 * GET /client-portal/:token/work/:workId/pdf/ppi-signed
 */
router.get('/:token/work/:workId/pdf/ppi-signed', async (req, res) => {
  try {
    const { token, workId } = req.params;

    // Verificar token y obtener budget asociado al work
    const budget = await Budget.findOne({
      where: { clientPortalToken: token },
      include: [{
        model: Work,
        where: { idWork: workId },
        required: true
      }]
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Work not found or invalid token'
      });
    }

    const filePath = budget.signedPdfPath || budget.manualSignedPdfPath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Signed PPI PDF file not found'
      });
    }

    // Obtener estadísticas del archivo
    const stat = fs.statSync(filePath);
    
    // Servir archivo con headers optimizados para vista inline
    const origin = req.headers.origin || '*';
    console.log('🌐 Setting CORS origin to:', origin);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline; filename="ppi-signed.pdf"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Crear stream de lectura y pipe a la respuesta
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error serving signed PPI PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading signed PPI PDF'
    });
  }
});

/**
 * Servir PDF del invoice final como blob  
 * GET /client-portal/:token/pdf/final-invoice/:budgetId
 */
router.get('/:token/pdf/final-invoice/:budgetId', async (req, res) => {
  try {
    const { token, budgetId } = req.params;
    console.log('\ud83d\udd0d Final Invoice Request - Token:', token.substring(0, 10) + '...', 'Budget ID:', budgetId);

    // Verificar token y obtener budget
    const budget = await Budget.findOne({
      where: { 
        clientPortalToken: token,
        idBudget: budgetId 
      }
    });

    if (!budget) {
      console.log('\u274c Budget not found for token/budgetId');
      return res.status(404).json({
        success: false,
        message: 'Budget not found or invalid token'
      });
    }

    const filePath = budget.paymentInvoice;
    console.log('\ud83d\udcc4 Payment invoice path:', filePath);
    
    if (!filePath) {
      console.log('\u274c No payment invoice path found');
      return res.status(404).json({
        success: false,
        message: 'Final invoice not found'
      });
    }

    // Si es URL de Cloudinary, hacer fetch y streamear con headers inline
    if (filePath.includes('cloudinary.com')) {
      console.log('☁️ Fetching from Cloudinary and streaming with inline headers:', filePath);
      
      try {
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const urlObj = url.parse(filePath);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        // Hacer request a Cloudinary
        protocol.get(filePath, (cloudinaryResponse) => {
          if (cloudinaryResponse.statusCode !== 200) {
            return res.status(404).json({
              success: false,
              message: 'Final invoice not found in Cloudinary'
            });
          }
          
          // Configurar headers para visualización inline
          const origin = req.headers.origin || '*';
          console.log('🌐 Setting CORS origin to:', origin);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'inline; filename="final-invoice.pdf"');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
          
          console.log('✅ Streaming Cloudinary file with inline headers');
          
          // Stream la respuesta de Cloudinary
          cloudinaryResponse.pipe(res);
        }).on('error', (error) => {
          console.error('❌ Error fetching from Cloudinary:', error);
          return res.status(500).json({
            success: false,
            message: 'Error loading final invoice from Cloudinary'
          });
        });
        
        return;
      } catch (error) {
        console.error('❌ Error fetching from Cloudinary:', error);
        return res.status(500).json({
          success: false,
          message: 'Error loading final invoice from Cloudinary'
        });
      }
    }

    // Si es archivo local, servirlo
    if (!require('fs').existsSync(filePath)) {
      console.log('\u274c File does not exist:', filePath);
      return res.status(404).json({
        success: false,
        message: 'Final invoice file not found'
      });
    }

    // Leer el archivo y enviarlo como stream
    const fs = require('fs');
    const path = require('path');
    
    // Obtener estadísticas del archivo
    const stat = fs.statSync(filePath);
    console.log('\ud83d\udcc4 File stats - Size:', stat.size, 'bytes');
    
    // Servir archivo con headers optimizados para vista inline
    const origin = req.headers.origin || '*';
    console.log('🌐 Setting CORS origin to:', origin);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline; filename="final-invoice.pdf"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    console.log('\u2705 Serving file as stream with inline headers');
    
    // Crear stream de lectura y pipe a la respuesta
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error serving final invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading final invoice PDF'
    });
  }
});

/**
 * Servir PDF del Final Invoice generado como blob (preview dinámico)
 * GET /client-portal/:token/work/:workId/pdf/final-invoice-generated/:finalInvoiceId
 */
router.get('/:token/work/:workId/pdf/final-invoice-generated/:finalInvoiceId', async (req, res) => {
  try {
    const { token, workId, finalInvoiceId } = req.params;
    console.log('🔍 Final Invoice Generated Request - Token:', token.substring(0, 10) + '...', 'Work ID:', workId, 'Invoice ID:', finalInvoiceId);

    // Verificar token y que este work pertenezca al cliente
    const budget = await Budget.findOne({
      where: { clientPortalToken: token },
      include: [{
        model: Work,
        as: 'Work',
        where: { idWork: workId },
        required: true,
        attributes: ['idWork']
      }],
      attributes: ['idBudget']
    });

    if (!budget || !budget.Work) {
      console.log('❌ Work not found or does not belong to this token');
      return res.status(404).json({
        success: false,
        message: 'Invalid token or work not found'
      });
    }

    console.log('✅ Work verified for this token');

    // Importar modelos necesarios
    const { FinalInvoice, WorkExtraItem, ChangeOrder } = require('../data');
    const { generateAndSaveFinalInvoicePDF } = require('../utils/pdfGenerators');

    console.log('🔍 Looking for FinalInvoice with ID:', finalInvoiceId, 'for work:', workId);

    // Buscar el final invoice que pertenezca a ESTE work específico
    const finalInvoice = await FinalInvoice.findOne({
      where: { 
        id: finalInvoiceId,
        workId: workId // Verificar que pertenece específicamente a este work
      },
      include: [
        { model: WorkExtraItem, as: 'extraItems' },
        {
          model: Work,
          as: 'Work',
          include: [
            { model: Budget, as: 'budget', include: [{ model: Permit }] },
            { model: ChangeOrder, as: 'changeOrders' }
          ]
        }
      ]
    });

    if (!finalInvoice) {
      console.log('❌ Final invoice not found for this work');
      
      // Debug: Buscar si existe el invoice con otro workId
      const anyInvoice = await FinalInvoice.findByPk(finalInvoiceId, { attributes: ['id', 'workId'] });
      if (anyInvoice) {
        console.log('⚠️ Invoice exists but belongs to work:', anyInvoice.workId, 'not to:', workId);
      } else {
        console.log('⚠️ Invoice ID', finalInvoiceId, 'does not exist in database');
      }
      
      return res.status(404).json({
        success: false,
        message: 'Final invoice not found for this work'
      });
    }

    console.log('✅ Final invoice found for work:', finalInvoice.workId);

    // Generar PDF temporal
    console.log('📄 Generating temporary PDF for final invoice...');
    const tempInvoiceData = {
      ...finalInvoice.toJSON(),
      _isPreview: true,
      _tempSuffix: `_clientportal_${Date.now()}`
    };
    
    const tempPdfPath = await generateAndSaveFinalInvoicePDF(tempInvoiceData);
    console.log('✅ PDF generated at:', tempPdfPath);

    // Configurar headers para vista inline
    const origin = req.headers.origin || '*';
    console.log('🌐 Setting CORS origin to:', origin);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="final-invoice-${finalInvoice.invoiceNumber}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    console.log('✅ Streaming generated PDF with inline headers');

    // Stream el archivo
    const fileStream = fs.createReadStream(tempPdfPath);
    fileStream.pipe(res);

    // Limpiar el archivo temporal después de enviarlo
    fileStream.on('close', () => {
      fs.unlink(tempPdfPath, (err) => {
        if (err) {
          console.error(`Error deleting temporary PDF ${tempPdfPath}:`, err);
        } else {
          console.log(`✅ Temporary PDF ${tempPdfPath} deleted`);
        }
      });
    });

    fileStream.on('error', (err) => {
      console.error('❌ Error streaming PDF:', err);
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    });

  } catch (error) {
    console.error('❌ Error generating final invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating final invoice PDF'
    });
  }
});

module.exports = router;