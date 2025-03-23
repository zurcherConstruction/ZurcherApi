const express = require('express');
const MaterialController = require('../controllers/MaterialController');
const { verifyToken } = require('../middleware/isAuth');
const {allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta según tus middlewares

const router = express.Router();

// Crear un material (solo administradores)
router.post('/', verifyToken,allowRoles(['admin', 'recept', 'owner']), MaterialController.createMaterial);

// Obtener materiales por obra (personal del hotel)
router.get('/work/:workId', verifyToken, isStaff, MaterialController.getMaterialsByWork);

// Actualizar un material (solo administradores)
router.put('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner']), MaterialController.updateMaterial);

module.exports = router;