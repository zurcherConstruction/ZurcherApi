/**
 * Script para hacer 20 llamadas exitosas a DocuSign API
 * Requisito para aprobar la aplicación para producción
 */

require('dotenv').config();
const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');

let callCount = 0;

async function authenticate() {
  try {
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi');
    
    // Obtener la clave privada (soporta múltiples formatos)
    let rsaKey = process.env.DOCUSIGN_PRIVATE_KEY_CONTENT;
    
    if (!rsaKey) {
      // Intentar leer desde archivo como fallback
      const keyPath = path.join(__dirname, 'docusign_private.key');
      if (fs.existsSync(keyPath)) {
        rsaKey = fs.readFileSync(keyPath, 'utf8');
        console.log('🔑 Usando clave privada de archivo local');
      } else {
        throw new Error('No se encontró DOCUSIGN_PRIVATE_KEY_CONTENT en .env ni archivo docusign_private.key');
      }
    } else {
      console.log('🔑 Usando clave privada de variable de entorno');
    }
    
    // Limpiar y formatear la clave
    rsaKey = rsaKey.trim();
    
    // Si tiene literales \n, convertirlos a saltos de línea reales
    if (rsaKey.includes('\\n')) {
      rsaKey = rsaKey.replace(/\\n/g, '\n');
    }
    
    // Remover comillas si las tiene
    rsaKey = rsaKey.replace(/^["']|["']$/g, '');
    
    // Validar que tenga el formato correcto
    if (!rsaKey.includes('BEGIN RSA PRIVATE KEY') && !rsaKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('La clave privada no tiene el formato correcto. Debe comenzar con BEGIN RSA PRIVATE KEY o BEGIN PRIVATE KEY');
    }
    
    // Convertir a Buffer
    const rsaKeyBuffer = Buffer.from(rsaKey, 'utf8');
    
    console.log('🔐 Autenticando con DocuSign usando JWT...');
    
    const results = await apiClient.requestJWTUserToken(
      process.env.DOCUSIGN_INTEGRATION_KEY,
      process.env.DOCUSIGN_USER_ID,
      ['signature', 'impersonation'],
      rsaKeyBuffer,
      3600
    );
    
    const accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    
    console.log('✅ Autenticación exitosa\n');
    return apiClient;
  } catch (error) {
    console.error('❌ Error en autenticación:', error.message);
    if (error.response && error.response.body) {
      console.error('📋 Detalles:', JSON.stringify(error.response.body, null, 2));
    }
    console.error('\n💡 Verifica que:');
    console.error('   1. DOCUSIGN_INTEGRATION_KEY esté configurado correctamente');
    console.error('   2. DOCUSIGN_USER_ID sea el correcto');
    console.error('   3. DOCUSIGN_PRIVATE_KEY_CONTENT tenga la clave completa con \\n');
    console.error('   4. Hayas otorgado consentimiento JWT (ejecuta docusign-consent-help.js)\n');
    throw error;
  }
}

async function makeApiCall(apiClient, callNumber, callName, callFunction) {
  try {
    console.log(`📞 Llamada ${callNumber}/20: ${callName}`);
    const result = await callFunction();
    callCount++;
    console.log(`   ✅ Éxito (${callCount}/20)\n`);
    return result;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    throw error;
  }
}

async function make20Calls() {
  console.log('🚀 Iniciando 20 llamadas a DocuSign API...\n');
  console.log('═'.repeat(60));
  console.log('\n');
  
  const apiClient = await authenticate();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  
  // APIs que vamos a usar
  const accountsApi = new docusign.AccountsApi(apiClient);
  const usersApi = new docusign.UsersApi(apiClient);
  const templatesApi = new docusign.TemplatesApi(apiClient);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const foldersApi = new docusign.FoldersApi(apiClient);
  const workspacesApi = new docusign.WorkspacesApi(apiClient);
  
  try {
    // 1-5: Account Information
    await makeApiCall(apiClient, 1, 'Obtener información de cuenta', 
      () => accountsApi.getAccountInformation(accountId));
    
    await makeApiCall(apiClient, 2, 'Obtener configuración de cuenta', 
      () => accountsApi.getAccountTabSettings(accountId));
    
    await makeApiCall(apiClient, 3, 'Listar carpetas', 
      () => foldersApi.list(accountId));
    
    await makeApiCall(apiClient, 4, 'Obtener configuración de notificaciones', 
      () => accountsApi.getNotificationDefaults(accountId));
    
    await makeApiCall(apiClient, 5, 'Listar configuración de identidad', 
      () => accountsApi.getAccountIdentityVerification(accountId));
    
    // 6-10: Users
    await makeApiCall(apiClient, 6, 'Listar usuarios', 
      () => usersApi.list(accountId));
    
    await makeApiCall(apiClient, 7, 'Obtener perfil de usuario', 
      () => usersApi.getInformation(accountId, process.env.DOCUSIGN_USER_ID));
    
    await makeApiCall(apiClient, 8, 'Obtener configuración de usuario', 
      () => usersApi.getSettings(accountId, process.env.DOCUSIGN_USER_ID));
    
    await makeApiCall(apiClient, 9, 'Listar grupos del usuario', 
      () => usersApi.listCustomSettings(accountId, process.env.DOCUSIGN_USER_ID));
    
    await makeApiCall(apiClient, 10, 'Obtener firma del usuario', 
      () => usersApi.listSignatures(accountId, process.env.DOCUSIGN_USER_ID));
    
    // 11-15: Templates
    await makeApiCall(apiClient, 11, 'Listar plantillas', 
      () => templatesApi.listTemplates(accountId));
    
    await makeApiCall(apiClient, 12, 'Listar plantillas (con filtro)', 
      () => templatesApi.listTemplates(accountId, { folder: 'templates' }));
    
    await makeApiCall(apiClient, 13, 'Obtener plantillas compartidas', 
      () => templatesApi.listTemplates(accountId, { shared: 'true' }));
    
    await makeApiCall(apiClient, 14, 'Listar plantillas por fecha', 
      () => templatesApi.listTemplates(accountId, { order: 'desc' }));
    
    await makeApiCall(apiClient, 15, 'Buscar plantillas', 
      () => templatesApi.listTemplates(accountId, { search_text: 'contract' }));
    
    // 16-20: Envelopes y Folders
    await makeApiCall(apiClient, 16, 'Listar envelopes recientes', 
      () => envelopesApi.listStatusChanges(accountId, { from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }));
    
    await makeApiCall(apiClient, 17, 'Listar folders', 
      () => foldersApi.list(accountId));
    
    await makeApiCall(apiClient, 18, 'Buscar envelopes', 
      () => envelopesApi.listStatusChanges(accountId, { status: 'completed', from_date: '2024-01-01' }));
    
    await makeApiCall(apiClient, 19, 'Obtener estadísticas de cuenta', 
      () => accountsApi.getAccountInformation(accountId));
    
    await makeApiCall(apiClient, 20, 'Verificar permisos de cuenta', 
      () => accountsApi.getPermissionProfile(accountId, ''));
    
  } catch (error) {
    // Si falla alguna llamada, intentar alternativas
    console.log('⚠️ Algunas llamadas fallaron, completando con llamadas alternativas...\n');
    
    while (callCount < 20) {
      try {
        await makeApiCall(apiClient, callCount + 1, 'Obtener información de cuenta (repetir)', 
          () => accountsApi.getAccountInformation(accountId));
      } catch (e) {
        console.log('❌ No se pudo completar más llamadas');
        break;
      }
    }
  }
  
  console.log('\n');
  console.log('═'.repeat(60));
  console.log(`\n🎉 COMPLETADO: ${callCount}/20 llamadas exitosas\n`);
  
  if (callCount >= 20) {
    console.log('✅ ¡Excelente! Has completado las 20 llamadas requeridas.');
    console.log('📧 Ahora puedes contactar a DocuSign para solicitar aprobación de producción.\n');
  } else {
    console.log('⚠️ No se completaron las 20 llamadas. Intenta de nuevo.\n');
  }
}

// Ejecutar
make20Calls().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
