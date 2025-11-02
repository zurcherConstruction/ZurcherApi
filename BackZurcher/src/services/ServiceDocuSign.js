const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');

class DocuSignService {
  constructor() {
    this.integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    this.userId = process.env.DOCUSIGN_USER_ID;
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    this.privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './docusign_private.key';
    this.environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
    this.basePath = this.environment === 'demo' 
      ? 'https://demo.docusign.net/restapi'
      : 'https://www.docusign.net/restapi';

    // Validar configuración
    if (!this.integrationKey || !this.userId || !this.accountId) {
      console.error('❌ Faltan credenciales de DocuSign en variables de entorno');
      console.error('Requeridas: DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID');
    }

    // Cliente API de DocuSign
    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(this.basePath);
  }

  /**
   * Obtener token de acceso usando Authorization Code Grant
   */
  async getAccessToken() {
    try {
      console.log('🔐 Obteniendo access token de DocuSign...');

      // Cargar tokens de Authorization Code Grant
      const DocuSignController = require('../controllers/DocuSignController');
      const accessToken = await DocuSignController.getValidAccessToken();

      if (!accessToken) {
        throw new Error('No hay access token disponible. Autoriza la aplicación en: ' + process.env.API_URL + '/docusign/auth');
      }

      // Configurar el token en el cliente API
      this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

      return accessToken;
    } catch (error) {
      console.error('❌ Error obteniendo access token:', error.message);
      throw error;
    }
  }

  /**
   * Obtener token de acceso usando JWT (DEPRECADO - usar Authorization Code)
   * Mantener por si se resuelve el problema de JWT en el futuro
   */
  async getAccessTokenJWT() {
    try {
      console.log('🔐 Obteniendo access token de DocuSign con JWT...');

      // Leer la llave privada
      const privateKeyPath = path.resolve(this.privateKeyPath);
      if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`No se encontró la llave privada en: ${privateKeyPath}`);
      }

      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      // Configurar JWT
      const jwtLifeSec = 3600; // 1 hora
      const scopes = ['signature', 'impersonation'];

      // Solicitar token
      const results = await this.apiClient.requestJWTUserToken(
        this.integrationKey,
        this.userId,
        scopes,
        privateKey,
        jwtLifeSec
      );

      const accessToken = results.body.access_token;
      
      // Configurar el token en el API client
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
      
