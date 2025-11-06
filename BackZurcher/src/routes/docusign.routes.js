const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');

/**
 * Rutas para autenticación OAuth de DocuSign
 */

// Iniciar flujo OAuth (redirige al usuario a DocuSign)
router.get('/auth', DocuSignController.initiateOAuth);

// Callback de DocuSign después de autorización
router.get('/callback', DocuSignController.handleOAuthCallback);

// Verificar estado de autenticación
router.get('/auth-status', DocuSignController.checkAuthStatus);

// Refrescar token manualmente (opcional)
router.post('/refresh-token', DocuSignController.refreshToken);

module.exports = router;
