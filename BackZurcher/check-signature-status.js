/**
 * Verificar si el documento fue firmado en DocuSign
 */

require('dotenv').config();
const docusign = require('docusign-esign');

async function checkIfSigned() {
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

    console.log('🔍 Verificando estado del envelope en DocuSign...\n');
    
    // Obtener información del envelope
    const envelope = await envelopesApi.getEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, envelopeId);
    
    console.log('📋 INFORMACIÓN DEL ENVELOPE:');
    console.log('─────────────────────────────────────');
    console.log('Envelope ID:', envelope.envelopeId);
    console.log('Status:', envelope.status);
    console.log('Sent DateTime:', envelope.sentDateTime);
    console.log('Completed DateTime:', envelope.completedDateTime || 'Pendiente');
    console.log('');

    // Obtener información de los firmantes
    const recipients = await envelopesApi.listRecipients(process.env.DOCUSIGN_ACCOUNT_ID, envelopeId);
    const signer = recipients.signers[0];

    console.log('👤 INFORMACIÓN DEL FIRMANTE:');
    console.log('─────────────────────────────────────');
    console.log('Nombre:', signer.name);
    console.log('Email:', signer.email);
    console.log('Status:', signer.status);
    console.log('Sent:', signer.sentDateTime);
    console.log('Delivered:', signer.deliveredDateTime || 'N/A');
    console.log('Signed:', signer.signedDateTime || 'Pendiente');
    console.log('');

    if (envelope.status === 'completed') {
      console.log('✅ ¡DOCUMENTO FIRMADO EXITOSAMENTE!');
      console.log('');
      console.log('🔄 Ahora el cron job debería:');
      console.log('   1. Detectar el documento firmado (ejecuta cada 30 min)');
      console.log('   2. Descargar el PDF firmado');
      console.log('   3. Subirlo a Cloudinary');
      console.log('   4. Actualizar el presupuesto a status: "signed"');
      console.log('');
      console.log('💡 Para ejecutar el cron manualmente ahora:');
      console.log('   node src/services/checkPendingSignatures.js');
    } else {
      console.log('⏳ Documento aún no completado');
      console.log('Status actual:', envelope.status);
      console.log('');
      console.log('Estados posibles:');
      console.log('  - sent: Enviado, esperando firma');
      console.log('  - delivered: Email entregado');
      console.log('  - completed: Firmado completamente ✅');
      console.log('  - voided: Cancelado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.body) {
      console.error('Detalles:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

checkIfSigned();
