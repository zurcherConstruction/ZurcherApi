/**
 * Verificar formato de clave privada DocuSign
 */

require('dotenv').config();

const key = process.env.DOCUSIGN_PRIVATE_KEY_CONTENT;

if (!key) {
  console.log('❌ DOCUSIGN_PRIVATE_KEY_CONTENT no está configurada');
  process.exit(1);
}

console.log('✅ DOCUSIGN_PRIVATE_KEY_CONTENT está configurada\n');
console.log('Longitud:', key.length, 'caracteres\n');
console.log('Primeros 50 caracteres:', key.substring(0, 50));
console.log('\n');
console.log('¿Contiene "BEGIN RSA PRIVATE KEY"?', key.includes('BEGIN RSA PRIVATE KEY'));
console.log('¿Contiene "BEGIN PRIVATE KEY"?', key.includes('BEGIN PRIVATE KEY'));
console.log('¿Contiene \\n?', key.includes('\\n'));
console.log('¿Contiene saltos de línea reales?', key.includes('\n'));
console.log('\n');

// Intentar convertir
try {
  const fixed = key.replace(/\\n/g, '\n');
  console.log('✅ Conversión de \\n exitosa');
  console.log('Primeros 100 caracteres después de conversión:');
  console.log(fixed.substring(0, 100));
} catch (error) {
  console.log('❌ Error en conversión:', error.message);
}
