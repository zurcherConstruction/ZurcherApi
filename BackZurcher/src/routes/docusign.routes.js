const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const DocuSignTokenService = require('../services/DocuSignTokenService');

/**
 * Rutas para autenticación OAuth de DocuSign
 * Ahora incluye manejo robusto de tokens con base de datos
 */

// Iniciar flujo OAuth (redirige al usuario a DocuSign)
router.get('/auth', DocuSignController.initiateOAuth);

// Callback de DocuSign después de autorización
router.get('/callback', DocuSignController.handleOAuthCallback);

// Verificar estado de autenticación
router.get('/auth-status', DocuSignController.checkAuthStatus);

// Refrescar token manualmente (opcional)
router.post('/refresh-token', DocuSignController.refreshToken);

// Revocar todos los tokens activos
router.post('/revoke-tokens', DocuSignController.revokeTokens);

// Endpoint administrativo para limpieza de tokens expirados
router.post('/cleanup-expired', async (req, res) => {
  try {
    const deleted = await DocuSignTokenService.cleanupExpiredTokens(30);
    res.json({
      success: true,
      message: `Se limpiaron ${deleted} tokens expirados`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error limpiando tokens expirados',
      details: error.message
    });
  }
});

// Endpoint para obtener estadísticas de tokens (admin)
router.get('/token-stats', async (req, res) => {
  try {
    const db = require('../data/database');
    
    const stats = await db.DocuSignToken.findAll({
      attributes: [
        'environment',
        'isActive',
        [db.Sequelize.fn('COUNT', '*'), 'count'],
        [db.Sequelize.fn('MAX', db.Sequelize.col('refreshCount')), 'maxRefreshCount'],
        [db.Sequelize.fn('MAX', db.Sequelize.col('lastUsedAt')), 'lastUsed']
      ],
      group: ['environment', 'isActive'],
      raw: true
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
});

module.exports = router;
