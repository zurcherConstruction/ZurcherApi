const db = require('../data/index');
const axios = require('axios');

/**
 * Servicio robusto para manejo de tokens DocuSign
 * Incluye persistencia en base de datos, auto-refresh, y manejo de errores
 */
class DocuSignTokenService {
  
  /**
   * Guarda un nuevo token en la base de datos
   */
  static async saveToken(tokenData, metadata = {}) {
    try {
      const obtainedAt = new Date();
      const expiresAt = new Date(obtainedAt.getTime() + tokenData.expires_in * 1000);

      // Buscar token existente para esta configuración
      const existingToken = await db.DocuSignToken.findOne({
        where: {
          provider: 'docusign',
          environment: process.env.DOCUSIGN_ENVIRONMENT || 'demo',
          accountId: process.env.DOCUSIGN_ACCOUNT_ID
        }
      });

      const tokenRecord = {
        provider: 'docusign',
        environment: process.env.DOCUSIGN_ENVIRONMENT || 'demo',
        accountId: process.env.DOCUSIGN_ACCOUNT_ID,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        obtainedAt,
        expiresAt,
        lastUsedAt: obtainedAt,
        refreshCount: existingToken ? existingToken.refreshCount : 0,
        isActive: true,
        userAgent: metadata.userAgent || null,
        ipAddress: metadata.ipAddress || null,
        notes: metadata.notes || null
      };

      if (existingToken) {
        // Actualizar token existente
        await existingToken.update(tokenRecord);
        console.log('✅ Token DocuSign actualizado en base de datos');
        return existingToken;
      } else {
        // Crear nuevo token
        const newToken = await db.DocuSignToken.create(tokenRecord);
        console.log('✅ Nuevo token DocuSign guardado en base de datos');
        return newToken;
      }

    } catch (error) {
      console.error('❌ Error guardando token DocuSign:', error);
      throw new Error(`Error guardando token: ${error.message}`);
    }
  }

  /**
   * Obtiene el token activo desde la base de datos
   */
  static async getActiveToken() {
    try {
      const token = await db.DocuSignToken.findOne({
        where: {
          provider: 'docusign',
          environment: process.env.DOCUSIGN_ENVIRONMENT || 'demo',
          accountId: process.env.DOCUSIGN_ACCOUNT_ID,
          isActive: true
        },
        order: [['createdAt', 'DESC']]
      });

      return token;
    } catch (error) {
      console.error('❌ Error obteniendo token activo:', error);
      return null;
    }
  }

  /**
   * Verifica si un token está próximo a expirar
   */
  static isTokenExpiringSoon(token, minutesAhead = 5) {
    if (!token || !token.expiresAt) return true;
    
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const thresholdTime = new Date(now.getTime() + minutesAhead * 60 * 1000);
    
    return expiresAt <= thresholdTime;
  }

  /**
   * Refresca un token usando el refresh_token
   */
  static async refreshToken(tokenRecord) {
    try {
      const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
      const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;
      const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
      
      const authServer = environment === 'production' 
        ? 'account.docusign.com' 
        : 'account-d.docusign.com';

      // DocuSign OAuth requiere autenticación básica
      const auth = Buffer.from(`${integrationKey}:${clientSecret}`).toString('base64');

      console.log('🔄 Refrescando token DocuSign...');

      const response = await axios.post(
        `https://${authServer}/oauth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenRecord.refreshToken
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Actualizar token en base de datos
      const updatedData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || tokenRecord.refreshToken, // Algunos providers no devuelven nuevo refresh_token
        tokenType: response.data.token_type || 'Bearer',
        expiresIn: response.data.expires_in,
        obtainedAt: new Date(),
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        refreshCount: (tokenRecord.refreshCount || 0) + 1,
        lastUsedAt: new Date(),
        notes: `Token refrescado automáticamente. Refresh #${(tokenRecord.refreshCount || 0) + 1}`
      };

      await tokenRecord.update(updatedData);

      console.log('✅ Token DocuSign refrescado exitosamente');
      return tokenRecord;

    } catch (error) {
      console.error('❌ Error refrescando token DocuSign:', error);
      
      // Si el refresh falla, marcar token como inactivo
      await tokenRecord.update({
        isActive: false,
        notes: `Token invalidado por error de refresh: ${error.message}`
      });

      throw new Error(`Error refrescando token: ${error.message}`);
    }
  }

