/**
 * Script para obtener el enlace directo de firma de DocuSign
 * Útil cuando el email no llega
 */

require('dotenv').config();
const docusign = require('docusign-esign');

async function getSigningUrl() {
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

    // Obtener información del envelope
    console.log('📧 INFORMACIÓN DEL EMAIL DE DOCUSIGN:\n');
    
    const envelope = await envelopesApi.getEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, envelopeId);
    console.log('Status del Envelope:', envelope.status);
    console.log('Email enviado a:', 'YANICORC@GMAIL.COM');
    console.log('Fecha de envío:', envelope.sentDateTime);
    console.log('Subject:', envelope.emailSubject);
    console.log('');

    // Obtener recipients
    const recipients = await envelopesApi.listRecipients(process.env.DOCUSIGN_ACCOUNT_ID, envelopeId);
    const signer = recipients.signers[0];
    
    console.log('📋 Estado del Firmante:');
    console.log('Nombre:', signer.name);
    console.log('Email:', signer.email);
    console.log('Status:', signer.status);
    console.log('Enviado:', signer.sentDateTime);
    console.log('Entregado:', signer.deliveredDateTime || 'Pendiente de confirmar');
    console.log('');

    console.log('⚠️  NOTA: El email SÍ fue enviado por DocuSign pero puede estar en:');
    console.log('   📂 Carpeta de Spam');
    console.log('   📂 Carpeta de Promociones');
    console.log('   📂 Carpeta de Notificaciones/Social');
    console.log('');
    console.log('🔍 Busca en Gmail: "from:docusign" o "from:noreply@docusign.net"');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🔗 ENLACE DIRECTO PARA FIRMAR (válido por 5 minutos):');
    console.log('');
    
    // Generar enlace de firma
    const recipientViewRequest = {
      authenticationMethod: 'none',
      email: signer.email,
      userName: signer.name,
      returnUrl: 'https://www.google.com',
      clientUserId: signer.clientUserId || null
    };

    const recipientView = await envelopesApi.createRecipientView(
      process.env.DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      { recipientViewRequest }
    );

    console.log(recipientView.url);
    console.log('');
    console.log('💡 Copia este enlace y ábrelo en tu navegador para firmar directamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

getSigningUrl();
