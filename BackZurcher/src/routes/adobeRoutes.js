const express = require('express');
const router = express.Router();

// Importar el CONTROLADOR, no el servicio
const AdobeOAuthController = require('../controllers/AdobeSign/AdobeOAuthController');

// Rutas para OAuth de Adobe Sign
router.get('/debug', AdobeOAuthController.debug);
router.get('/authorize', AdobeOAuthController.authorize);
router.get('/callback', AdobeOAuthController.handleCallback);
router.get('/status', AdobeOAuthController.checkAuthStatus);
router.post('/refresh', AdobeOAuthController.refreshTokens);

module.exports = router;