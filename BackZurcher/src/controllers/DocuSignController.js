const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Controlador para manejar autenticación OAuth de DocuSign
 */

// Archivo para almacenar tokens (en producción usar base de datos)
const TOKEN_FILE = path.join(__dirname, '../../docusign_tokens.json');

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

      // Guardar tokens
      DocuSignController.saveTokens(tokens);

      console.log('✅ Tokens obtenidos y guardados exitosamente');

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
    const redirectUri = `${process.env.API_URL}/docusign/callback`;
    const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
    
    const authServer = environment === 'production' 
      ? 'account.docusign.com' 
      : 'account-d.docusign.com';

    // DocuSign requiere autenticación básica con Integration Key (como username) sin password
    const auth = Buffer.from(`${integrationKey}:`).toString('base64');

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
   * Guarda los tokens en un archivo
   */
  static saveTokens(tokens) {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  }

  /**
   * Lee los tokens del archivo
   */
  static loadTokens() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = fs.readFileSync(TOKEN_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error leyendo tokens:', error.message);
    }
    return null;
  }

  /**
   * Verifica si los tokens están disponibles y válidos
   */
  static async checkAuthStatus(req, res) {
    try {
      const tokens = DocuSignController.loadTokens();

      if (!tokens) {
        return res.json({
          authenticated: false,
          message: 'No hay tokens disponibles. Debes autorizar la aplicación.'
        });
      }

      const obtainedAt = new Date(tokens.obtained_at);
      const expiresAt = new Date(obtainedAt.getTime() + tokens.expires_in * 1000);
      const now = new Date();
      const isExpired = now >= expiresAt;

      res.json({
        authenticated: true,
        isExpired,
        obtainedAt: tokens.obtained_at,
        expiresAt: expiresAt.toISOString(),
        needsRefresh: isExpired
      });
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
      const tokens = DocuSignController.loadTokens();

      if (!tokens || !tokens.refresh_token) {
        return res.status(400).json({
          error: 'No hay refresh token disponible'
        });
      }

      const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
      const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
      
      const authServer = environment === 'production' 
        ? 'account.docusign.com' 
        : 'account-d.docusign.com';

      const auth = Buffer.from(`${integrationKey}:`).toString('base64');

      const response = await axios.post(
        `https://${authServer}/oauth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const newTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || tokens.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        obtained_at: new Date().toISOString()
      };

      DocuSignController.saveTokens(newTokens);

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
   * Obtiene un access token válido (refresca si es necesario)
   */
  static async getValidAccessToken() {
    const tokens = DocuSignController.loadTokens();

    if (!tokens) {
      throw new Error('No hay tokens disponibles. Debes autorizar la aplicación primero en: ' + process.env.API_URL + '/docusign/auth');
    }

    const obtainedAt = new Date(tokens.obtained_at);
    const expiresAt = new Date(obtainedAt.getTime() + tokens.expires_in * 1000);
    const now = new Date();

    // Si el token expira en menos de 5 minutos, refrescarlo
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 Token próximo a expirar, refrescando...');
      await DocuSignController.refreshTokenInternal();
      return DocuSignController.loadTokens().access_token;
    }

    return tokens.access_token;
  }

  /**
   * Refresca el token internamente (sin respuesta HTTP)
   */
  static async refreshTokenInternal() {
    const tokens = DocuSignController.loadTokens();

    if (!tokens || !tokens.refresh_token) {
      throw new Error('No hay refresh token disponible');
    }

    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
    
    const authServer = environment === 'production' 
      ? 'account.docusign.com' 
      : 'account-d.docusign.com';

    const auth = Buffer.from(`${integrationKey}:`).toString('base64');

    const response = await axios.post(
      `https://${authServer}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const newTokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || tokens.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type,
      obtained_at: new Date().toISOString()
    };

    DocuSignController.saveTokens(newTokens);
  }
}

module.exports = DocuSignController;
