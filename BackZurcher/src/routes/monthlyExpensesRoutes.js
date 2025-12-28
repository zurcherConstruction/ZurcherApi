/**
 * Monthly Expenses Routes
 * 
 * Rutas para análisis de gastos devengados por mes
 */

const express = require('express');
const router = express.Router();
const { getMonthlyExpenses } = require('../controllers/monthlyExpensesController');

/**
 * @route GET /monthly-expenses
 * @desc Obtener gastos devengados mensuales (Gastos Generales + Gastos Fijos)
 * @access Private
 * @params ?year=2025 (opcional, default: año actual)
 * @params ?month=12 (opcional, 1-12 para filtrar mes específico)
 * @examples
 *   /monthly-expenses?year=2025 (todo el año 2025)
 *   /monthly-expenses?year=2025&month=12 (solo diciembre 2025)
 *   /monthly-expenses?month=3 (solo marzo del año actual)
 */
router.get('/', getMonthlyExpenses);

module.exports = router;
