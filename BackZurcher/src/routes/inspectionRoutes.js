const express = require('express');
const InspectionController = require('../controllers/InspectionController');
const { verifyToken } = require('../middleware/isAuth');
const { isAdmin, isStaff } = require('../middleware/roleMiddleware'); // Ajusta según tus middlewares

const router = express.Router();

// Crear una inspección (solo administradores)
router.post('/', verifyToken, isAdmin, InspectionController.createInspection);

// Obtener inspecciones por obra (personal del hotel)
router.get('/work/:workId', verifyToken, isStaff, InspectionController.getInspectionsByWork);

// Actualizar una inspección (solo administradores)
router.put('/:id', verifyToken, isAdmin, InspectionController.updateInspection);

module.exports = router;