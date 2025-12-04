const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const FinancialDashboardController = require('../controllers/FinancialDashboardController');
const { verifyToken } = require('../middleware/isAuth');

/**
 * Rutas para Dashboard Financiero Consolidado
 * Requiere autenticación
 */

// 💾 Cache de 5 minutos para dashboard financiero
// Los datos financieros no cambian constantemente, 5 min es razonable
const dashboardCache = new NodeCache({ 
  stdTTL: 300,      // 5 minutos
  checkperiod: 60   // Revisar expiración cada 60 segundos
});

// GET /financial-dashboard - Obtener dashboard consolidado con filtros
router.get('/', verifyToken, async (req, res) => {
  const { month, year, startDate, endDate } = req.query;
  
  // Generar clave de cache única basada en filtros
  const cacheKey = `dashboard_${month || 'all'}_${year || 'all'}_${startDate || 'none'}_${endDate || 'none'}`;
  
  // Verificar si existe en cache
  const cached = dashboardCache.get(cacheKey);
  if (cached) {
    console.log(`💾 [CACHE HIT] Financial Dashboard: ${cacheKey}`);
    return res.json(cached);
  }
  
  console.log(`🔍 [CACHE MISS] Financial Dashboard: ${cacheKey} - Ejecutando queries...`);
  
  try {
    // Guardar la función original de res.json
    const originalJson = res.json.bind(res);
    
    // Interceptar res.json para guardar en cache
    res.json = function(data) {
      if (!data.error) {
        dashboardCache.set(cacheKey, data);
        console.log(`✅ [CACHE SET] Financial Dashboard: ${cacheKey} - Cache válido por 5 min`);
      }
      return originalJson(data);
    };
    
    // Ejecutar controller normal
    await FinancialDashboardController.getFinancialDashboard(req, res);
  } catch (error) {
    console.error('❌ Error en Financial Dashboard:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

module.exports = router;
