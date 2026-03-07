/**
 * 📊 Monthly Installations Routes
 * 
 * Rutas para obtener instalaciones mensuales de trabajos
 */

const express = require('express');
const router = express.Router();
const {
  getMonthlyInstallations,
  getYearlySummary,
  getAvailableYears,
  downloadMonthlyInstallationsPDF
} = require('../controllers/monthlyInstallationsController');

// GET /monthly-installations - Obtener instalaciones por mes/año
router.get('/', getMonthlyInstallations);

// GET /monthly-installations/summary - Resumen anual por meses
router.get('/summary', getYearlySummary);

// GET /monthly-installations/available-years - Años con datos disponibles
router.get('/available-years', getAvailableYears);

// GET /monthly-installations/download-pdf - Descargar PDF del mes
router.get('/download-pdf', downloadMonthlyInstallationsPDF);

module.exports = router;
