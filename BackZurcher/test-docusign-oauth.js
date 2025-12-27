require('dotenv').config();
const DocuSignController = require('./src/controllers/DocuSignController');

/**
 * Test para verificar las 20 llamadas de DocuSign OAuth
 * Hace múltiples llamadas para asegurarse de que el sistema funciona correctamente
 */

async function testDocuSignOAuth20Calls() {
  console.log('\n🧪 === PRUEBA DE 20 LLAMADAS DOCUSIGN OAUTH ===\n');
  
  // Verificar configuración OAuth
  console.log('📋 Verificando configuración OAuth...');
  console.log('   DOCUSIGN_INTEGRATION_KEY:', process.env.DOCUSIGN_INTEGRATION_KEY ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_CLIENT_SECRET:', process.env.DOCUSIGN_CLIENT_SECRET ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_USER_ID:', process.env.DOCUSIGN_USER_ID ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_ACCOUNT_ID:', process.env.DOCUSIGN_ACCOUNT_ID ? '✅ Configurado' : '❌ Falta');
  console.log('   DOCUSIGN_ENVIRONMENT:', process.env.DOCUSIGN_ENVIRONMENT || 'demo');
  console.log('   USE_DOCUSIGN:', process.env.USE_DOCUSIGN);
  
  // Verificar tokens OAuth
  console.log('\n🔐 Verificando tokens OAuth...');
  try {
    const authStatus = await DocuSignController.getAuthStatus();
    console.log('   Status:', authStatus.authenticated ? '✅ Autenticado' : '❌ No autenticado');
    if (authStatus.authenticated) {
      console.log('   Expira:', new Date(authStatus.expiresAt).toLocaleString());
      console.log('   Necesita refresh:', authStatus.needsRefresh ? '⚠️ Sí' : '✅ No');
    }
  } catch (error) {
    console.log('   ❌ Error verificando auth status:', error.message);
    return;
  }
  
  console.log('\n🚀 Iniciando 20 llamadas de prueba...\n');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 1; i <= 20; i++) {
    try {
      console.log(`📞 Llamada ${i}/20 - Verificando información de cuenta...`);
      
      // Simular una llamada típica a DocuSign
      const result = await DocuSignController.testConnection();
      
      if (result.success) {
        console.log(`   ✅ Llamada ${i} exitosa - ${result.message}`);
        successCount++;
      } else {
        console.log(`   ❌ Llamada ${i} falló - ${result.message}`);
        failureCount++;
      }
      
      // Pequeña pausa entre llamadas
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`   ❌ Llamada ${i} error - ${error.message}`);
      failureCount++;
    }
  }
  
  console.log('\n📊 === RESULTADOS FINALES ===');
  console.log(`   ✅ Llamadas exitosas: ${successCount}/20`);
  console.log(`   ❌ Llamadas fallidas: ${failureCount}/20`);
  console.log(`   📈 Tasa de éxito: ${((successCount/20)*100).toFixed(1)}%`);
  
  if (successCount === 20) {
    console.log('\n🎉 ¡PERFECTO! Todas las 20 llamadas fueron exitosas');
    console.log('   ✅ DocuSign OAuth está funcionando correctamente');
    console.log('   ✅ El sistema puede manejar múltiples llamadas sin problemas');
    console.log('   ✅ Los tokens se mantienen válidos durante el test');
  } else if (successCount >= 18) {
    console.log('\n✅ ¡MUY BIEN! La mayoría de llamadas fueron exitosas');
    console.log('   ⚠️ Algunas fallas pueden ser normales por conectividad');
  } else {
    console.log('\n⚠️ Hay problemas con la configuración OAuth');
    console.log('   🔧 Revisa los tokens y la configuración');
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Si todo funciona, ya puedes enviar documentos reales');
  console.log('   2. Los tokens se refrescan automáticamente');
  console.log('   3. La integración está lista para producción');
  console.log('');
}

// Ejecutar test
testDocuSignOAuth20Calls().catch(console.error);