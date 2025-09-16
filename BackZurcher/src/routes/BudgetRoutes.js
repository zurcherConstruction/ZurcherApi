const express = require('express');
const BudgetController = require('../controllers/BudgetController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const { upload } = require('../middleware/multer'); // Asegúrate de que la ruta sea correcta    
const router = express.Router();



// Rutas con validación de token y roles
router.post('/',  allowRoles(['admin', 'recept', 'owner', 'finance']), BudgetController.createBudget); // Incluir finance en creación de presupuestos
router.get('/all', verifyToken, isStaff, BudgetController.getBudgets); // Personal del hotel puede ver presupuestos


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

// ========== RUTAS EXISTENTES ==========

  router.put('/:idBudget', verifyToken, BudgetController.updateBudget); // Solo administradores pueden actualizar presupuestos
  router.get('/:idBudget', verifyToken, isStaff, BudgetController.getBudgetById); // Personal del hotel puede ver un presupuesto específico

router.delete('/:idBudget', verifyToken, isOwner, BudgetController.deleteBudget); // Solo el dueño puede eliminar presupuestos

// // ✅ RUTA DE DIAGNÓSTICO SMTP
// router.get('/diagnostic/email', verifyToken, isOwner, BudgetController.diagnoseEmail); // Solo el owner puede hacer diagnósticos

module.exports = router;
