/**
 * Script para reenviar email de DocuSign al firmante
 * Envelope ID: d3b0cfb1-6015-4e2b-813c-297a2b8406f2
 */

require('dotenv').config();
const docusign = require('docusign-esign');

async function resendEmail() {
  try {
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath('https://demo.docusign.net/restapi');

    // Autenticar con JWT
    const jwtLifeSec = 10 * 60;
    const scopes = ['signature', 'impersonation'];
    const rsaKey = require('fs').readFileSync('./docusign_private.key');
    
    const results = await apiClient.requestJWTUserToken(
      process.env.DOCUSIGN_INTEGRATION_KEY,
      process.env.DOCUSIGN_USER_ID,
      scopes,
      rsaKey,
      jwtLifeSec
    );

    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    const envelopeId = 'd3b0cfb1-6015-4e2b-813c-297a2b8406f2';

    // Reenviar notificación al firmante
    console.log('📧 Reenviando email de DocuSign...');
    
    const notification = new docusign.Notification();
    notification.useAccountDefaults = 'false';
    notification.reminders = new docusign.Reminders();
    notification.reminders.reminderEnabled = 'true';
    notification.reminders.reminderDelay = '1'; // Enviar inmediatamente
    notification.reminders.reminderFrequency = '1';

    await envelopesApi.update(process.env.DOCUSIGN_ACCOUNT_ID, envelopeId, {
      notification: notification,
      resendEnvelope: 'true'
    });

    console.log('✅ Email reenviado exitosamente!');
    console.log('📧 Verifica tu casilla de email: YANICORC@GMAIL.COM');
    console.log('📂 Revisa también: Spam, Promociones, Notificaciones');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.body);
    }
  }
}

resendEmail();
