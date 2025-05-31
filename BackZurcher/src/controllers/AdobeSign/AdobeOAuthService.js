const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AdobeOAuthService {
  constructor() {
    this.clientId = process.env.ADOBE_CLIENT_ID;
    this.clientSecret = process.env.ADOBE_CLIENT_SECRET;
    this.redirectUri = process.env.ADOBE_REDIRECT_URI || 'http://localhost:3001/api/adobe-oauth/callback';
    this.baseURL = 'https://api.na1.adobesign.com';
    this.scope = 'agreement_write:account agreement_read:account';
    
    // Archivo para almacenar tokens
    this.tokenFilePath = path.join(__dirname, '../../config/adobe_tokens.json');
  }

  // Generar URL de autorización
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: Date.now().toString()
    });

    return `${this.baseURL}/public/oauth?${params.toString()}`;
  }

  // Intercambiar código por tokens
  async exchangeCodeForTokens(authorizationCode) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code: authorizationCode
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        expires_at: Date.now() + (response.data.expires_in * 1000),
        created_at: Date.now()
      };

      await this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error intercambiando código por tokens:', error.response?.data || error.message);
      throw error;
    }
  }

  // Refrescar access token
  async refreshAccessToken() {
    try {
      const savedTokens = await this.loadTokens();
      
      if (!savedTokens || !savedTokens.refresh_token) {
        throw new Error('No hay refresh token disponible.');
      }

      const response = await axios.post(`${this.baseURL}/oauth/refresh`, new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: savedTokens.refresh_token
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const newTokens = {
        ...savedTokens,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        expires_at: Date.now() + (response.data.expires_in * 1000),
        updated_at: Date.now()
      };

      if (response.data.refresh_token) {
        newTokens.refresh_token = response.data.refresh_token;
      }

      await this.saveTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Error refrescando token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Obtener token válido
  async getValidAccessToken() {
    try {
      const tokens = await this.loadTokens();
      
      if (!tokens) {
        throw new Error('No hay tokens guardados.');
      }

      const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
      
      if (tokens.expires_at < fiveMinutesFromNow) {
        const refreshedTokens = await this.refreshAccessToken();
        return refreshedTokens.access_token;
      }

      return tokens.access_token;
    } catch (error) {
      console.error('Error obteniendo token válido:', error.message);
      throw error;
    }
  }

  // Guardar tokens
  async saveTokens(tokens) {
    try {
      const configDir = path.dirname(this.tokenFilePath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens, null, 2));
      console.log('Tokens guardados exitosamente');
    } catch (error) {
      console.error('Error guardando tokens:', error.message);
      throw error;
    }
  }

  // Cargar tokens
  async loadTokens() {
    try {
      if (!fs.existsSync(this.tokenFilePath)) {
        return null;
      }
      
      const tokensData = fs.readFileSync(this.tokenFilePath, 'utf8');
      return JSON.parse(tokensData);
    } catch (error) {
      console.error('Error cargando tokens:', error.message);
      return null;
    }
  }

  // Verificar tokens válidos
  async hasValidTokens() {
    try {
      const tokens = await this.loadTokens();
      return tokens && tokens.access_token && tokens.refresh_token;
    } catch (error) {
      return false;
    }
  }
}

module.exports = AdobeOAuthService;