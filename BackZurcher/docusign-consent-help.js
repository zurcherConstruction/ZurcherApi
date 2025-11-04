/**
 * Intento final de otorgar consentimiento JWT para DocuSign
 * 
 * Según la documentación, el error "issuer_not_found" puede deberse a:
 * 1. La aplicación no está registrada correctamente
 * 2. Falta el consentimiento de usuario (Individual Consent)
 * 3. El RSA keypair no está asociado correctamente
 * 
 * SOLUCIÓN: Otorgar Individual Consent
 */

require('dotenv').config();

const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
const userId = process.env.DOCUSIGN_USER_ID;

console.log('\n🔐 === OTORGAR CONSENTIMIENTO DOCUSIGN JWT ===\n');
console.log('Configuración actual:');
console.log('Integration Key:', integrationKey);
console.log('User ID:', userId);
console.log('\n📋 INSTRUCCIONES PARA OTORGAR CONSENTIMIENTO:\n');
console.log('DocuSign requiere que otorgues consentimiento una vez para usar JWT.\n');
console.log('OPCIÓN 1 - URL de Consentimiento (RECOMENDADA):');
console.log('───────────────────────────────────────────────');
console.log('Copia esta URL y ábrela en tu navegador:\n');

const consentUrl = `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://www.docusign.com`;

console.log(consentUrl);
console.log('\nQué esperar:');
console.log('✓ Si funciona: Verás una pantalla pidiendo permiso, haz clic en "Allow"');
console.log('✗ Si falla: Verás "client id not registered" (esto indica que la app necesita Go Live)\n');

console.log('OPCIÓN 2 - Desde el Developer Account:');
console.log('───────────────────────────────────────────────');
console.log('1. Ve a: https://developers.docusign.com/platform/account/');
console.log('2. Haz clic en tu app "zurcherconstruction"');
console.log('3. En la página de detalles, busca "Grant Individual Consent" o similar');
console.log('4. Haz clic y autoriza\n');

console.log('OPCIÓN 3 - Cambiar a Authorization Code (Si JWT no funciona):');
console.log('───────────────────────────────────────────────');
console.log('Si ninguna opción funciona, podemos cambiar temporalmente a');
console.log('Authorization Code Grant, que no requiere consentimiento previo.\n');

console.log('⚠️  NOTA IMPORTANTE:');
console.log('───────────────────────────────────────────────');
console.log('El error "issuer_not_found" generalmente significa que DocuSign');
console.log('requiere que la aplicación esté en "Go Live" antes de aceptar JWT.');
console.log('Como tu cuenta de producción no soporta API, hay dos caminos:');
console.log('  A) Contactar a DocuSign para habilitar API en producción');
console.log('  B) Usar Authorization Code Grant temporalmente\n');

console.log('¿Qué quieres hacer?');
console.log('1. Intentar la URL de consentimiento nuevamente');
console.log('2. Cambiar a Authorization Code Grant (funciona sin Go Live)');
console.log('3. Contactar a DocuSign para habilitar API\n');
