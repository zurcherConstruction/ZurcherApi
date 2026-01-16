const express = require('express');
const router = express.Router();
const multer = require('multer');
const SimpleWorkController = require('../controllers/SimpleWorkController');
const SimpleWorkPaymentController = require('../controllers/SimpleWorkPaymentController'); // 🆕
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol'); // 🆕

// Configurar multer para archivos en memoria
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limite
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo imágenes (JPG, PNG, GIF) y PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extension = file.originalname.toLowerCase().split('.').pop();
    const extname = allowedTypes.test(extension);
    const mimetype = /image\/(jpeg|jpg|png|gif)|application\/pdf/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF) y PDFs'));
    }
  }
});

/**
 * Rutas para SimpleWork - Trabajos varios
 * Todas las rutas requieren autenticación
 */

// 🔍 GET /api/simple-works - Obtener todos los trabajos con filtros
router.get('/', verifyToken, SimpleWorkController.getAllSimpleWorks);

// 📊 GET /api/simple-works/summary - Resumen financiero
router.get('/summary', verifyToken, SimpleWorkController.getFinancialSummary);

// 🔗 GET /api/simple-works/link-works - Works disponibles para vinculación
router.get('/link-works', verifyToken, SimpleWorkController.getWorksForLinking);

// 📎 POST /simple-works/temp-attachments - Subir archivo temporal (durante creación)
router.post('/temp-attachments', verifyToken, upload.single('file'), SimpleWorkController.uploadTempAttachment);

// 🗑️ DELETE /simple-works/temp-attachments/:attachmentId - Eliminar archivo temporal  
router.delete('/temp-attachments/:attachmentId', verifyToken, SimpleWorkController.deleteTempAttachment);

// 🆕 POST /api/simple-works - Crear nuevo trabajo simple
router.post('/', verifyToken, SimpleWorkController.createSimpleWork);

// 🔍 GET /api/simple-works/:id - Obtener trabajo por ID
router.get('/:id', verifyToken, SimpleWorkController.getSimpleWorkById);

// 📄 GET /api/simple-works/:id/pdf - Generar PDF del presupuesto
router.get('/:id/pdf', verifyToken, SimpleWorkController.generateSimpleWorkPDF);

// 👁️ GET /api/simple-works/:id/view-pdf - Vista previa del PDF (inline)
router.get('/:id/view-pdf', verifyToken, SimpleWorkController.viewSimpleWorkPDF);

// ✏️ PUT /api/simple-works/:id - Actualizar trabajo completo
router.put('/:id', verifyToken, SimpleWorkController.updateSimpleWork);

// ✏️ PATCH /api/simple-works/:id - Actualizar campos específicos del trabajo
router.patch('/:id', verifyToken, SimpleWorkController.updateSimpleWork);

// 🗑️ DELETE /api/simple-works/:id - Eliminar trabajo
router.delete('/:id', verifyToken, SimpleWorkController.deleteSimpleWork);

// 💰 POST /api/simple-works/:id/payments - Agregar pago
router.post('/:id/payments', verifyToken, SimpleWorkController.addPayment);

// 🆕 💳 POST /api/simple-works/:id/payments/financial - Registrar pago con integración financiera completa
router.post('/:id/payments/financial', 
  verifyToken, 
  allowRoles(['admin', 'owner', 'finance', 'recept']),
  upload.single('receipt'), 
  SimpleWorkPaymentController.createPayment
);

// 🆕 📋 GET /api/simple-works/:id/payments/financial - Obtener historial de pagos financieros
router.get('/:id/payments/financial', 
  verifyToken, 
  allowRoles(['admin', 'owner', 'finance', 'finance-viewer', 'recept']),
  SimpleWorkPaymentController.getPayments
);

// 💸 POST /api/simple-works/:id/expenses - Agregar gasto
router.post('/:id/expenses', verifyToken, SimpleWorkController.addExpense);

// 📎 POST /api/simple-works/:id/attachments - Subir archivo adjunto (planos, documentos)
router.post('/:id/attachments', verifyToken, upload.single('file'), SimpleWorkController.uploadAttachment);

// 🗑️ DELETE /api/simple-works/:id/attachments/:attachmentId - Eliminar archivo adjunto
router.delete('/:id/attachments/:attachmentId', verifyToken, SimpleWorkController.deleteAttachment);

// 📧 POST /api/simple-works/:id/send-email - Enviar SimpleWork por email al cliente
router.post('/:id/send-email', verifyToken, SimpleWorkController.sendSimpleWorkToClient);

// ✅ PATCH /api/simple-works/:id/complete - Marcar SimpleWork como completado
router.patch('/:id/complete', verifyToken, SimpleWorkController.markAsCompleted);

module.exports = router;