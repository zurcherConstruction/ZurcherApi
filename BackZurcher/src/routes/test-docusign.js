const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const ServiceDocuSign = require('../services/ServiceDocuSign');

/**
 * 🧪 Endpoint para probar DocuSign en producción
 * GET /test-docusign/status - Verificar estado OAuth
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🧪 === TESTING DOCUSIGN PRODUCCIÓN (SERVIDOR) ===');
    
    // 1️⃣ Verificar configuración
    console.log('1️⃣ Verificando configuración...');
    console.log('   DOCUSIGN_INTEGRATION_KEY:', process.env.DOCUSIGN_INTEGRATION_KEY?.substring(0, 8) + '...');
    console.log('   DOCUSIGN_USER_ID:', process.env.DOCUSIGN_USER_ID?.substring(0, 8) + '...');
    console.log('   DOCUSIGN_ACCOUNT_ID:', process.env.DOCUSIGN_ACCOUNT_ID?.substring(0, 8) + '...');
    console.log('   DOCUSIGN_ENVIRONMENT:', process.env.DOCUSIGN_ENVIRONMENT);
    console.log('   DOCUSIGN_BASE_PATH:', process.env.DOCUSIGN_BASE_PATH);

    // 2️⃣ Verificar OAuth
    console.log('2️⃣ Verificando estado OAuth...');
    const authStatus = await DocuSignController.getAuthStatus();
    console.log('   Autenticado:', authStatus.authenticated);
    console.log('   Expirado:', authStatus.isExpired || false);
    
    if (authStatus.authenticated) {
      console.log('   ✅ Tokens OAuth disponibles');
      console.log('   Obtenido en:', authStatus.obtainedAt);
      console.log('   Expira en:', authStatus.expiresAt);
    } else {
      console.log('   ❌ No hay tokens OAuth. Debes autorizar primero:');
      console.log(`   👉 ${process.env.API_URL}/docusign/auth`);
    }

    // 3️⃣ Test de conexión
    let testResult = null;
    if (authStatus.authenticated && !authStatus.isExpired) {
      console.log('3️⃣ Probando conexión a DocuSign API...');
      try {
        testResult = await DocuSignController.testConnection();
        console.log('   ✅ Conexión exitosa:', testResult.message);
      } catch (error) {
        console.log('   ❌ Error de conexión:', error.message);
        testResult = { success: false, message: error.message };
      }
    }

    res.json({
      success: true,
      config: {
        integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY?.substring(0, 8) + '...',
        userId: process.env.DOCUSIGN_USER_ID?.substring(0, 8) + '...',
        accountId: process.env.DOCUSIGN_ACCOUNT_ID?.substring(0, 8) + '...',
        environment: process.env.DOCUSIGN_ENVIRONMENT,
        basePath: process.env.DOCUSIGN_BASE_PATH
      },
      oauth: authStatus,
      connection: testResult,
      authUrl: `${process.env.API_URL}/docusign/auth`
    });

  } catch (error) {
    console.error('❌ Error en test DocuSign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🧪 Endpoint para probar envío de documento
 * POST /test-docusign/send
 */
router.post('/send', async (req, res) => {
  try {
    console.log('🧪 === PROBANDO ENVÍO DE DOCUMENTO ===');
    
    const { email = 'yanicorc@gmail.com', name = 'PRUEBA DOCUSIGN' } = req.body;
    
    // Crear un PDF de prueba simple
    const testPdfBase64 = Buffer.from(`
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document for DocuSign) Tj
100 650 Td
(Client Signature: _________________________) Tj
100 600 Td
(Date: _________________________) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000089 00000 n 
0000000230 00000 n 
0000000324 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
404
%%EOF
    `).toString('base64');

    // Inicializar servicio DocuSign
    const docuSignService = new ServiceDocuSign();
    
    // Crear envelope con PDF de prueba
    const result = await docuSignService.sendBudgetForSignature(
      `data:application/pdf;base64,${testPdfBase64}`, // PDF como data URL
      email,
      name,
      'TEST_DOCUMENT.pdf',
      'Documento de Prueba DocuSign',
      'Por favor firma este documento de prueba',
      true // Generar URL de firma
    );

    console.log('✅ Documento enviado exitosamente:', result.envelopeId);
    console.log('🔗 URL de firma:', result.signingUrl);

    res.json({
      success: true,
      result: result,
      message: 'Documento enviado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error enviando documento:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

module.exports = router;