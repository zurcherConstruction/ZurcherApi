const DocuSignService = require('./src/services/ServiceDocuSign');
require('dotenv').config();

async function testDocuSign() {
  console.log('\n🧪 === PRUEBA DE INTEGRACIÓN DOCUSIGN ===\n');
  
  // Verificar variables de entorno
  console.log('📋 Verificando configuración...');
  console.log('   DOCUSIGN_INTEGRATION_KEY:', process.env.DOCUSIGN_INTEGRATION_KEY ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_USER_ID:', process.env.DOCUSIGN_USER_ID ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_ACCOUNT_ID:', process.env.DOCUSIGN_ACCOUNT_ID ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_PRIVATE_KEY_PATH:', process.env.DOCUSIGN_PRIVATE_KEY_PATH ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_ENVIRONMENT:', process.env.DOCUSIGN_ENVIRONMENT || 'demo');
  console.log('   USE_DOCUSIGN:', process.env.USE_DOCUSIGN);
  
  const fs = require('fs');
  const keyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './docusign_private.key';
  console.log('   Llave privada existe:', fs.existsSync(keyPath) ? '✅ Sí' : '❌ No');
  
  try {
    console.log('\n🔐 Intentando obtener access token...');
    const docuSignService = new DocuSignService();
    const token = await docuSignService.getAccessToken();
    
    if (token) {
      console.log('✅ ¡TOKEN OBTENIDO EXITOSAMENTE!');
      console.log('   Token (primeros 20 chars):', token.substring(0, 20) + '...');
      console.log('\n🎉 ¡DOCUSIGN ESTÁ CORRECTAMENTE CONFIGURADO!');
      console.log('\nAhora puedes:');
      console.log('   1. Enviar presupuestos para firma usando DocuSign');
      console.log('   2. Los documentos viejos seguirán usando SignNow');
      console.log('   3. Cambiar USE_DOCUSIGN=false para volver a SignNow temporalmente');
      return true;
    }
  } catch (error) {
    console.error('\n❌ ERROR AL CONECTAR CON DOCUSIGN:');
    console.error(error.message);
    
    if (error.message.includes('consent_required')) {
      console.error('\n⚠️  SE REQUIERE CONSENTIMIENTO');
      console.error('\n🔗 Abre este URL en tu navegador para dar consentimiento:');
      console.error(`https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${process.env.DOCUSIGN_INTEGRATION_KEY}&redirect_uri=https://www.docusign.com`);
      console.error('\nDespués de dar consentimiento, vuelve a ejecutar este script.');
    } else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      console.error('\n⚠️  NO SE ENCUENTRA LA LLAVE PRIVADA');
      console.error('   Verifica que el archivo docusign_private.key exista en:', require('path').resolve(keyPath));
    } else {
      console.error('\n📝 Detalles del error:');
      console.error(error);
    }
    return false;
  }
}

// Ejecutar test
testDocuSign()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
