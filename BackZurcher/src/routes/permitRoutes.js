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
// Obtener todos los permisos (permitido para staff)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker']), PermitController.getPermits);

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

module.exports = router;