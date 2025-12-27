/**
 * Script de prueba para DocuSign en PRODUCCIÓN
 * Verifica OAuth y envío de documentos
 */

require('dotenv').config();
const DocuSignController = require('./src/controllers/DocuSignController');
const DocuSignService = require('./src/services/ServiceDocuSign');
const fs = require('fs');

async function testDocuSignProduction() {
  console.log('\n🧪 === TESTING DOCUSIGN PRODUCCIÓN ===\n');

  try {
    // 1. Verificar variables de entorno
    console.log('1️⃣ Verificando configuración...');
    console.log('   DOCUSIGN_INTEGRATION_KEY:', process.env.DOCUSIGN_INTEGRATION_KEY?.substring(0, 8) + '...');
    console.log('   DOCUSIGN_USER_ID:', process.env.DOCUSIGN_USER_ID?.substring(0, 8) + '...');
    console.log('   DOCUSIGN_ACCOUNT_ID:', process.env.DOCUSIGN_ACCOUNT_ID?.substring(0, 8) + '...');
    console.log('   DOCUSIGN_ENVIRONMENT:', process.env.DOCUSIGN_ENVIRONMENT);
    console.log('   DOCUSIGN_BASE_PATH:', process.env.DOCUSIGN_BASE_PATH);
    console.log('');

    // 2. Verificar estado de autenticación OAuth
    console.log('2️⃣ Verificando estado OAuth...');
    const authStatus = await DocuSignController.getAuthStatus();
    console.log('   Autenticado:', authStatus.authenticated);
    if (authStatus.authenticated) {
      console.log('   Tokens obtenidos:', authStatus.obtainedAt);
      console.log('   Tokens expiran:', authStatus.expiresAt);
      console.log('   ¿Necesita refresh?:', authStatus.needsRefresh);
    } else {
      console.log('   ❌ No hay tokens OAuth. Debes autorizar primero:');
      console.log('   👉 https://zurcherapi.up.railway.app/docusign/auth');
      return;
    }
    console.log('');

    // 3. Probar conexión con DocuSign API
    console.log('3️⃣ Probando conexión con DocuSign API...');
    const connectionTest = await DocuSignController.testConnection();
    console.log('   Conexión exitosa:', connectionTest.success);
    if (connectionTest.success) {
      console.log('   Cuenta:', connectionTest.accountName || 'N/A');
      console.log('   Account ID:', connectionTest.accountId);
    } else {
      console.log('   ❌ Error:', connectionTest.message);
      return;
    }
    console.log('');

    // 4. Crear PDF de prueba
    console.log('4️⃣ Creando PDF de prueba...');
    const testPdfPath = './test-document.pdf';
    const testPdfContent = `
%PDF-1.3
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
50 750 Td
(DOCUMENTO DE PRUEBA DOCUSIGN) Tj
50 700 Td
(Client Signature: _____________________) Tj
50 650 Td
(Date: _____________________) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000279 00000 n 
0000000459 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
527
%%EOF`;

    fs.writeFileSync(testPdfPath, testPdfContent);
    console.log('   ✅ PDF de prueba creado:', testPdfPath);
    console.log('');

    // 5. Enviar documento de prueba
    console.log('5️⃣ Enviando documento de prueba a DocuSign...');
    const docuSignService = new DocuSignService();
    
    const result = await docuSignService.sendBudgetForSignature(
      testPdfPath,
      'yanicorc@gmail.com', // Email de prueba
      'PRUEBA DOCUSIGN PRODUCCIÓN',
      'documento-prueba-produccion.pdf',
      'Documento de prueba - Producción DocuSign',
      'Por favor firma este documento de prueba para verificar la integración.',
      true // Generar URL de firma
    );

    console.log('   ✅ Documento enviado exitosamente!');
    console.log('   Envelope ID:', result.envelopeId);
    console.log('   Status:', result.status);
    console.log('   URL de firma:', result.signingUrl?.substring(0, 50) + '...');
    console.log('');

    // 6. Limpiar archivo temporal
    console.log('6️⃣ Limpiando archivos temporales...');
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
      console.log('   ✅ PDF temporal eliminado');
    }
    console.log('');

    console.log('🎉 === PRUEBA COMPLETADA EXITOSAMENTE ===');
    console.log('✅ DocuSign está funcionando correctamente en producción');
    console.log('✅ Puedes usar el sistema normalmente');
    console.log('');

  } catch (error) {
    console.error('\n❌ === ERROR EN LA PRUEBA ===');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      if (error.response.data) {
        console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.response.body) {
        console.error('Body:', JSON.stringify(error.response.body, null, 2));
      }
    }
    
    console.error('\n🔧 Posibles soluciones:');
    console.error('1. Verificar que estés autorizado: https://zurcherapi.up.railway.app/docusign/auth');
    console.error('2. Verificar variables de entorno en Railway');
    console.error('3. Verificar que la app esté activa en DocuSign Admin');
    console.error('');
  }
}

// Ejecutar prueba
testDocuSignProduction();