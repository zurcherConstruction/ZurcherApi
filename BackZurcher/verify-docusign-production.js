/**
 * 🔍 Script de Verificación de DocuSign Production
 * 
 * Úsalo para verificar que DocuSign esté configurado correctamente
 * antes de activarlo en producción.
 * 
 * USO:
 * node verify-docusign-production.js
 */

require('dotenv').config();
const DocuSignService = require('./src/services/ServiceDocuSign');

async function verifyDocuSignSetup() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   🔍 VERIFICACIÓN DE CONFIGURACIÓN DOCUSIGN              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let allChecks = true;

  // ========================================
  // 1. Verificar Variables de Entorno
  // ========================================
  console.log('📋 1. Verificando variables de entorno...\n');

  const requiredVars = [
    'DOCUSIGN_INTEGRATION_KEY',
    'DOCUSIGN_USER_ID',
    'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_ENVIRONMENT'
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`   ❌ ${varName}: NO CONFIGURADA`);
      allChecks = false;
    }
  });

  // Verificar clave privada
  console.log('\n📋 2. Verificando disponibilidad de clave privada...\n');
  
  const fs = require('fs');
  const path = require('path');
  
  let privateKeySource = 'NINGUNA';
  
  if (process.env.DOCUSIGN_PRIVATE_KEY_CONTENT) {
    privateKeySource = 'Variable de entorno (DOCUSIGN_PRIVATE_KEY_CONTENT)';
    console.log(`   ✅ Clave encontrada en: ${privateKeySource}`);
    console.log(`   📏 Tamaño: ${process.env.DOCUSIGN_PRIVATE_KEY_CONTENT.length} caracteres`);
    
    // Verificar formato
    if (process.env.DOCUSIGN_PRIVATE_KEY_CONTENT.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      console.log('   ✅ Formato correcto (contiene BEGIN RSA PRIVATE KEY)');
    } else {
      console.log('   ⚠️  ADVERTENCIA: El formato parece incorrecto');
      allChecks = false;
    }
  } 
  else if (process.env.DOCUSIGN_PRIVATE_KEY_BASE64) {
    privateKeySource = 'Variable de entorno Base64 (DOCUSIGN_PRIVATE_KEY_BASE64)';
    console.log(`   ✅ Clave encontrada en: ${privateKeySource}`);
    console.log(`   📏 Tamaño: ${process.env.DOCUSIGN_PRIVATE_KEY_BASE64.length} caracteres`);
  }
  else {
    const privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './docusign_private.key';
    const fullPath = path.resolve(privateKeyPath);
    
    if (fs.existsSync(fullPath)) {
      privateKeySource = `Archivo local (${privateKeyPath})`;
      console.log(`   ✅ Clave encontrada en: ${privateKeySource}`);
      const stats = fs.statSync(fullPath);
      console.log(`   📏 Tamaño: ${stats.size} bytes`);
      
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('-----BEGIN RSA PRIVATE KEY-----')) {
        console.log('   ✅ Formato correcto (contiene BEGIN RSA PRIVATE KEY)');
      } else {
        console.log('   ⚠️  ADVERTENCIA: El formato parece incorrecto');
        allChecks = false;
      }
    } else {
      console.log(`   ❌ Clave NO encontrada en ninguna ubicación`);
      console.log(`   📁 Ruta buscada: ${fullPath}`);
      console.log(`\n   💡 SOLUCIÓN:`);
      console.log(`      - Para desarrollo: Coloca docusign_private.key en la carpeta BackZurcher/`);
      console.log(`      - Para producción: Agrega DOCUSIGN_PRIVATE_KEY_CONTENT en Railway\n`);
      allChecks = false;
    }
  }

  // ========================================
  // 3. Verificar Ambiente
  // ========================================
  console.log('\n📋 3. Verificando ambiente...\n');
  
  const environment = process.env.DOCUSIGN_ENVIRONMENT || 'demo';
  console.log(`   🌍 Ambiente configurado: ${environment.toUpperCase()}`);
  
  if (environment === 'production') {
    console.log('   ⚠️  MODO PRODUCCIÓN - Usar solo con claves de producción');
  } else {
    console.log('   ℹ️  MODO DEMO - Para pruebas y desarrollo');
  }

  // ========================================
  // 4. Verificar Feature Flag
  // ========================================
  console.log('\n📋 4. Verificando feature flag...\n');
  
  const useDocuSign = process.env.USE_DOCUSIGN === 'true';
  console.log(`   🚦 USE_DOCUSIGN: ${process.env.USE_DOCUSIGN || 'undefined'}`);
  console.log(`   📊 Estado: ${useDocuSign ? '✅ ACTIVO (usando DocuSign)' : '⏸️  INACTIVO (usando SignNow)'}`);

  // ========================================
  // 5. Intentar Obtener Token
  // ========================================
  console.log('\n📋 5. Probando conexión con DocuSign API...\n');

  if (!allChecks) {
    console.log('   ⏭️  OMITIENDO prueba de conexión (faltan configuraciones)\n');
  } else {
    try {
      const docusign = new DocuSignService();
      console.log('   🔄 Intentando obtener access token...');
      
      const token = await docusign.getAccessToken();
      
      console.log('   ✅ ¡ÉXITO! Access token obtenido correctamente');
      console.log(`   🔑 Token (primeros 20 caracteres): ${token.substring(0, 20)}...`);
      console.log('   ⏱️  Validez: 1 hora');
      
    } catch (error) {
      console.log('   ❌ ERROR al obtener token:\n');
      console.log(`   📝 Mensaje: ${error.message}\n`);
      
      if (error.response?.body?.error === 'consent_required') {
        console.log('   ⚠️  ACCIÓN REQUERIDA: Debes otorgar consentimiento (solo una vez)\n');
        console.log('   👉 PASOS:');
        console.log('   1. Abre este URL en tu navegador:');
        
        const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
        const consentUrl = environment === 'demo'
          ? `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://www.docusign.com`
          : `https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://www.docusign.com`;
        
        console.log(`\n   ${consentUrl}\n`);
        console.log('   2. Inicia sesión con tu cuenta de DocuSign');
        console.log('   3. Click en "Allow/Authorize"');
        console.log('   4. Vuelve a ejecutar este script\n');
      } else if (error.message.includes('issuer_not_found') || error.message.includes('account_not_found')) {
        console.log('   ⚠️  ERROR DE CONFIGURACIÓN:\n');
        console.log('   - Verifica que DOCUSIGN_INTEGRATION_KEY sea correcta');
        console.log('   - Verifica que DOCUSIGN_USER_ID sea correcta');
        console.log('   - Verifica que DOCUSIGN_ACCOUNT_ID sea correcta');
        console.log('   - Si estás en producción, verifica que la app haya completado el Go-Live\n');
      } else {
        console.log('   💡 Revisa los detalles del error arriba\n');
      }
      
      allChecks = false;
    }
  }

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  📊 RESUMEN FINAL                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (allChecks) {
    console.log('   ✅ ¡CONFIGURACIÓN CORRECTA!');
    console.log('   ✅ DocuSign está listo para usar\n');
    
    if (useDocuSign) {
      console.log('   🚀 DocuSign está ACTIVO');
      console.log('   📤 Los presupuestos nuevos se enviarán a DocuSign\n');
    } else {
      console.log('   ⏸️  DocuSign está INACTIVO (USE_DOCUSIGN=false)');
      console.log('   📤 Los presupuestos nuevos se enviarán a SignNow');
      console.log('   💡 Para activar DocuSign, cambia USE_DOCUSIGN=true\n');
    }
    
    console.log('   📝 PRÓXIMOS PASOS:');
    console.log('   1. Probar enviando un presupuesto de prueba');
    console.log('   2. Verificar que el cliente reciba el email');
    console.log('   3. Completar la firma de prueba');
    console.log('   4. Verificar que el webhook funcione (si está configurado)\n');
    
  } else {
    console.log('   ❌ CONFIGURACIÓN INCOMPLETA O CON ERRORES');
    console.log('   📋 Revisa los errores marcados arriba');
    console.log('   📖 Consulta la guía: DOCUSIGN_PRODUCTION_DEPLOYMENT.md\n');
  }

  console.log('════════════════════════════════════════════════════════════\n');
}

// Ejecutar verificación
verifyDocuSignSetup()
  .then(() => {
    console.log('✅ Verificación completada\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.error(error);
    process.exit(1);
  });
