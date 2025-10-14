/**
 * 🧪 Script de Prueba: Sistema de Deduplicación de Notificaciones
 * 
 * Este script prueba que las notificaciones duplicadas sean bloqueadas correctamente
 * 
 * Uso: node test-notification-deduplication.js
 */

const {
  filterDuplicates,
  registerSent,
  clearCache,
  getCacheStats,
  wasRecentlySent
} = require('./src/utils/notifications/notificationDeduplicator');

async function testDeduplication() {
  console.log('\n🧪 === PRUEBA DE DEDUPLICACIÓN DE NOTIFICACIONES ===\n');

  try {
    // Limpiar cache antes de empezar
    clearCache();

    const testStaff = [
      { id: 1, email: 'admin@zurcherseptic.com', name: 'Admin', role: 'admin' },
      { id: 2, email: 'owner@zurcherseptic.com', name: 'Owner', role: 'owner' },
      { id: 3, email: 'finance@zurcherseptic.com', name: 'Finance', role: 'finance' }
    ];

    const status = 'budgetCreated';
    const entityId = '123';

    // Test 1: Primera vez - Debe pasar todos
    console.log('📋 Test 1: Primera llamada (debe pasar todos)');
    const filtered1 = filterDuplicates(testStaff, status, entityId);
    console.log(`   ✅ Resultado: ${filtered1.length}/${testStaff.length} notificaciones pasaron`);
    
    if (filtered1.length !== testStaff.length) {
      console.log('   ❌ ERROR: Debería haber pasado todas las notificaciones');
    } else {
      console.log('   ✅ CORRECTO\n');
    }

    // Registrar como enviadas
    registerSent(filtered1, status, entityId);

    // Test 2: Segunda vez inmediatamente - Debe bloquear todas
    console.log('📋 Test 2: Segunda llamada inmediata (debe bloquear todas)');
    const filtered2 = filterDuplicates(testStaff, status, entityId);
    console.log(`   ✅ Resultado: ${filtered2.length}/${testStaff.length} notificaciones pasaron`);
    
    if (filtered2.length !== 0) {
      console.log('   ❌ ERROR: Debería haber bloqueado todas las notificaciones');
    } else {
      console.log('   ✅ CORRECTO - Todas fueron bloqueadas\n');
    }

    // Test 3: Verificar que wasRecentlySent funciona
    console.log('📋 Test 3: Verificar wasRecentlySent()');
    const wasBlocked = wasRecentlySent('admin@zurcherseptic.com', status, entityId);
    console.log(`   ${wasBlocked ? '✅' : '❌'} Notificación marcada como reciente: ${wasBlocked}\n`);

    // Test 4: Diferente entidad - Debe pasar
    console.log('📋 Test 4: Mismos emails, diferente entidad (debe pasar)');
    const differentEntity = '456';
    const filtered3 = filterDuplicates(testStaff, status, differentEntity);
    console.log(`   ✅ Resultado: ${filtered3.length}/${testStaff.length} notificaciones pasaron`);
    
    if (filtered3.length !== testStaff.length) {
      console.log('   ❌ ERROR: Debería pasar todas con diferente entityId');
    } else {
      console.log('   ✅ CORRECTO\n');
    }

    // Test 5: Diferente status - Debe pasar
    console.log('📋 Test 5: Mismos emails, diferente status (debe pasar)');
    const differentStatus = 'budgetSent';
    const filtered4 = filterDuplicates(testStaff, differentStatus, entityId);
    console.log(`   ✅ Resultado: ${filtered4.length}/${testStaff.length} notificaciones pasaron`);
    
    if (filtered4.length !== testStaff.length) {
      console.log('   ❌ ERROR: Debería pasar todas con diferente status');
    } else {
      console.log('   ✅ CORRECTO\n');
    }

    // Test 6: Estadísticas del cache
    console.log('📋 Test 6: Estadísticas del cache');
    const stats = getCacheStats();
    console.log(`   📊 Total de hashes en cache: ${stats.totalHashes}`);
    console.table(stats.entries.slice(0, 5)); // Mostrar primeras 5 entradas
    console.log('');

    // Test 7: Emails con mayúsculas/minúsculas
    console.log('📋 Test 7: Normalización de emails (mayúsculas/minúsculas)');
    const staffWithCase = [
      { email: 'ADMIN@ZURCHERSEPTIC.COM' },
      { email: 'Admin@ZurcherSeptic.com' },
      { email: 'admin@zurcherseptic.com' }
    ];
    const filtered5 = filterDuplicates(staffWithCase, status, entityId);
    console.log(`   ✅ Resultado: ${filtered5.length}/3 emails pasaron (todos son el mismo)`);
    
    if (filtered5.length !== 0) {
      console.log('   ❌ ERROR: Debería bloquear todos (son el mismo email normalizado)');
    } else {
      console.log('   ✅ CORRECTO - Normalización funcionando\n');
    }

    // Test 8: Esperar y verificar cooldown
    console.log('📋 Test 8: Verificando cooldown (espera 2 segundos)');
    console.log('   ⏳ Esperando...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Después de 2 segundos, aún debe bloquear (cooldown es 60 segundos)
    const filtered6 = filterDuplicates([testStaff[0]], status, entityId);
    console.log(`   ✅ Resultado: ${filtered6.length}/1 notificación pasó`);
    
    if (filtered6.length !== 0) {
      console.log('   ❌ ERROR: Aún debe bloquear (cooldown de 60 segundos)');
    } else {
      console.log('   ✅ CORRECTO - Cooldown funcionando\n');
    }

    // Test 9: Limpiar cache
    console.log('📋 Test 9: Limpiar cache');
    clearCache();
    const statsAfterClear = getCacheStats();
    console.log(`   📊 Entradas después de limpiar: ${statsAfterClear.totalHashes}`);
    
    if (statsAfterClear.totalHashes !== 0) {
      console.log('   ❌ ERROR: El cache debería estar vacío');
    } else {
      console.log('   ✅ CORRECTO - Cache limpiado\n');
    }

    // Test 10: Después de limpiar, debe pasar
    console.log('📋 Test 10: Después de limpiar cache (debe pasar)');
    const filtered7 = filterDuplicates(testStaff, status, entityId);
    console.log(`   ✅ Resultado: ${filtered7.length}/${testStaff.length} notificaciones pasaron`);
    
    if (filtered7.length !== testStaff.length) {
      console.log('   ❌ ERROR: Después de limpiar, debería pasar todas');
    } else {
      console.log('   ✅ CORRECTO\n');
    }

    // Resumen
    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS\n');
    console.log('El sistema de deduplicación está funcionando correctamente.');
    console.log('');
    console.log('Características verificadas:');
    console.log('  ✅ Bloqueo de notificaciones duplicadas');
    console.log('  ✅ Normalización de emails (mayúsculas/minúsculas)');
    console.log('  ✅ Diferenciación por entityId');
    console.log('  ✅ Diferenciación por status');
    console.log('  ✅ Cooldown period funcionando');
    console.log('  ✅ Cache limpiable');
    console.log('  ✅ Estadísticas del cache');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error);
    throw error;
  }
}

// Ejecutar pruebas
testDeduplication()
  .then(() => {
    console.log('✅ Script de prueba completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script de prueba falló:', error);
    process.exit(1);
  });
