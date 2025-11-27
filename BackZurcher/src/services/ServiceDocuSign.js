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
    
    // Usar DOCUSIGN_BASE_PATH del .env o valor por defecto según ambiente
    this.basePath = process.env.DOCUSIGN_BASE_PATH || 
      (this.environment === 'demo' 
        ? 'https://demo.docusign.net/restapi'
        : 'https://www.docusign.net/restapi');

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
   * Obtener token de acceso usando JWT (Service Integration)
   * Este método NO requiere autorización manual del usuario
   */
  async getAccessToken() {
    try {
      console.log('🔐 Obteniendo access token de DocuSign con JWT...');

      // 🆕 Leer la llave privada desde múltiples fuentes
      let privateKey;
      
      // Prioridad 1: Variable de entorno con contenido directo (PRODUCCIÓN - Railway)
      if (process.env.DOCUSIGN_PRIVATE_KEY_CONTENT) {
        console.log('📝 Usando clave privada desde variable de entorno (contenido directo)');
        // Reemplazar \n literales por saltos de línea reales
        privateKey = process.env.DOCUSIGN_PRIVATE_KEY_CONTENT.replace(/\\n/g, '\n');
      }
      // Prioridad 2: Variable de entorno con Base64 (Alternativa para Railway)
      else if (process.env.DOCUSIGN_PRIVATE_KEY_BASE64) {
        console.log('📝 Usando clave privada desde variable de entorno (Base64)');
        const buffer = Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY_BASE64, 'base64');
        privateKey = buffer.toString('utf8');
      }
      // Prioridad 3: Leer desde archivo local (DESARROLLO)
      else {
        console.log('📁 Leyendo clave privada desde archivo local');
        const privateKeyPath = path.resolve(this.privateKeyPath);
        if (!fs.existsSync(privateKeyPath)) {
          throw new Error(`No se encontró la llave privada en: ${privateKeyPath}. 
          
⚠️  Para DESARROLLO: Coloca el archivo docusign_private.key en la carpeta BackZurcher/
⚠️  Para PRODUCCIÓN (Railway): Agrega la variable de entorno DOCUSIGN_PRIVATE_KEY_CONTENT con el contenido completo de la clave.`);
        }
        privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      }

      // Configurar el OAuth basePath para el ambiente correcto
      const oAuthBasePath = process.env.DOCUSIGN_OAUTH_BASE_PATH || 
        (this.environment === 'demo'
          ? 'account-d.docusign.com'
          : 'account.docusign.com');
      
      this.apiClient.setOAuthBasePath(oAuthBasePath);

      // Configurar JWT
      const jwtLifeSec = 3600; // 1 hora
      const scopes = ['signature', 'impersonation'];

      // Solicitar token JWT
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
      
      console.log('✅ Access token JWT obtenido exitosamente');
      return accessToken;
    } catch (error) {
      console.error('❌ Error obteniendo access token JWT:', error.message);
      
      // Si el error es de consentimiento, mostrar URL para dar consentimiento
      if (error.response?.body?.error === 'consent_required') {
        console.error('\n⚠️  ACCIÓN REQUERIDA: Se necesita consentimiento de usuario (solo una vez)');
        console.error('👉 Visita este URL en el navegador para autorizar la aplicación:\n');
        const consentUrl = `https://${this.environment === 'demo' ? 'account-d' : 'account'}.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${this.integrationKey}&redirect_uri=https://www.docusign.com`;
        console.error(consentUrl);
        console.error('\nDespués de autorizar, vuelve a intentar enviar el documento.\n');
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
   * @param {boolean} getSigningUrl - Si true, retorna URL de firma en lugar de enviar email
   */
  async sendBudgetForSignature(pdfPath, clientEmail, clientName, fileName, subject, message, getSigningUrl = true) {
    try {
      // 🔧 Normalizar email a minúsculas para evitar problemas de entrega
      const normalizedEmail = clientEmail.toLowerCase();
      
      console.log('\n🚀 === ENVIANDO DOCUMENTO A DOCUSIGN ===');
      console.log('📧 Cliente:', normalizedEmail, '-', clientName);
      console.log('📄 Archivo:', fileName);
      console.log('🔗 Generar URL de firma:', getSigningUrl ? 'Sí' : 'No (enviar email)');

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
        normalizedEmail, // Usar email normalizado
        clientName,
        subject,
        message,
        getSigningUrl // Pasar flag para usar clientUserId
      );

      // Enviar el envelope
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition: envelopeDefinition
      });

      console.log('✅ Documento enviado exitosamente a DocuSign');
      console.log('📋 Envelope ID:', results.envelopeId);
      console.log('📊 Status:', results.status);

      const response = {
        success: true,
        envelopeId: results.envelopeId,
        status: results.status,
        uri: results.uri,
        statusDateTime: results.statusDateTime
      };

      // Si se solicitó URL de firma, generarla
      if (getSigningUrl) {
        console.log('🔗 Generando URL de firma embebida...');
        const signingUrl = await this.getRecipientViewUrl(
          results.envelopeId,
          normalizedEmail,
          clientName
        );
        response.signingUrl = signingUrl;
        console.log('✅ URL de firma generada exitosamente');
      }

      return response;

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
  createEnvelopeDefinition(pdfBase64, fileName, clientEmail, clientName, subject, message, useEmbeddedSigning = true) {
    // Documento
    const document = docusign.Document.constructFromObject({
      documentBase64: pdfBase64,
      name: fileName,
      fileExtension: 'pdf',
      documentId: '1'
    });

    // Firmante
    // Si useEmbeddedSigning = true, usar clientUserId para poder generar URL
    // Además, suprimir notificación de email de DocuSign
    const signer = docusign.Signer.constructFromObject({
      email: clientEmail,
      name: clientName,
      recipientId: '1',
      routingOrder: '1',
      clientUserId: useEmbeddedSigning ? clientEmail : null, // clientUserId necesario para RecipientView
      emailNotification: useEmbeddedSigning ? { 
        emailSubject: 'Please sign this document',
        emailBody: 'Please sign this document',
        supportedLanguage: 'en'
      } : undefined
    });

    // Tab de firma (dónde firmar) - Usar Anchor Text para ubicación automática
    const signHereTab = docusign.SignHere.constructFromObject({
      documentId: '1',
      anchorString: 'Client Signature:', // Buscar este texto en el PDF
      anchorUnits: 'pixels',
      anchorXOffset: '90',     // ✅ Mover 90px a la derecha (después del texto y sobre la línea)
      anchorYOffset: '-5',     // ✅ Mantener arriba para alineación
      name: 'SignHere',
      optional: 'false',
      scaleValue: '1'
    });

    // Tab de fecha - Usar Anchor Text para ubicación automática
    const dateSignedTab = docusign.DateSigned.constructFromObject({
      documentId: '1',
      anchorString: 'Date:',  // Buscar "Date:" que está después de Client Signature
      anchorUnits: 'pixels',
      anchorXOffset: '35',     // ✅ Mover 35px a la derecha del texto "Date:"
      anchorYOffset: '-5',     // ✅ Mantener arriba para alineación
      name: 'DateSigned',
      optional: 'false',
      fontSize: 'size9'
    });

    // Asignar tabs al firmante
    signer.tabs = docusign.Tabs.constructFromObject({
      signHereTabs: [signHereTab],
      dateSignedTabs: [dateSignedTab]
    });

    // Configurar notificaciones de email
    const notification = docusign.Notification.constructFromObject({
      useAccountDefaults: 'false',
      reminders: docusign.Reminders.constructFromObject({
        reminderEnabled: 'true',
        reminderDelay: '2',
        reminderFrequency: '2'
      }),
      expirations: docusign.Expirations.constructFromObject({
        expireEnabled: 'true',
        expireAfter: '120',
        expireWarn: '5'
      })
    });

    // Definición del envelope
    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      emailSubject: subject || 'Please sign this document',
      emailBlurb: message || 'Please review and sign the attached document.',
      documents: [document],
      recipients: docusign.Recipients.constructFromObject({
        signers: [signer]
      }),
      notification: notification,
      status: useEmbeddedSigning ? 'sent' : 'sent', // ✅ Debe ser 'sent' para poder generar RecipientView
      enableWetSign: 'false', // No permitir firma manual (solo digital)
      allowMarkup: 'false',
      allowReassign: 'false'
    });

    return envelopeDefinition;
  }

  /**
   * Obtener URL de firma embebida para el cliente
   * @param {string} envelopeId - ID del envelope
   * @param {string} email - Email del firmante
   * @param {string} name - Nombre del firmante
   * @param {string} returnUrl - URL de retorno después de firmar
   */
  async getRecipientViewUrl(envelopeId, email, name, returnUrl = null) {
    try {
      console.log(`🔗 Generando URL de firma para envelope: ${envelopeId}`);
      
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      
      // URL de retorno por defecto - redirige a la landing principal
      const defaultReturnUrl = process.env.FRONTEND_URL || 'https://zurcher-construction.vercel.app';
      
      const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject({
        returnUrl: returnUrl || defaultReturnUrl, // Redirige a la landing (/) directamente
        authenticationMethod: 'email',
        email: email.toLowerCase(),
        userName: name,
        clientUserId: email.toLowerCase() // Debe coincidir con el usado en createEnvelopeDefinition
      });

      const results = await envelopesApi.createRecipientView(
        this.accountId,
        envelopeId,
        { recipientViewRequest }
      );

      console.log(`✅ URL de firma generada exitosamente`);
      
      return results.url;

    } catch (error) {
      console.error('❌ Error generando URL de firma:', error.message);
      if (error.response) {
        console.error('Response:', JSON.stringify(error.response.body, null, 2));
      }
      throw error;
    }
  }

  /**
   * Obtener estado de un envelope (usado por SignatureVerificationController)
   * @param {string} envelopeId - ID del envelope de DocuSign
   */
  async getEnvelopeStatus(envelopeId) {
    try {
      console.log(`🔍 [DocuSign] Verificando estado del envelope: ${envelopeId}`);
      
      await this.getAccessToken();

      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const envelope = await envelopesApi.getEnvelope(this.accountId, envelopeId);

      console.log(`📊 [DocuSign] Estado del envelope: ${envelope.status}`);

      return {
        status: envelope.status, // 'sent', 'delivered', 'completed', 'declined', 'voided'
        statusDateTime: envelope.statusDateTime,
        completedDateTime: envelope.completedDateTime,
        sentDateTime: envelope.sentDateTime,
        deliveredDateTime: envelope.deliveredDateTime
      };

    } catch (error) {
      console.error('❌ [DocuSign] Error obteniendo estado del envelope:', error.message);
      throw error;
    }
  }

  /**
   * Verificar si un documento está firmado (método legacy - usa getEnvelopeStatus)
   * @param {string} envelopeId - ID del envelope de DocuSign
   */
  async isDocumentSigned(envelopeId) {
    const status = await this.getEnvelopeStatus(envelopeId);
    
    const isSigned = status.status === 'completed';

    return {
      signed: isSigned,
      status: status.status,
      statusDateTime: status.statusDateTime,
      completedDateTime: status.completedDateTime
    };
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