  /**
   * Obtiene un token válido, refrescándolo si es necesario
   */
  static async getValidAccessToken() {
    try {
      // Obtener token activo
      let token = await DocuSignTokenService.getActiveToken();

      if (!token) {
        throw new Error('No hay tokens disponibles. Debes autorizar la aplicación primero en: ' + process.env.API_URL + '/docusign/auth');
      }

      // Verificar si necesita refresh
      if (DocuSignTokenService.isTokenExpiringSoon(token)) {
        console.log('🔄 Token próximo a expirar, refrescando automáticamente...');
        token = await DocuSignTokenService.refreshToken(token);
      }

      // Actualizar lastUsedAt
      await token.update({ lastUsedAt: new Date() });

      return token.accessToken;

    } catch (error) {
      console.error('❌ Error obteniendo token válido:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado de autenticación
   */
  static async getAuthStatus() {
    try {
      const token = await DocuSignTokenService.getActiveToken();

      if (!token) {
        return {
          authenticated: false,
          isExpired: false,
          needsRefresh: false,
          message: 'No hay tokens disponibles. Debes autorizar la aplicación.'
        };
      }

      const now = new Date();
      const expiresAt = new Date(token.expiresAt);
      const isExpired = now >= expiresAt;
      const needsRefresh = DocuSignTokenService.isTokenExpiringSoon(token);

      return {
        authenticated: true,
        isExpired,
        needsRefresh,
        obtainedAt: token.obtainedAt,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        refreshCount: token.refreshCount,
        environment: token.environment,
        accountId: token.accountId
      };

    } catch (error) {
      return {
        authenticated: false,
        isExpired: false,
        needsRefresh: false,
        error: error.message
      };
    }
  }

  /**
   * Test de conexión con DocuSign API
   */
  static async testConnection() {
    try {
      const accessToken = await DocuSignTokenService.getValidAccessToken();

      // Hacer llamada de test a la API
      const response = await axios.get(
        `${process.env.DOCUSIGN_BASE_PATH}/accounts/${process.env.DOCUSIGN_ACCOUNT_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        const account = response.data;
        return { 
          success: true, 
          message: `Conectado a cuenta: ${account.account_name || account.email || 'DocuSign'}`,
          accountId: account.account_id || process.env.DOCUSIGN_ACCOUNT_ID,
          accountName: account.account_name
        };
      } else {
        return { success: false, message: `Status inesperado: ${response.status}` };
      }

    } catch (error) {
      // Endpoint alternativo si el principal falla
      if (error.response && error.response.status === 404) {
        try {
          const accessToken = await DocuSignTokenService.getValidAccessToken();
          
          const response = await axios.get(
            `${process.env.DOCUSIGN_BASE_PATH}/accounts`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            }
          );

          if (response.status === 200 && response.data.accounts && response.data.accounts.length > 0) {
            const account = response.data.accounts[0];
            return { 
              success: true, 
              message: `Conectado a cuenta: ${account.account_name || account.email || 'DocuSign'}`,
              accountId: account.account_id,
              accountName: account.account_name
            };
          }
        } catch (fallbackError) {
          return { success: false, message: `Error en endpoint alternativo: ${fallbackError.message}` };
        }
      }
      
      return { success: false, message: error.message };
    }
  }

  /**
   * Revoca todos los tokens activos (útil para logout o cambio de cuenta)
   */
  static async revokeAllTokens() {
    try {
      await db.DocuSignToken.update(
        { 
          isActive: false,
          notes: 'Token revocado manualmente'
        },
        {
          where: {
            provider: 'docusign',
            environment: process.env.DOCUSIGN_ENVIRONMENT || 'demo',
            accountId: process.env.DOCUSIGN_ACCOUNT_ID,
            isActive: true
          }
        }
      );

      console.log('✅ Todos los tokens DocuSign han sido revocados');
      return true;
    } catch (error) {
      console.error('❌ Error revocando tokens:', error);
      return false;
    }
  }

  /**
   * Limpia tokens expirados antiguos (mantenimiento)
   */
  static async cleanupExpiredTokens(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db.DocuSignToken.destroy({
        where: {
          isActive: false,
          expiresAt: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 Limpiados ${deleted} tokens DocuSign expirados`);
      return deleted;
    } catch (error) {
      console.error('❌ Error limpiando tokens expirados:', error);
      return 0;
    }
  }
}

module.exports = DocuSignTokenService;