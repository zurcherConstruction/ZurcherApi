/**
 * Script para descargar PDF firmado de DocuSign y actualizar presupuesto
 * Budget ID: 2299
 * Envelope ID: d3b0cfb1-6015-4e2b-813c-297a2b8406f2
 */

require('dotenv').config();
const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');

async function downloadSignedPDF() {
  try {
    console.log('🔄 Descargando PDF firmado de DocuSign...\n');

    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath('https://demo.docusign.net/restapi');

    // Autenticar con JWT
    const jwtLifeSec = 10 * 60;
    const scopes = ['signature', 'impersonation'];
    const rsaKey = fs.readFileSync('./docusign_private.key');
    
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

    console.log('📥 Descargando documento firmado...');
    
    // Descargar el documento firmado
    const document = await envelopesApi.getDocument(
      process.env.DOCUSIGN_ACCOUNT_ID,
      envelopeId,
      'combined' // 'combined' descarga todos los documentos en un PDF
    );

    // Crear directorio si no existe
    const uploadsDir = path.join(__dirname, 'uploads', 'signed-budgets');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Guardar el PDF
    const fileName = 'Budget_2299_Invoice_36_signed.pdf';
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, document);
    
    console.log('✅ PDF firmado descargado exitosamente');
    console.log('📁 Ruta:', filePath);
    console.log('📊 Tamaño:', (document.length / 1024).toFixed(2), 'KB');
    console.log('');

    console.log('📋 SIGUIENTE PASO:');
    console.log('   El PDF firmado está listo en:', filePath);
    console.log('');
    console.log('   Para completar el proceso, el cron job debería:');
    console.log('   1. ✅ Descargar PDF (completado)');
    console.log('   2. ⏳ Subir a Cloudinary');
    console.log('   3. ⏳ Actualizar Budget 2299 con:');
    console.log('      - status: "signed"');
    console.log('      - signedPdfPath: [cloudinary URL]');
    console.log('');
    console.log('💡 Como el cron está configurado para ejecutarse cada 30 minutos,');
    console.log('   puedes esperar o revisar manualmente en la base de datos.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.body) {
      console.error('Detalles:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

downloadSignedPDF();
