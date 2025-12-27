#!/usr/bin/env node

/**
 * Script de instalación para el sistema robusto de DocuSign
 * Configura base de datos, migra tokens existentes y valida el sistema
 * 
 * Uso: node setup-docusign-robust.js
 */

const { runMigration } = require('./add-docusign-tokens.js');

// Necesitamos cargar la configuración de la base de datos primero
require('dotenv').config();

// Solo cargar los servicios después de configurar dotenv
let DocuSignTokenService, DocuSignController;

try {
  DocuSignTokenService = require('./src/services/DocuSignTokenService');
  DocuSignController = require('./src/controllers/DocuSignController');
} catch (error) {
  console.error('❌ Error cargando servicios:', error.message);
  console.log('⚠️  Nota: Algunos servicios pueden no estar disponibles en desarrollo');
}
const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log('cyan', `\n🔧 PASO ${step}: ${message}`);
}

function logSuccess(message) {
  log('green', `✅ ${message}`);
}

function logWarning(message) {
  log('yellow', `⚠️  ${message}`);
}

function logError(message) {
  log('red', `❌ ${message}`);
}

async function setupRobustDocuSign() {
  try {
    log('bright', '\n🚀 === CONFIGURACIÓN SISTEMA ROBUSTO DOCUSIGN ===\n');
    
    // PASO 1: Validar configuración
    logStep(1, 'Validando configuración de entorno');
    
    const requiredEnvVars = [
      'DOCUSIGN_INTEGRATION_KEY',
      'DOCUSIGN_CLIENT_SECRET',
      'DOCUSIGN_USER_ID',
      'DOCUSIGN_ACCOUNT_ID',
      'DOCUSIGN_ENVIRONMENT',
      'API_URL'
    ];
    
    let missingVars = [];
    
    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      logError('Faltan variables de entorno requeridas:');
      missingVars.forEach(varName => logError(`  - ${varName}`));
      process.exit(1);
    }
    
    logSuccess('Variables de entorno validadas correctamente');
    
    // PASO 2: Ejecutar migración de base de datos
    logStep(2, 'Creando tabla de tokens en base de datos');
    
    await runMigration();
    logSuccess('Tabla docusign_tokens creada/verificada');
    
    // PASO 3: Migrar tokens existentes del archivo
    logStep(3, 'Migrando tokens existentes del archivo a base de datos');
    
    const oldTokenFile = path.join(__dirname, 'docusign_tokens.json');
    if (fs.existsSync(oldTokenFile)) {
      try {
        const oldTokens = JSON.parse(fs.readFileSync(oldTokenFile, 'utf8'));
        
        if (oldTokens && oldTokens.access_token) {
          logWarning('Tokens encontrados en archivo, migrando a base de datos...');
          
          // Convertir formato antiguo a nuevo
          const tokenData = {
            access_token: oldTokens.access_token,
            refresh_token: oldTokens.refresh_token,
            expires_in: oldTokens.expires_in,
            token_type: oldTokens.token_type || 'Bearer'
          };
          
          await DocuSignTokenService.saveToken(tokenData, {
            notes: 'Token migrado desde archivo durante instalación del sistema robusto'
          });
          
          logSuccess('Tokens migrados exitosamente a base de datos');
          
          // Hacer backup del archivo antiguo
          const backupFile = oldTokenFile + '.backup.' + Date.now();
          fs.renameSync(oldTokenFile, backupFile);
          logSuccess(`Archivo antiguo respaldado como: ${path.basename(backupFile)}`);
          
        } else {
          logWarning('Archivo de tokens encontrado pero está vacío o corrupto');
        }
      } catch (error) {
        logWarning(`Error leyendo tokens antiguos: ${error.message}`);
      }
    } else {
      log('blue', 'No se encontraron tokens antiguos para migrar');
    }
    
    // PASO 4: Verificar estado de autenticación
    logStep(4, 'Verificando estado de autenticación actual');
    
    const authStatus = await DocuSignTokenService.getAuthStatus();
    
    if (authStatus.authenticated) {
      logSuccess('Tokens válidos encontrados en base de datos');
      log('green', `  - Obtenido: ${authStatus.obtainedAt}`);
      log('green', `  - Expira: ${authStatus.expiresAt}`);
      log('green', `  - Refreshes: ${authStatus.refreshCount || 0}`);
      log('green', `  - Entorno: ${authStatus.environment}`);
      
      if (authStatus.needsRefresh) {
        logWarning('Token próximo a expirar, será refrescado automáticamente');
      }
    } else {
      logWarning('No hay tokens válidos disponibles');
      logWarning('Necesitas autorizar la aplicación en: ' + process.env.API_URL + '/docusign/auth');
    }
    
    // PASO 5: Test de conexión
    logStep(5, 'Probando conexión con DocuSign API');
    
    try {
      const connectionTest = await DocuSignTokenService.testConnection();
      
      if (connectionTest.success) {
        logSuccess('Conexión con DocuSign API exitosa');
        log('green', `  - Cuenta: ${connectionTest.accountName || connectionTest.message}`);
        log('green', `  - Account ID: ${connectionTest.accountId}`);
      } else {
        logWarning('Test de conexión falló: ' + connectionTest.message);
      }
    } catch (error) {
      logWarning(`Test de conexión falló: ${error.message}`);
      if (error.message.includes('No hay tokens disponibles')) {
        log('blue', '👉 Autoriza la aplicación y vuelve a ejecutar este script');
      }
    }
    
    // PASO 6: Resumen de configuración
    logStep(6, 'Resumen de configuración');
    
    log('bright', '\n📋 CONFIGURACIÓN ACTUAL:');
    log('blue', `  • Integration Key: ${process.env.DOCUSIGN_INTEGRATION_KEY}`);
    log('blue', `  • Account ID: ${process.env.DOCUSIGN_ACCOUNT_ID}`);
    log('blue', `  • Entorno: ${process.env.DOCUSIGN_ENVIRONMENT}`);
    log('blue', `  • Base Path: ${process.env.DOCUSIGN_BASE_PATH}`);
    log('blue', `  • OAuth Base Path: ${process.env.DOCUSIGN_OAUTH_BASE_PATH}`);
    
    log('bright', '\n🔗 URLS ÚTILES:');
    log('blue', `  • Autorización: ${process.env.API_URL}/docusign/auth`);
    log('blue', `  • Estado: ${process.env.API_URL}/docusign/auth-status`);
    log('blue', `  • Test: ${process.env.API_URL}/test-docusign/status`);
    
    log('bright', '\n🎯 FUNCIONALIDADES DEL SISTEMA ROBUSTO:');
    log('green', '  ✅ Persistencia de tokens en base de datos PostgreSQL');
    log('green', '  ✅ Auto-refresh automático de tokens expirados');
    log('green', '  ✅ Recuperación automática de errores de autenticación');
    log('green', '  ✅ Logging detallado y monitoreo de uso');
    log('green', '  ✅ Limpieza automática de tokens obsoletos');
    log('green', '  ✅ Estadísticas y métricas de tokens');
    log('green', '  ✅ Manejo robusto de errores específicos de DocuSign');
    
    log('bright', '\n🚀 ¡SISTEMA ROBUSTO CONFIGURADO EXITOSAMENTE!');
    
    if (!authStatus.authenticated) {
      log('yellow', '\n⚠️  SIGUIENTE PASO REQUERIDO:');
      log('yellow', `   Ve a: ${process.env.API_URL}/docusign/auth`);
      log('yellow', '   Completa la autorización OAuth');
      log('yellow', '   Los tokens se guardarán automáticamente en la base de datos');
    }
    
  } catch (error) {
    logError('\n❌ Error durante la configuración:');
    logError(error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupRobustDocuSign();
}

module.exports = { setupRobustDocuSign };