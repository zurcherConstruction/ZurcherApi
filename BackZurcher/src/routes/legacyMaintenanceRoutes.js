/**
 * 🛣️ ROUTES: Legacy Maintenance Works
 * 
 * Endpoints especiales para editar Works de maintenance legacy
 */

const express = require('express');
const LegacyMaintenanceController = require('../controllers/LegacyMaintenanceController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

const router = express.Router();

// Listar todos los Works legacy que necesitan edición
router.get(
  '/',
  verifyToken,
  allowRoles(['admin', 'owner', 'maintenance']),
  LegacyMaintenanceController.getLegacyMaintenanceWorks
);

// Editar un Work legacy específico
router.put(
  '/:idWork',
  verifyToken,
  allowRoles(['admin', 'owner', 'maintenance']),
  LegacyMaintenanceController.updateLegacyMaintenanceWork
);

module.exports = router;
