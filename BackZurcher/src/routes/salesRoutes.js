const express = require('express');
const router = express.Router();
const SalesController = require('../controllers/SalesController');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");

/**
 * Rutas para empleados de ventas (Sales Representatives)
 * Requiere autenticación y rol: sales_rep
 */

// Dashboard del vendedor - Ver sus presupuestos y works
router.get(
  '/my-dashboard',
  verifyToken,
  allowRoles(['sales_rep', 'admin', 'owner']), // admin y owner pueden ver para supervisión
  SalesController.getMySalesDashboard
);

module.exports = router;
