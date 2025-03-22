const express = require('express');
const WorkController = require('../controllers/WorkController');
const { verifyToken } = require('../middleware/isAuth');
const { isAdmin, isStaff } = require('../middleware/roleMiddleware'); // Ajusta según tus middlewares

const router = express.Router();

// Crear una obra (solo administradores)
router.post('/', verifyToken, isAdmin, WorkController.createWork);

// Obtener todas las obras (personal del hotel)
router.get('/', verifyToken, isStaff, WorkController.getWorks);

// Obtener una obra por ID (personal del hotel)
router.get('/:idWork', verifyToken, isStaff, WorkController.getWorkById);

// Actualizar una obra (solo administradores)
router.put('/:idWork', verifyToken, isAdmin, WorkController.updateWork);

// Eliminar una obra (solo administradores)
router.delete('/:idWork', verifyToken, isAdmin, WorkController.deleteWork);

module.exports = router;