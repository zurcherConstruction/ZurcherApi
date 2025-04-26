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

// Obtener todos los permisos (permitido para staff)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), PermitController.getPermits);

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

module.exports = router;