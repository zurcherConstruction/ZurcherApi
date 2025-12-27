require('dotenv').config();

/**
 * Test para verificar la configuración de producción de DocuSign
 */

async function testProductionConfig() {
  console.log('\n🔧 === VERIFICACIÓN DE CONFIGURACIÓN PRODUCCIÓN ===\n');
  
  // Verificar todas las variables de entorno
  console.log('📋 Variables de entorno DocuSign:');
  console.log('   DOCUSIGN_INTEGRATION_KEY:', process.env.DOCUSIGN_INTEGRATION_KEY || '❌ FALTA');
  console.log('   DOCUSIGN_CLIENT_SECRET:', process.env.DOCUSIGN_CLIENT_SECRET ? '✅ Configurado' : '❌ FALTA');
  console.log('   DOCUSIGN_USER_ID:', process.env.DOCUSIGN_USER_ID || '❌ FALTA');
  console.log('   DOCUSIGN_ACCOUNT_ID:', process.env.DOCUSIGN_ACCOUNT_ID || '❌ FALTA');
  console.log('   DOCUSIGN_BASE_PATH:', process.env.DOCUSIGN_BASE_PATH || '❌ FALTA');
  console.log('   DOCUSIGN_OAUTH_BASE_PATH:', process.env.DOCUSIGN_OAUTH_BASE_PATH || '❌ FALTA');
  console.log('   DOCUSIGN_ENVIRONMENT:', process.env.DOCUSIGN_ENVIRONMENT || 'demo');
  console.log('   API_URL:', process.env.API_URL || '❌ FALTA');
  
  console.log('\n🔗 URLs generadas:');
  const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
  const authServer = environment === 'production' 
    ? 'account.docusign.com' 
    : 'account-d.docusign.com';
  
  const redirectUri = `${process.env.API_URL}/docusign/callback`;
  const authUrl = `https://${authServer}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${process.env.DOCUSIGN_INTEGRATION_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('   🔐 Auth Server:', authServer);
  console.log('   ↩️ Redirect URI:', redirectUri);
  console.log('   🌐 Auth URL:', authUrl);
  
  console.log('\n✅ Configuración verificada');
  console.log('💡 Para autorizar, ve a: http://localhost:3001/docusign/auth');
  console.log('');
  
  // Verificar que no hay tokens previos
  const fs = require('fs');
  const path = require('path');
  const tokenFile = path.join(__dirname, '../docusign_tokens.json');
  
  if (fs.existsSync(tokenFile)) {
    console.log('⚠️ ADVERTENCIA: Existen tokens previos (posiblemente de demo)');
    console.log('   Archivo:', tokenFile);
    try {
      const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      console.log('   Obtenido el:', tokens.obtained_at);
      console.log('   💡 Elimina este archivo para empezar limpio con producción');
    } catch (e) {
      console.log('   ❌ Error leyendo tokens:', e.message);
    }
  } else {
    console.log('✅ No hay tokens previos - perfecto para nueva autorización');
  }
}

testProductionConfig().catch(console.error);