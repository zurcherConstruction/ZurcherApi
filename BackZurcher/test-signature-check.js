// Script para probar manualmente la verificación de firmas
const { checkPendingSignatures } = require('./src/services/checkPendingSignatures');

console.log('🔍 Ejecutando verificación manual de firmas...\n');

checkPendingSignatures()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
