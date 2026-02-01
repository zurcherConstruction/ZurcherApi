const express = require('express');
const WorkController = require('../controllers/WorkController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol')
const { uploadToDisk } = require('../middleware/multerDisk');
const { upload } = require('../middleware/multer'); // Asegúrate de que esta ruta sea correcta
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const router = express.Router();

// Middleware para invalidar caché después de modificaciones
const invalidateWorkCache = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    // Solo invalidar si la respuesta fue exitosa
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const { idWork } = req.params;
      if (idWork) {
        invalidateCache(`/work/${idWork}`);
      }
    }
    return originalJson(data);
  };
  next();
};


router.get(
  '/maintenance-overview', // O la ruta que prefieras, ej. '/status/maintenance/overview'
  verifyToken, // Tu middleware de autenticación
  allowRoles(['admin', 'owner', 'worker', 'maintenance']), // Ajusta los roles según quién puede ver esta lista
  WorkController.getMaintenanceOverviewWorks
);

// Ruta para obtener obras en mantenimiento - CON CACHÉ de 20 segundos
router.get(
  '/maintenance',
  verifyToken,
  allowRoles(['admin', 'owner', 'worker', 'maintenance']),
  cacheMiddleware(20),
  WorkController.getWorksInMaintenance
);
// Crear una obra (solo administradores)
router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.createWork);
router.get('/assigned', verifyToken, allowRoles(['owner', 'worker', 'maintenance']), WorkController.getAssignedWorks);
// Obtener todas las obras - CON CACHÉ de 15 segundos (alta carga)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker', 'maintenance', 'finance']), cacheMiddleware(15), WorkController.getWorks);

// Obtener una obra por ID  - CON CACHÉ de 30 segundos
router.get('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker', 'maintenance', 'finance']), cacheMiddleware(30), WorkController.getWorkById);

// Actualizar una obra (solo administradores)
router.put('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker', 'maintenance']), invalidateWorkCache, WorkController.updateWork);

// Eliminar una obra (solo administradores)
router.delete('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker']), invalidateWorkCache, WorkController.deleteWork);

// Ruta para agregar un detalle de instalación a un Work
router.post('/:idWork/installation-details', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), invalidateWorkCache, WorkController.addInstallationDetail);

router.put('/:idWork/invoice', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), uploadToDisk.single('invoiceFile'), invalidateWorkCache, WorkController.attachInvoiceToWork);

// Ruta para agregar imágenes a un trabajo
router.post('/:idWork/images',
    verifyToken,
    allowRoles(['owner','worker']),
    upload.single('imageFile'),
    invalidateWorkCache,
    WorkController.addImagesToWork
  );

router.delete('/:idWork/images/:imageId', verifyToken, allowRoles(['owner', 'worker']), invalidateWorkCache, WorkController.deleteImagesFromWork);

// ✅ Obtener imágenes de una obra específica (para mobile app)
router.get('/:idWork/images', verifyToken, allowRoles(['owner', 'worker', 'admin', 'finance', 'recept']), WorkController.getWorkImages);

// Actualizar Notice to Owner y Lien
router.put('/:idWork/notice-to-owner', verifyToken, allowRoles(['admin', 'owner', 'finance', 'recept']), invalidateWorkCache, WorkController.updateNoticeToOwner);

// 🆕 Subir Permiso de Operación
router.post('/:idWork/operating-permit', verifyToken, allowRoles(['admin', 'owner', 'worker']), upload.single('document'), invalidateWorkCache, WorkController.uploadOperatingPermit);

// 🆕 Subir Servicio de Mantenimiento
router.post('/:idWork/maintenance-service', verifyToken, allowRoles(['admin', 'owner', 'worker']), upload.single('document'), invalidateWorkCache, WorkController.uploadMaintenanceService);

router.post('/:idWork/validate-status-change',verifyToken, allowRoles(['admin', 'owner']), WorkController.validateStatusChangeOnly);
router.post('/:idWork/change-status', verifyToken, allowRoles(['admin', 'owner',]), invalidateWorkCache, WorkController.changeWorkStatus);





module.exports = router;