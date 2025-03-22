const express = require('express');
const MaterialController = require('../controllers/MaterialController');
const { verifyToken } = require('../middleware/isAuth');
const { isAdmin, isStaff } = require('../middleware/roleMiddleware'); // Ajusta según tus middlewares

const router = express.Router();

// Crear un material (solo administradores)
router.post('/', verifyToken, isAdmin, MaterialController.createMaterial);

// Obtener materiales por obra (personal del hotel)
router.get('/work/:workId', verifyToken, isStaff, MaterialController.getMaterialsByWork);

// Actualizar un material (solo administradores)
router.put('/:id', verifyToken, isAdmin, MaterialController.updateMaterial);

module.exports = router;