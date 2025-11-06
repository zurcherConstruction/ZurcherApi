/**
 * Test: Verificar que checkSignatureStatus funciona con DocuSign
 * Budget ID: 2299
 */

require('dotenv').config();
const DocuSignService = require('./src/services/ServiceDocuSign');

async function testCheckSignature() {
  try {
    console.log('🧪 PRUEBA: Verificación de firma con DocuSign\n');
    console.log('Budget ID: 2299');
    console.log('Envelope ID: d3b0cfb1-6015-4e2b-813c-297a2b8406f2');
    console.log('Signature Method: docusign\n');

    const docuSignService = new DocuSignService();
    const envelopeId = 'd3b0cfb1-6015-4e2b-813c-297a2b8406f2';

    console.log('📡 Llamando a isDocumentSigned()...\n');
    
    const signatureStatus = await docuSignService.isDocumentSigned(envelopeId);

    console.log('✅ RESULTADO:');
    console.log('─────────────────────────────────────');
    console.log('Signed:', signatureStatus.signed);
    console.log('Status:', signatureStatus.status);
    console.log('Status DateTime:', signatureStatus.statusDateTime);
    console.log('Completed DateTime:', signatureStatus.completedDateTime);
    console.log('');

    if (signatureStatus.signed) {
      console.log('✅ El método isDocumentSigned() funciona correctamente con DocuSign');
      console.log('');
      console.log('📋 SIGUIENTE PASO:');
      console.log('   Prueba desde el frontend haciendo clic en el botón de');
      console.log('   "Verificar Firma" en la gestión de budgets.');
      console.log('');
      console.log('   La ruta del API es:');
      console.log('   GET /budget/2299/check-signature-status');
    } else {
      console.log('⚠️  El documento aún no está completamente firmado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.body) {
      console.error('Detalles:', JSON.stringify(error.response.body, null, 2));
    }
  }
}

testCheckSignature();