      console.log('✅ Access token obtenido exitosamente');
      return accessToken;
    } catch (error) {
      console.error('❌ Error obteniendo access token:', error.message);
      if (error.response?.body?.error === 'consent_required') {
        console.error('⚠️ Se requiere consentimiento. Visita este URL en el navegador:');
        console.error(`https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${this.integrationKey}&redirect_uri=https://www.docusign.com`);
      }
      throw error;
    }
  }

  /**
   * Enviar documento para firma (equivalente a sendBudgetForSignature de SignNow)
   * @param {string} pdfPath - Ruta local o URL del PDF
   * @param {string} clientEmail - Email del cliente que firmará
   * @param {string} clientName - Nombre del cliente
   * @param {string} fileName - Nombre del archivo
   * @param {string} subject - Asunto del email
   * @param {string} message - Mensaje del email
   */
  async sendBudgetForSignature(pdfPath, clientEmail, clientName, fileName, subject, message) {
    try {
      console.log('\n🚀 === ENVIANDO DOCUMENTO A DOCUSIGN ===');
      console.log('📧 Cliente:', clientEmail, '-', clientName);
      console.log('📄 Archivo:', fileName);

      // Obtener token
      await this.getAccessToken();

      // Leer el archivo PDF
      let pdfBytes;
      if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
        // Si es URL, descargar
        const axios = require('axios');
        const response = await axios.get(pdfPath, { responseType: 'arraybuffer' });
        pdfBytes = Buffer.from(response.data);
      } else {
        // Si es local, leer
        pdfBytes = fs.readFileSync(pdfPath);
      }

      const pdfBase64 = pdfBytes.toString('base64');

      // Crear el envelope (sobre)
      const envelopeDefinition = this.createEnvelopeDefinition(
        pdfBase64,
        fileName,
        clientEmail,
        clientName,
        subject,
        message
      );

      // Enviar el envelope
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition: envelopeDefinition
      });

      console.log('✅ Documento enviado exitosamente a DocuSign');
      console.log('📋 Envelope ID:', results.envelopeId);
      console.log('📊 Status:', results.status);

      return {
        success: true,
        envelopeId: results.envelopeId,
        status: results.status,
        uri: results.uri,
        statusDateTime: results.statusDateTime
      };

    } catch (error) {
      console.error('❌ Error enviando documento a DocuSign:', error.message);
      if (error.response?.body) {
        console.error('Detalles:', JSON.stringify(error.response.body, null, 2));
      }
      throw error;
    }
  }

  /**
   * Crear definición del envelope para firma
   */
  createEnvelopeDefinition(pdfBase64, fileName, clientEmail, clientName, subject, message) {
    // Documento
    const document = docusign.Document.constructFromObject({
      documentBase64: pdfBase64,
      name: fileName,
      fileExtension: 'pdf',
      documentId: '1'
    });

    // Firmante
    const signer = docusign.Signer.constructFromObject({
      email: clientEmail,
      name: clientName,
      recipientId: '1',
      routingOrder: '1',
      clientUserId: null // null = firma por email (no embedded)
    });

    // Tab de firma (dónde firmar)
    const signHereTab = docusign.SignHere.constructFromObject({
      documentId: '1',
      pageNumber: '1',
      xPosition: '100',
      yPosition: '650',
      name: 'SignHere',
      optional: 'false',
      scaleValue: '1'
    });

    // Tab de fecha
    const dateSignedTab = docusign.DateSigned.constructFromObject({
      documentId: '1',
      pageNumber: '1',
      xPosition: '300',
      yPosition: '650',
      name: 'DateSigned',
      optional: 'false'
    });

    // Asignar tabs al firmante
    signer.tabs = docusign.Tabs.constructFromObject({
      signHereTabs: [signHereTab],
      dateSignedTabs: [dateSignedTab]
    });

    // Definición del envelope
    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      emailSubject: subject || 'Please sign this document',
      emailBlurb: message || 'Please review and sign the attached document.',
      documents: [document],
      recipients: docusign.Recipients.constructFromObject({
        signers: [signer]
      }),
      status: 'sent' // Enviar inmediatamente
    });

    return envelopeDefinition;
  }

  /**
   * Verificar si un documento está firmado
   * @param {string} envelopeId - ID del envelope de DocuSign
   */
  async isDocumentSigned(envelopeId) {
    try {
      console.log(`🔍 Verificando estado del envelope: ${envelopeId}`);
      
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const envelope = await envelopesApi.getEnvelope(this.accountId, envelopeId);

      console.log(`📊 Estado del envelope: ${envelope.status}`);

      const isSigned = envelope.status === 'completed';

      return {
        signed: isSigned,
        status: envelope.status,
        statusDateTime: envelope.statusDateTime,
        completedDateTime: envelope.completedDateTime
      };

    } catch (error) {
      console.error('❌ Error verificando estado del envelope:', error.message);
      throw error;
    }
  }

  /**
   * Descargar documento firmado
   * @param {string} envelopeId - ID del envelope
   * @param {string} savePath - Ruta donde guardar el PDF firmado
   */
  async downloadSignedDocument(envelopeId, savePath) {
    try {
      console.log(`📥 Descargando documento firmado: ${envelopeId}`);
      
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      
      // Descargar el documento combinado (todos los documentos en un PDF)
      const results = await envelopesApi.getDocument(
        this.accountId, 
        envelopeId, 
        'combined' // 'combined' o el documentId específico
      );

      // results es un Buffer
      fs.writeFileSync(savePath, results);

      console.log(`✅ Documento firmado guardado en: ${savePath}`);
      return savePath;

    } catch (error) {
      console.error('❌ Error descargando documento firmado:', error.message);
      throw error;
    }
  }

  /**
   * Obtener información detallada de un envelope
   */
  async getEnvelopeDetails(envelopeId) {
    try {
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const envelope = await envelopesApi.getEnvelope(this.accountId, envelopeId);

      // Obtener información de los recipients
      const recipients = await envelopesApi.listRecipients(this.accountId, envelopeId);

      return {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        emailSubject: envelope.emailSubject,
        sentDateTime: envelope.sentDateTime,
        deliveredDateTime: envelope.deliveredDateTime,
        completedDateTime: envelope.completedDateTime,
        recipients: recipients
      };

    } catch (error) {
      console.error('❌ Error obteniendo detalles del envelope:', error.message);
      throw error;
    }
  }

  /**
   * Cancelar/void un envelope (antes de que se complete)
   */
  async voidEnvelope(envelopeId, reason = 'Cancelled by sender') {
    try {
      console.log(`🚫 Cancelando envelope: ${envelopeId}`);
      
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      
      const voidedEnvelope = await envelopesApi.update(this.accountId, envelopeId, {
        envelope: {
          status: 'voided',
          voidedReason: reason
        }
      });

      console.log(`✅ Envelope cancelado exitosamente`);
      return voidedEnvelope;

    } catch (error) {
      console.error('❌ Error cancelando envelope:', error.message);
      throw error;
    }
  }

  /**
   * Reenviar notificación de firma
   */
  async resendEnvelope(envelopeId) {
    try {
      console.log(`📧 Reenviando notificación para envelope: ${envelopeId}`);
      
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      
      await envelopesApi.update(this.accountId, envelopeId, {
        resendEnvelope: 'true'
      });

      console.log(`✅ Notificación reenviada exitosamente`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error reenviando notificación:', error.message);
      throw error;
    }
  }

  /**
   * Validar webhook signature (si se configuró DOCUSIGN_WEBHOOK_SECRET)
   */
  validateWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️ DOCUSIGN_WEBHOOK_SECRET no configurado, no se puede validar signature');
      return true; // Permitir si no está configurado
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('base64');

    return calculatedSignature === signature;
  }
}

module.exports = DocuSignService;
