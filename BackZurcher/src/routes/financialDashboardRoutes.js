const express = require('express');
const router = express.Router();
const FinancialDashboardController = require('../controllers/FinancialDashboardController');
const { verifyToken } = require('../middleware/isAuth');

/**
 * Rutas para Dashboard Financiero Consolidado
 * Requiere autenticación
 */

// GET /financial-dashboard - Obtener dashboard consolidado con filtros
router.get('/', verifyToken, FinancialDashboardController.getFinancialDashboard);

module.exports = router;
