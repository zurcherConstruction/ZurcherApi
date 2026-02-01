const express = require('express');
const PermitController = require('../controllers/PermitController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol'); // Ajusta según tus middlewares
const multer = require('multer');

// Configuración de multer
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"), false);
    }
    cb(null, true);
  },
});

const router = express.Router();



// Crear un permiso (permitido para admin, recept y owner)
router.post(
  '/',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  upload.fields([
    { name: 'pdfData', maxCount: 1 }, // Archivo principal
    { name: 'optionalDocs', maxCount: 1 }, // Documentación opcional
  ]),
  PermitController.createPermit
);

router.get('/check-by-address', verifyToken, allowRoles(['admin', 'recept', 'owner']), PermitController.checkPermitByPropertyAddress);

// 🆕 Verificar si un número de permit ya existe
router.get('/check-permit-number/:permitNumber', verifyToken, allowRoles(['admin', 'recept', 'owner']), PermitController.checkPermitNumber);

// Obtener todos los permisos (permitido para staff)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker']), PermitController.getPermits);

// ========== RUTAS PARA PPI (Pre-Permit Inspection) ==========
// ⚠️ IMPORTANTE: Estas rutas DEBEN estar ANTES de /:idPermit para que no sean interceptadas

// 🆕 RUTA PÚBLICA: Generar enlace de firma on-demand y redirigir a DocuSign (SIN AUTENTICACIÓN)
router.get(
  '/:idPermit/ppi/sign',
  PermitController.getPPISigningLinkAndRedirect
);

// 🆕 Generar PPI preview/prueba
router.post(
  '/:idPermit/ppi/generate',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.generatePPIPreview
);

// 🆕 Descargar PPI generado
router.get(
  '/:idPermit/ppi/download',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.downloadPPI
);

// 🆕 Ver PPI inline en navegador
router.get(
  '/:idPermit/ppi/view',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.viewPPIInline
);

// 🆕 Enviar PPI a DocuSign para firma
router.post(
  '/:idPermit/ppi/send-for-signature',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.sendPPIForSignature
);

// 🆕 Ver PPI firmado inline
router.get(
  '/:idPermit/ppi/signed/view',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.viewPPISignedInline
);

// 🆕 Descargar PPI firmado
router.get(
  '/:idPermit/ppi/signed/download',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.downloadPPISigned
);

// 🆕 Verificar estado de firma del PPI manualmente
router.post(
  '/:idPermit/ppi/check-signature',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  PermitController.checkPPISignatureStatus
);

// 🆕 Verificar TODAS las firmas PPI pendientes (ejecución manual)
router.post(
  '/verify-ppi-signatures',
  verifyToken,
  allowRoles(['admin', 'owner']),
  PermitController.verifyAllPPISignatures
);

// 🆕 Subir PPI firmado manualmente
router.post(
  '/:idPermit/ppi/upload-manual-signed',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  upload.single('file'),
  PermitController.uploadManualSignedPPI
);

// Obtener un permiso por ID (permitido para staff)
router.get('/:idPermit', allowRoles(['admin', 'recept', 'owner']), PermitController.getPermitById);

// Obtener datos de contacto de un permiso (permitido para staff)
router.get('/contacts/:idPermit?', allowRoles(['admin', 'recept', 'owner']), PermitController.getContactList);

// Descargar PDF de un permiso (permitido para staff)
router.get('/pdf/:idPermit', allowRoles(['admin', 'recept', 'owner']), PermitController.downloadPermitPdf);

// *** NUEVA RUTA: Visualizar INLINE el PDF principal (pdfData) ***
router.get('/:idPermit/view/pdf', allowRoles(['admin', 'recept', 'owner']), PermitController.getPermitPdfInline);

// *** NUEVA RUTA: Visualizar INLINE el documento opcional (optionalDocs) ***
router.get('/:idPermit/view/optional', allowRoles(['admin', 'recept', 'owner']), PermitController.getPermitOptionalDocInline);


// Actualizar un permiso (permitido solo para admin)
router.put('/:idPermit', verifyToken, allowRoles(['admin', 'recept', 'owner']), PermitController.updatePermit);

// ========== RUTAS PARA EDITAR DATOS DE CLIENTE ==========

// Actualizar datos de cliente de un permiso
router.patch(
  '/:idPermit/client-data',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']), // Solo roles administrativos pueden editar
  PermitController.updatePermitClientData
);

// 🆕 NUEVO: Actualizar campos completos del Permit (técnicos + contacto + emails)
router.patch(
  '/:idPermit/fields',
  verifyToken,
  allowRoles(['admin', 'owner']),
  PermitController.updatePermitFields
);

// ========== RUTAS PARA REEMPLAZAR PDFs ==========

// 🆕 Reemplazar PDF principal del permit
router.put(
  '/:id/replace-pdf',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  upload.single('pdfData'), // Acepta un solo archivo con el nombre 'pdfData'
  PermitController.replacePermitPdf
);

// 🆕 Reemplazar documentos opcionales del permit
router.put(
  '/:id/replace-optional-docs',
  verifyToken,
  allowRoles(['admin', 'recept', 'owner']),
  upload.single('optionalDocs'), // Acepta un solo archivo con el nombre 'optionalDocs'
  PermitController.replaceOptionalDocs
);

// Eliminar un permiso (permitido solo para admin)
// router.delete('/:idPermit', verifyToken, allowRoles(['admin']), PermitController.deletePermit);

module.exports = router;