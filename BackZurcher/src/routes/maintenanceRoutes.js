const express = require('express');
const MaintenanceController = require('../controllers/MaintenanceController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol')
const { upload } = require('../middleware/multer'); // Tu config de Multer

const router = express.Router();

// Obtener todas las visitas de mantenimiento para una obra específica
router.get('/work/:workId', 
    verifyToken, 
    allowRoles(['admin', 'owner',  'worker']), // Ajusta roles
    MaintenanceController.getMaintenanceVisitsForWork
);

// Actualizar una visita de mantenimiento (registrar fecha, notas, estado)
router.put('/:visitId', 
    verifyToken, 
    allowRoles(['admin', 'owner',  'worker']), // Ajusta roles
    MaintenanceController.updateMaintenanceVisit
);

// Añadir media a una visita de mantenimiento
router.post('/:visitId/media', 
    verifyToken, 
    allowRoles(['admin', 'owner',  'worker']), // Ajusta roles
    upload.array('maintenanceFiles', 10), // 'maintenanceFiles' es el fieldname, permite hasta 10 archivos
    MaintenanceController.addMediaToMaintenanceVisit
);

// Eliminar un archivo multimedia de una visita
router.delete('/media/:mediaId',
    verifyToken,
    allowRoles(['admin', 'owner',  'staff']), // Ajusta roles
    MaintenanceController.deleteMaintenanceMedia
);


module.exports = router;