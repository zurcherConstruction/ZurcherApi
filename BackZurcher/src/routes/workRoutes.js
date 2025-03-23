const express = require('express');
const WorkController = require('../controllers/WorkController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol')


const router = express.Router();

// Crear una obra (solo administradores)
router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.createWork);

// Obtener todas las obras (personal del hotel)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.getWorks);

// Obtener una obra por ID (personal del hotel)
router.get('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.getWorkById);

// Actualizar una obra (solo administradores)
router.put('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.updateWork);

// Eliminar una obra (solo administradores)
router.delete('/:idWork', verifyToken, allowRoles(['admin', 'recept', 'owner']), WorkController.deleteWork);

module.exports = router;