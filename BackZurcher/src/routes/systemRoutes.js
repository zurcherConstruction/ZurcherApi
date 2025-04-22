const express = require('express');
const SystemController = require('../controllers/SystemController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol'); // Ajusta según tus middlewares

const router = express.Router();

// Crear un SystemType (solo administradores)
router.post('/', verifyToken, allowRoles(['owner']), SystemController.createSystemType);

// Obtener todos los SystemTypes (público)
router.get('/', allowRoles(['owner']),SystemController.getSystemTypes);

// Obtener un SystemType por ID (público)
router.get('/:id', allowRoles(['owner']),SystemController.getSystemTypeById);

// Actualizar un SystemType (solo administradores)
router.put('/:id', verifyToken, allowRoles(['owner']), SystemController.updateSystemType);

// Eliminar un SystemType (solo administradores)
router.delete('/:id', verifyToken, allowRoles(['owner']), SystemController.deleteSystemType);

module.exports = router;