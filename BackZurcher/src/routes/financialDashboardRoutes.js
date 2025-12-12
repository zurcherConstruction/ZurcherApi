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
  const { month, year, startDate, endDate, refresh } = req.query;
  
  // Generar clave de cache única basada en filtros
  const cacheKey = `dashboard_${month || 'all'}_${year || 'all'}_${startDate || 'none'}_${endDate || 'none'}`;
  
  // 🔄 Si se solicita refresh, limpiar cache
  if (refresh === 'true') {
    dashboardCache.del(cacheKey);
    console.log(`🗑️ [CACHE CLEAR] Financial Dashboard: ${cacheKey} - Cache eliminado por refresh`);
  }
  
  // Verificar si existe en cache (solo si no se pidió refresh)
  const cached = !refresh && dashboardCache.get(cacheKey);
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
      
      // 🚫 Agregar headers para prevenir cache del navegador cuando hay refresh
      if (refresh === 'true') {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
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

/**
 * GET /financial-dashboard/detailed - Dashboard detallado con todas las transacciones
 * Para verificar duplicaciones y obtener claridad de gastos reales
 */
router.get('/detailed', verifyToken, async (req, res) => {
  const { month, year } = req.query;
  
  // Cache más corto para datos detallados (2 minutos)
  const cacheKey = `detailed_dashboard_${month || new Date().getMonth() + 1}_${year || new Date().getFullYear()}`;
  
  const cached = dashboardCache.get(cacheKey);
  if (cached) {
    console.log(`💾 [CACHE HIT] Detailed Dashboard: ${cacheKey}`);
    return res.json(cached);
  }
  
  console.log(`🔍 [CACHE MISS] Detailed Dashboard: ${cacheKey} - Obteniendo transacciones...`);
  
  try {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (data.success) {
        // Cache más corto para datos detallados (2 minutos)
        dashboardCache.set(cacheKey, data, 120);
        console.log(`✅ [CACHE SET] Detailed Dashboard: ${cacheKey} - Cache válido por 2 min`);
      }
      return originalJson(data);
    };
    
    await FinancialDashboardController.getDetailedFinancialDashboard(req, res);
  } catch (error) {
    console.error('❌ Error en Detailed Dashboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener dashboard detallado',
      details: error.message 
    });
  }
});

module.exports = router;
