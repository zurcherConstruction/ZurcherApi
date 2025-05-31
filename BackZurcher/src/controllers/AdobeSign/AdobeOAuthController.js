const AdobeOAuthService = require('./AdobeOAuthService');

const AdobeOAuthController = {
  // Iniciar flujo de autorización
  authorize: async (req, res) => {
    try {
      console.log('Ejecutando authorize function');
      const oauthService = new AdobeOAuthService();
      const authUrl = oauthService.getAuthorizationUrl();
      
      res.json({
        success: true,
        authUrl,
        message: 'Visita esta URL para autorizar la aplicación con Adobe Sign'
      });
    } catch (error) {
      console.error('Error generando URL de autorización:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando URL de autorización',
        error: error.message
      });
    }
  },

  // Manejar callback de Adobe Sign
  handleCallback: async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Código de autorización no recibido'
        });
      }

      const oauthService = new AdobeOAuthService();
      const tokens = await oauthService.exchangeCodeForTokens(code);

      res.json({
        success: true,
        message: 'Autorización completada exitosamente',
        data: {
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
          expires_at: new Date(tokens.expires_at).toISOString()
        }
      });
    } catch (error) {
      console.error('Error en callback de OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando autorización',
        error: error.message
      });
    }
  },

  // Verificar estado de autorización
  checkAuthStatus: async (req, res) => {
    try {
      const oauthService = new AdobeOAuthService();
      const isAuthorized = await oauthService.hasValidTokens();
      
      if (isAuthorized) {
        const tokens = await oauthService.loadTokens();
        res.json({
          success: true,
          authorized: true,
          data: {
            expires_at: new Date(tokens.expires_at).toISOString(),
            created_at: new Date(tokens.created_at).toISOString()
          }
        });
      } else {
        res.json({
          success: true,
          authorized: false,
          message: 'No autorizado. Necesitas autorizar primero.'
        });
      }
    } catch (error) {
      console.error('Error verificando estado de autorización:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando autorización',
        error: error.message
      });
    }
  },

  // Refrescar tokens manualmente
  refreshTokens: async (req, res) => {
    try {
      const oauthService = new AdobeOAuthService();
      const tokens = await oauthService.refreshAccessToken();

      res.json({
        success: true,
        message: 'Tokens refrescados exitosamente',
        data: {
          expires_in: tokens.expires_in,
          expires_at: new Date(tokens.expires_at).toISOString()
        }
      });
    } catch (error) {
      console.error('Error refrescando tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Error refrescando tokens',
        error: error.message
      });
    }
  }
};

module.exports = AdobeOAuthController;