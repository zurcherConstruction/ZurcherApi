const express = require('express');
const BudgetController = require('../controllers/BudgetController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol');
const { upload } = require('../middleware/multer');
const { verifyPendingSignatures } = require('../controllers/SignatureVerificationController');
const router = express.Router();

// ========== NOTA: Las rutas públicas están en BudgetPublicRoutes.js ==========
// Se movieron a un archivo separado para evitar que el middleware verifyToken las bloquee

// ========== RUTAS CON AUTENTICACIÓN ==========

// Rutas con validación de token y roles
router.post('/',  allowRoles(['admin', 'recept', 'owner', 'finance']), BudgetController.createBudget);

// 🆕 NUEVA RUTA: Crear presupuestos/trabajos legacy (migración)
router.post('/legacy', verifyToken, allowRoles(['admin', 'owner']), upload.fields([
  { name: 'permitPdf', maxCount: 1 },
  { name: 'budgetPdf', maxCount: 1 },
  { name: 'optionalDocs', maxCount: 1 }
]), BudgetController.createLegacyBudget); // Solo admin y owner pueden migrar

router.get('/all', verifyToken, isStaff, BudgetController.getBudgets); // Personal del hotel puede ver presupuestos

// 🆕 EXPORTAR BUDGETS A EXCEL
router.get('/export/excel', verifyToken, allowRoles(['admin', 'owner', 'finance']), BudgetController.exportBudgetsToExcel);

router.post(
    '/:idBudget/upload',
    verifyToken,
    allowRoles(['admin', 'recept', 'owner', 'finance']),
    upload.single('file'), // Middleware correcto
    BudgetController.uploadInvoice
  );
  router.post(
    '/:idBudget/upload-pdf',
    verifyToken,
    allowRoles(['admin', 'recept', 'owner', 'finance']), // Roles permitidos
    upload.single('file'), // Middleware para manejar el archivo
    BudgetController.uploadBudgetPDF // Controlador para manejar la lógica
);

// Ruta para descargar el PDF
router.get(
  '/:idBudget/pdf',
  verifyToken, // Verificar que hay un token válido
  isStaff,     // O el rol/roles adecuados (ej: allowRoles(['admin', 'recept', 'owner', 'staff']))
  BudgetController.downloadBudgetPDF // Controlador para manejar la descarga
);
// Ruta para VER el PDF
router.get(
  '/:idBudget/view/pdf',
  verifyToken, // Verificar que hay un token válido
  isStaff,     // O el rol/roles adecuados (ej: allowRoles(['admin', 'recept', 'owner', 'staff']))
  BudgetController.viewBudgetPDF // Controlador para manejar la descarga
);

router.get('/:idBudget/preview',verifyToken, isStaff, BudgetController.previewBudgetPDF);

// === NUEVAS RUTAS PARA PDF DE PERMISO Y OPCIONALES ===
router.get(
  '/:idBudget/permit-pdf',
  verifyToken,
  isStaff,
  BudgetController.permitPdf
);
router.get(
  '/:idBudget/optional-docs',
  verifyToken,
  isStaff,
  BudgetController.optionalDocs
);

// === NUEVA RUTA PARA PDF DEL PRESUPUESTO LEGACY ===
router.get(
  '/:idBudget/legacy-budget-pdf',
  verifyToken,
  isStaff,
  BudgetController.legacyBudgetPdf
);

// 🆕 Enviar presupuesto para REVISIÓN del cliente (sin firma, solo lectura)
router.post(
  '/:idBudget/send-for-review',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'finance']),
  BudgetController.sendBudgetForReview
);

// 🆕 CONVERTIR DRAFT A INVOICE DEFINITIVO
router.post(
  '/:idBudget/convert-to-invoice',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  BudgetController.convertDraftToInvoice
);

// ========== RUTAS DE SIGNNOW ==========

// Enviar presupuesto a SignNow para firma
router.post(
  '/:idBudget/send-to-signnow',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'finance']),
  BudgetController.sendBudgetToSignNow
);

// Verificar estado de firma del presupuesto
router.get(
  '/:idBudget/signature-status',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'finance', 'staff']), // Staff y Finance también pueden consultar estado
  BudgetController.checkSignatureStatus
);

// Descargar documento firmado
router.get(
  '/:idBudget/download-signed',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'staff']), // Staff también puede descargar firmados
  BudgetController.downloadSignedBudget
);

// 🆕 Visualizar documento firmado (inline, para modal)
router.get(
  '/:idBudget/view-signed',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'staff', 'finance']), // Todos pueden visualizar
  BudgetController.viewSignedBudget
);

// 🆕 Visualizar documento firmado manualmente (proxy de Cloudinary)
router.get(
  '/:idBudget/view-manual-signed',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'staff', 'finance']), // Todos pueden visualizar
  BudgetController.viewManualSignedBudget
);

// 🔁 Reintentar descarga de PDF firmado
const signNowController = require('../controllers/signNowController');
router.post(
  '/:idBudget/retry-signed-download',
  verifyToken,
  allowRoles(['admin', 'owner']),
  signNowController.retryBudgetSignedDownload
);

// 🔗 Sincronizar documento manual de SignNow
router.post(
  '/:idBudget/sync-manual-signnow',
  verifyToken,
  allowRoles(['admin', 'owner']),
  signNowController.syncManualSignNowDocument
);

// 📤 Subir PDF firmado manualmente (no desde SignNow)
router.post(
  '/:idBudget/upload-manual-signed',
  verifyToken,
  allowRoles(['admin', 'owner', 'recept']), // recept puede subir también
  upload.single('file'), // Usar multer para recibir el archivo PDF
  BudgetController.uploadManualSignedPdf
);

// ========== RUTAS EXISTENTES ==========

  router.put('/:idBudget', verifyToken, BudgetController.updateBudget); // Solo administradores pueden actualizar presupuestos
  router.get('/:idBudget', verifyToken, isStaff, BudgetController.getBudgetById); // Personal del hotel puede ver un presupuesto específico

router.delete('/:idBudget', verifyToken, isOwner, BudgetController.deleteBudget); // Solo el dueño puede eliminar presupuestos

// ========== RUTAS PARA EDITAR DATOS DE CLIENTE ==========

// Obtener datos de cliente de un presupuesto
router.get(
  '/:idBudget/client-data',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner', 'finance']),
  BudgetController.getClientData
);

// Actualizar datos de cliente de un presupuesto (actualiza tanto Budget como Permit)
router.patch(
  '/:idBudget/client-data',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']), // Solo roles administrativos pueden editar
  BudgetController.updateClientData
);

// 🆕 Verificar manualmente firmas pendientes de SignNow
router.post(
  '/verify-signatures',
  verifyToken,
  isStaff, // Cualquier staff puede verificar
  verifyPendingSignatures
);

// 🆕 Archivar presupuestos antiguos manualmente
router.post(
  '/archive-old',
  verifyToken,
  allowRoles(['admin', 'owner']), // Solo admin y owner
  async (req, res) => {
    try {
      const { archiveBudgets } = require('../tasks/cronJobs');
      await archiveBudgets();
      res.json({ 
        success: true, 
        message: 'Presupuestos archivados correctamente' 
      });
    } catch (error) {
      console.error('Error al archivar presupuestos:', error);
      res.status(500).json({ 
        error: true, 
        message: 'Error al archivar presupuestos',
        details: error.message 
      });
    }
  }
);

// // ✅ RUTA DE DIAGNÓSTICO SMTP
// router.get('/diagnostic/email', verifyToken, isOwner, BudgetController.diagnoseEmail); // Solo el owner puede hacer diagnósticos

module.exports = router;
