const express = require('express');
const PermitController = require('../controllers/PermitController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isStaff, isOwner, isAdmin, isRecept, } = require('../middleware/byRol'); // Ajusta según tus middlewares


const router = express.Router();

// Crear un permiso (permitido para admin, recept y owner)
router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), PermitController.createPermit);

// Obtener todos los permisos (permitido para staff)
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner']), PermitController.getPermits);

// Obtener un permiso por ID (permitido para staff)
router.get('/:idPermit', allowRoles(['admin', 'recept', 'owner']), PermitController.getPermitById);

// Obtener datos de contacto de un permiso (permitido para staff)
router.get('/contacts/:idPermit?', allowRoles(['admin', 'recept', 'owner']), PermitController.getContactList);

// Descargar PDF de un permiso (permitido para staff)
router.get('/pdf/:idPermit', allowRoles(['admin', 'recept', 'owner']), PermitController.downloadPermitPdf);

// Actualizar un permiso (permitido solo para admin)
router.put('/:idPermit', verifyToken, allowRoles(['admin','recept', 'owner']), PermitController.updatePermit);

module.exports = router;