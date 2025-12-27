const axios = require('axios');
const DocuSignTokenService = require('../services/DocuSignTokenService');

/**
 * Controlador para manejar autenticación OAuth de DocuSign
 * Ahora usa base de datos para persistencia robusta de tokens
 */

class DocuSignController {
  /**
   * Inicia el flujo OAuth redirigiendo al usuario a DocuSign
   */
  static async initiateOAuth(req, res) {
    try {
      const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
      const redirectUri = `${process.env.API_URL}/docusign/callback`;
      const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
      
      const authServer = environment === 'production' 
        ? 'account.docusign.com' 
        : 'account-d.docusign.com';

      // URL de autorización
      const authUrl = `https://${authServer}/oauth/auth?` +
        `response_type=code&` +
        `scope=signature%20impersonation&` +
        `client_id=${integrationKey}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;

      console.log('🔐 Redirigiendo a DocuSign para autorización...');
      console.log('Auth URL:', authUrl);

      res.redirect(authUrl);
    } catch (error) {
      console.error('❌ Error al iniciar OAuth:', error.message);
      res.status(500).json({
        error: 'Error al iniciar autenticación',
        details: error.message
      });
    }
  }

  /**
   * Maneja el callback de DocuSign después de la autorización
   */
  static async handleOAuthCallback(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Código de autorización no recibido' });
      }

      console.log('✅ Código de autorización recibido');

      // Intercambiar código por tokens
      const tokens = await DocuSignController.exchangeCodeForTokens(code);

      // Guardar tokens usando el servicio robusto
      await DocuSignTokenService.saveToken(tokens, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        notes: 'Token obtenido via OAuth callback'
      });

      console.log('✅ Tokens obtenidos y guardados exitosamente en base de datos');

      res.send(`
        <html>
          <head>
            <title>DocuSign - Autorización Exitosa</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #28a745;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .success-icon {
                font-size: 64px;
                margin-bottom: 20px;
              }
              .close-btn {
                margin-top: 20px;
                padding: 10px 30px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
              }
              .close-btn:hover {
                background: #764ba2;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>¡Autorización Exitosa!</h1>
              <p>DocuSign ha sido autorizado correctamente.</p>
              <p>Ahora puedes cerrar esta ventana y volver a tu aplicación.</p>
              <p><strong>El sistema ya está listo para enviar documentos con DocuSign.</strong></p>
              <button class="close-btn" onclick="window.close()">Cerrar</button>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('❌ Error en callback de OAuth:', error.message);
      res.status(500).send(`
        <html>
          <head>
            <title>DocuSign - Error de Autorización</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
              }
              h1 {
                color: #dc3545;
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              .error-icon {
                font-size: 64px;
                margin-bottom: 20px;
              }
              .error-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
                font-family: monospace;
                font-size: 12px;
                color: #dc3545;
                text-align: left;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">❌</div>
              <h1>Error de Autorización</h1>
              <p>Hubo un problema al autorizar DocuSign.</p>
              <p>Por favor, intenta nuevamente.</p>
              <div class="error-details">${error.message}</div>
            </div>
          </body>
        </html>
      `);
    }
  }

  /**
   * Intercambia el código de autorización por tokens
   */
  static async exchangeCodeForTokens(code) {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;
    const redirectUri = `${process.env.API_URL}/docusign/callback`;
    const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
    
    const authServer = environment === 'production' 
      ? 'account.docusign.com' 
      : 'account-d.docusign.com';

    // DocuSign OAuth requiere autenticación básica con Integration Key y Client Secret
    const auth = Buffer.from(`${integrationKey}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      `https://${authServer}/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type,
      obtained_at: new Date().toISOString()
    };
  }

  /**
   * Verifica si los tokens están disponibles y válidos
   */
  static async checkAuthStatus(req, res) {
    try {
      const authStatus = await DocuSignTokenService.getAuthStatus();
      res.json(authStatus);
    } catch (error) {
      res.status(500).json({
        error: 'Error verificando estado de autenticación',
        details: error.message
      });
    }
  }

  /**
   * Refresca el access token usando el refresh token
   */
  static async refreshToken(req, res) {
    try {
      const token = await DocuSignTokenService.getActiveToken();

      if (!token) {
        return res.status(400).json({
          error: 'No hay tokens disponibles para refrescar'
        });
      }

      await DocuSignTokenService.refreshToken(token);

      res.json({
        success: true,
        message: 'Token refrescado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error refrescando token:', error.message);
      res.status(500).json({
        error: 'Error refrescando token',
        details: error.message
      });
    }
  }

  /**
   * Obtiene un access token válido (refresca automáticamente si es necesario)
   */
  static async getValidAccessToken() {
    return await DocuSignTokenService.getValidAccessToken();
  }

  /**
   * Obtiene el estado de autenticación (método para el test)
   */
  static async getAuthStatus() {
    return await DocuSignTokenService.getAuthStatus();
  }

  /**
   * Test de conexión para verificar que DocuSign funciona
   */
  static async testConnection() {
    return await DocuSignTokenService.testConnection();
  }

  /**
   * Revoca todos los tokens activos
   */
  static async revokeTokens(req, res) {
    try {
      const success = await DocuSignTokenService.revokeAllTokens();
      
      if (success) {
        res.json({
          success: true,
          message: 'Todos los tokens han sido revocados exitosamente'
        });
      } else {
        res.status(500).json({
          error: 'Error revocando tokens'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Error revocando tokens',
        details: error.message
      });
    }
  }
}

module.exports = DocuSignController;
