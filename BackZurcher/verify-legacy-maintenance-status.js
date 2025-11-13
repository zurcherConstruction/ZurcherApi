/**
 * Script de verificación PRE-CARGA
 * 
 * Verifica el estado actual de la base de datos antes de ejecutar
 * load-complete-legacy-maintenance.js
 * 
 * Muestra:
 * - Cuántos budgets legacy ya existen
 * - Cuántos works de mantenimiento ya existen
 * - Qué direcciones ya están cargadas
 * - Qué direcciones faltan por cargar
 * 
 * USO: node verify-legacy-maintenance-status.js
 */

require('dotenv').config();
const { Work, Budget, MaintenanceVisit, Permit } = require('./src/data');

// Las 42 direcciones del script original
const expectedAddresses = [
  '935 Panda Dr, Lehigh Acres',
  '614 Locust ave. Lehigh Acres',
  '1028 Milwaukee blvd, Lehigh Acres',
  '323 Mangonia Ave, Lehigh Acres',
  '219 Bell Blvd., Lehigh Acres',
  '2614 39th st sw, Lehigh Acres',
  '145 Bell Blvd, Lehigh Acres',
  '902 Grant Blvd, Lehigh Acres',
  '912 Anthony st, Lehigh Acres',
  '166 Freemont Ave S, Lehigh acres',
  '164 Thornton ave. Lehigh acres',
  '336 Hermosa Ave. Lehigh acres',
  '815 Sentinela Blvd, Lehigh Acres',
  '195 Beckley Dr. Lehigh Acres',
  '642 Stanley ave, Lehigh Acres',
  '2509 38th St. Lehigh Acres',
  '945 Butler St e, Lehigh Acres',
  '944 Grant Blvd, Lehigh acres',
  '1108 Cove st e, Lehigh Acres',
  '1023 Bank Ave s, Lehigh acres',
  '712 Clemwood ave s, Lehigh Acres',
  '325 Hermosa ave, Lehigh Acres',
  '546 Montclair Ave S, Lehigh Acres',
  '1131 Columbus blvd, Lehigh Acres',
  '2615 23rd, Lehigh Acres',
  '322 Browardave, Lehigh Acres',
  '1037 Macy st e, Lehigh Acres',
  '748 Homestead rd S, Lehigh Acres',
  '1135 Columbus Blvd, Lehigh acres',
  '1215 Bayou St. Lehigh Acres',
  '1127 Holly ave S, Lehigh Acres',
  '842/844 Alabama Rd S. Lehigh Acres',
  '552 Cottonwood av S, Lehigh Acres',
  '825 Porter, Lehigh Acres',
  '204 Aurora av 2, Lehigh Acres',
  '1825 Lindenwood Dr, Lehigh Acres',
  '942 Sunrise Blvd, Lehigh Acres',
  '4105 E 15th St. Lehigh Acres',
  '337 Jourferie Rd, Lehigh Acres',
  '1502 Oak ave, Lake Placid',
  '1505 chatsworth st, Lake Placid',
  '1507 Chatsworth st, Lake Placid',
];

async function verifyStatus() {
  try {
    console.log('\n🔍 VERIFICACIÓN: Estado de Legacy Maintenance\n');
    console.log('═'.repeat(70));
    console.log(`\n📊 Direcciones esperadas: ${expectedAddresses.length}\n`);

    // 1. Verificar Budgets legacy
    const legacyBudgets = await Budget.findAll({
      where: { status: 'legacy_maintenance' },
      attributes: ['idBudget', 'propertyAddress', 'applicantName', 'createdAt']
    });

    console.log(`📋 Budgets legacy existentes: ${legacyBudgets.length}\n`);

    // 2. Verificar Works de mantenimiento
    const maintenanceWorks = await Work.findAll({
      where: { status: 'maintenance' },
      attributes: ['idWork', 'propertyAddress', 'idBudget', 'createdAt']
    });

    console.log(`🏗️  Works de mantenimiento existentes: ${maintenanceWorks.length}\n`);

    // 3. Verificar MaintenanceVisits
    const visits = await MaintenanceVisit.findAll({
      attributes: ['id', 'workId', 'scheduledDate', 'status']
    });

    console.log(`📅 Visitas de mantenimiento existentes: ${visits.length}\n`);

    console.log('═'.repeat(70));

    // 4. Analizar qué direcciones YA ESTÁN cargadas
    const loadedAddresses = new Set();
    
    legacyBudgets.forEach(b => loadedAddresses.add(b.propertyAddress));
    maintenanceWorks.forEach(w => loadedAddresses.add(w.propertyAddress));

    const loaded = expectedAddresses.filter(addr => loadedAddresses.has(addr));
    const missing = expectedAddresses.filter(addr => !loadedAddresses.has(addr));

    console.log('\n✅ DIRECCIONES YA CARGADAS:\n');
    if (loaded.length > 0) {
      loaded.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
    } else {
      console.log('   (Ninguna)\n');
    }

    console.log('\n❌ DIRECCIONES FALTANTES:\n');
    if (missing.length > 0) {
      missing.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
    } else {
      console.log('   (Ninguna - todas cargadas)\n');
    }

    console.log('\n═'.repeat(70));
    console.log('\n📊 RESUMEN:\n');
    console.log(`   Total esperado:    ${expectedAddresses.length}`);
    console.log(`   ✅ Ya cargadas:    ${loaded.length}`);
    console.log(`   ❌ Faltantes:      ${missing.length}`);
    console.log(`   📈 Progreso:       ${Math.round((loaded.length / expectedAddresses.length) * 100)}%\n`);

    // 5. Detalles de budgets con datos placeholder
    const placeholderBudgets = legacyBudgets.filter(b => 
      b.applicantName && b.applicantName.includes('EDITAR')
    );

    if (placeholderBudgets.length > 0) {
      console.log('═'.repeat(70));
      console.log(`\n⚠️  BUDGETS CON DATOS PLACEHOLDER (${placeholderBudgets.length}):\n`);
      placeholderBudgets.slice(0, 5).forEach(b => {
        console.log(`   - ${b.propertyAddress}`);
        console.log(`     Cliente: ${b.applicantName}`);
      });
      if (placeholderBudgets.length > 5) {
        console.log(`   ... y ${placeholderBudgets.length - 5} más\n`);
      }
    }

    console.log('\n═'.repeat(70));
    
    if (missing.length === 0) {
      console.log('\n🎉 ¡COMPLETADO! Todas las direcciones ya están cargadas\n');
    } else {
      console.log('\n📝 SIGUIENTE PASO:\n');
      console.log('   Ejecutar: node load-complete-legacy-maintenance.js\n');
      console.log('   O probar primero con: node load-complete-legacy-maintenance.js --dry-run\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyStatus();
