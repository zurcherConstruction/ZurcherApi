const express = require('express');
const WorkController = require('../controllers/WorkController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol')
const { uploadToDisk } = require('../middleware/multerDisk');
const { upload } = require('../middleware/multer'); // Asegúrate de que esta ruta sea correcta

const router = express.Router();


router.get(
  '/maintenance-overview', // O la ruta que prefieras, ej. '/status/maintenance/overview'
  verifyToken, // Tu middleware de autenticación
  allowRoles(['admin', 'owner', 'worker']), // Ajusta los roles según quién puede ver esta lista
  WorkController.getMaintenanceOverviewWorks
);
// Crear una obra (solo administradores)
router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.createWork);
router.get('/assigned', verifyToken, allowRoles(['owner', 'worker']), WorkController.getAssignedWorks);
// Obtener todas las obras (personal del hotel)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker']), WorkController.getWorks);

// Obtener una obra por ID (personal del hotel)
router.get('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), WorkController.getWorkById);

// Actualizar una obra (solo administradores)
router.put('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker']), WorkController.updateWork);

// Eliminar una obra (solo administradores)
router.delete('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker']), WorkController.deleteWork);

// Ruta para agregar un detalle de instalación a un Work
router.post('/:idWork/installation-details', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), WorkController.addInstallationDetail);

router.put('/:idWork/invoice', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), uploadToDisk.single('invoiceFile'), WorkController.attachInvoiceToWork);

// Ruta para agregar imágenes a un trabajo
router.post('/:idWork/images',
    verifyToken,
    allowRoles(['owner','worker']),
    upload.single('imageFile'), // <--- USA TU INSTANCIA 'upload' EXISTENTE
    WorkController.addImagesToWork
  );

router.delete('/:idWork/images/:imageId', verifyToken, allowRoles(['owner', 'worker']), WorkController.deleteImagesFromWork);

router.post('/:idWork/validate-status-change',verifyToken, allowRoles(['admin', 'owner']), WorkController.validateStatusChangeOnly);
router.post('/:idWork/change-status', verifyToken, allowRoles(['admin', 'owner',]), WorkController.changeWorkStatus);





module.exports = router;