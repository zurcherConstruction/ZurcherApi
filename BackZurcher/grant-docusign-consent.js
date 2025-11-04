/**
 * Script para generar la URL de consentimiento de DocuSign
 * Para JWT, el consentimiento se debe otorgar una vez antes de poder usar la aplicación
 */

require('dotenv').config();

const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
const redirectUri = 'https://www.docusign.com'; // Debe coincidir con el configurado en la app
const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';

// Determinar el dominio según el ambiente
const authServer = environment === 'production' 
  ? 'account.docusign.com' 
  : 'account-d.docusign.com';

// URL de consentimiento para JWT (impersonation)
const consentUrl = `https://${authServer}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=${redirectUri}`;

console.log('\n🔐 === URL DE CONSENTIMIENTO DOCUSIGN ===\n');
console.log('Para que JWT funcione, debes otorgar consentimiento administrativo una vez.\n');
console.log('📋 PASOS:\n');
console.log('1. Copia la URL de abajo');
console.log('2. Pégala en tu navegador');
console.log('3. Inicia sesión con tu cuenta de DocuSign');
console.log('4. Haz clic en "Allow" o "Permitir"');
console.log('5. Serás redirigido a docusign.com (esto es normal)');
console.log('6. Después de otorgar el consentimiento, ejecuta el test: node test-docusign.js\n');
console.log('🔗 URL DE CONSENTIMIENTO:\n');
console.log(consentUrl);
console.log('\n');
