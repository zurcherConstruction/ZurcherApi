/**
 * Script helper para convertir clave privada de DocuSign al formato correcto para .env
 * 
 * Uso:
 * 1. Copia tu clave privada completa (con BEGIN y END)
 * 2. Pégala cuando el script te lo pida
 * 3. Presiona Ctrl+D (Linux/Mac) o Ctrl+Z Enter (Windows) cuando termines
 * 4. Copia el resultado y pégalo en tu .env como DOCUSIGN_PRIVATE_KEY_CONTENT
 */

const readline = require('readline');

console.log('\n📝 Convertidor de Clave Privada DocuSign para .env\n');
console.log('═'.repeat(60));
console.log('\nPega tu clave privada completa aquí (incluyendo BEGIN y END):');
console.log('Cuando termines, presiona:');
console.log('  - Windows: Ctrl+Z y luego Enter');
console.log('  - Linux/Mac: Ctrl+D\n');
console.log('─'.repeat(60) + '\n');

let keyContent = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  keyContent += line + '\n';
});

rl.on('close', () => {
  // Remover el último \n extra
  keyContent = keyContent.trim();
  
  // Convertir saltos de línea a literales \n
  const envFormat = keyContent.replace(/\n/g, '\\n');
  
  console.log('\n\n' + '═'.repeat(60));
  console.log('\n✅ ¡Conversión completada!\n');
  console.log('Copia esta línea COMPLETA en tu archivo .env:\n');
  console.log('─'.repeat(60) + '\n');
  console.log(`DOCUSIGN_PRIVATE_KEY_CONTENT="${envFormat}"`);
  console.log('\n' + '─'.repeat(60));
  console.log('\n💡 Asegúrate de que esté en UNA SOLA LÍNEA en el archivo .env\n');
});
