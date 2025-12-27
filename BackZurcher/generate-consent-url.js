require('dotenv').config();

/**
 * Genera el URL de consentimiento para DocuSign
 * Este URL debe ser visitado por un administrador para autorizar la aplicación
 */

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const OAUTH_BASE_URL = `https://${process.env.DOCUSIGN_OAUTH_BASE_PATH || 'account-d.docusign.com'}`;

// 🔧 URLs de consentimiento con diferentes formatos
const CONSENT_URLS = {
  // Método 1: JWT Grant consent (más directo)
  jwtGrant: `${OAUTH_BASE_URL}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${INTEGRATION_KEY}&redirect_uri=https://www.docusign.com/api`,
  
  // Método 2: Admin consent específico
  adminConsent: `${OAUTH_BASE_URL}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${INTEGRATION_KEY}&redirect_uri=urn:ietf:wg:oauth:2.0:oob`,
  
  // Método 3: Manual consent (sin redirect)
  manualConsent: `${OAUTH_BASE_URL}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${INTEGRATION_KEY}&redirect_uri=https://httpbin.org/get`,
  
  // Método 4: Developers platform
  developersConsent: `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${INTEGRATION_KEY}&redirect_uri=https://developers.docusign.com/platform/auth/consent`
};

console.log('\n🔐 MÚLTIPLES URLS DE CONSENTIMIENTO DOCUSIGN');
console.log('===========================================\n');

console.log('📋 Configuración:');
console.log(`   Integration Key: ${INTEGRATION_KEY}`);
console.log(`   User ID: ${USER_ID}`);
console.log(`   Account ID: ${process.env.DOCUSIGN_ACCOUNT_ID}`);
console.log(`   Environment: ${process.env.DOCUSIGN_ENVIRONMENT}`);
console.log(`   OAuth Base: ${OAUTH_BASE_URL}\n`);

console.log('🌐 PRUEBA ESTOS URLS EN ORDEN (uno por uno):');
console.log('============================================\n');

console.log('1️⃣ MÉTODO JWT GRANT (Recomendado):');
console.log(CONSENT_URLS.jwtGrant);
console.log('');

console.log('2️⃣ MÉTODO ADMIN CONSENT:');
console.log(CONSENT_URLS.adminConsent);
console.log('');

console.log('3️⃣ MÉTODO MANUAL CONSENT:');
console.log(CONSENT_URLS.manualConsent);
console.log('');

console.log('4️⃣ MÉTODO DEVELOPERS PLATFORM:');
console.log(CONSENT_URLS.developersConsent);
console.log('');

console.log('📝 INSTRUCCIONES DETALLADAS:');
console.log('============================');
console.log('1. Copia el PRIMER URL y pégalo en el navegador');
console.log('2. Inicia sesión con: admin@zurcherseptic.com');
console.log('3. Si aparece una pantalla de consentimiento ✅ AUTORIZA la app');
console.log('4. Si NO aparece consentimiento ❌ prueba el siguiente URL');
console.log('5. Repite hasta encontrar uno que funcione');

console.log('\n🚨 QUÉ BUSCAR:');
console.log('==============');
console.log('✅ CORRECTO: Pantalla que dice "Allow access" o "Grant permission"');
console.log('❌ INCORRECTO: Te lleva al home de DocuSign o página en blanco');

console.log('\n🔧 SI NINGUNO FUNCIONA:');
console.log('=======================');
console.log('1. Ve a: https://developers.docusign.com');
console.log('2. Login con admin@zurcherseptic.com');
console.log('3. Apps and Keys → Zurcher Construction');
console.log('4. Verifica que está "Active" no "Pending"');
console.log('5. En "Authentication" debe decir "JWT" habilitado');

console.log('\n💡 La clave es encontrar el URL que muestre la pantalla de autorización real.\n');