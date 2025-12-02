const express = require('express');
const MaterialController = require('../controllers/MaterialController');
const { verifyToken } = require('../middleware/isAuth');
const {allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta según tus middlewares

const router = express.Router();

// Crear un material (administradores, maintenance y workers)
router.post('/', verifyToken,allowRoles(['admin', 'recept', 'owner', 'maintenance', 'worker']), MaterialController.createMaterialSet);

// Obtener materiales por obra (personal del hotel)
router.get('/work/:workId', verifyToken, allowRoles(['admin', 'recept', 'owner', 'worker', 'maintenance', 'finance', 'finance-viewer']), MaterialController.getMaterialsByWork);

// Actualizar un material (administradores, maintenance y workers)
router.put('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'maintenance', 'worker']), MaterialController.updateMaterial);

module.exports = router;