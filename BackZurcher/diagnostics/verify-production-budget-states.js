const { conn, Budget, Permit } = require('./src/data');

/**
 * Script para verificar estados de budgets en producción
 * Valida que todos los estados coincidan con los filtros de GestionBudgets
 */

async function verifyProductionBudgetStates() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos de PRODUCCIÓN\n');
    console.log('🔍 Verificando estados de TODOS los budgets...\n');
    console.log('═'.repeat(80));
    
    // Estados válidos según la unificación
    const validStates = [
      'draft',              // Borrador (nuevo)
      'created',            // Creado (original)
      'send',               // Enviado (original)
      'sent_for_signature', // Enviado para firma
      'signed',             // Firmado
      'client_approved',    // Aprobado por cliente (nuevo)
      'pending_review',     // Revisión pendiente (nuevo)
      'approved',           // Aprobado (original)
      'notResponded',       // Sin respuesta
      'rejected'            // Rechazado
    ];
    
    // Estados permitidos para operaciones críticas (ej: cargar comprobante de pago)
    const allowedStatesForPayment = [
      'created',
      'send', 
      'sent_for_signature', 
      'signed',
      'client_approved',
      'pending_review'
    ];

    // Obtener TODOS los budgets
    const allBudgets = await Budget.findAll({
      attributes: [
        'idBudget', 
        'status', 
        'applicantName', 
        'propertyAddress', 
        'paymentInvoice',
        'signatureMethod',
        'signNowDocumentId',
        'date',
        'createdAt'
      ],
      include: [{
        model: Permit,
        attributes: ['permitNumber', 'idPermit']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 TOTAL DE BUDGETS EN BASE DE DATOS: ${allBudgets.length}\n`);
    console.log('═'.repeat(80));

    // Análisis 1: Estados inválidos o inesperados
    console.log('\n🔍 ANÁLISIS 1: Verificación de Estados Válidos\n');
    const invalidStateBudgets = allBudgets.filter(b => !validStates.includes(b.status));
    
    if (invalidStateBudgets.length > 0) {
      console.log(`❌ ENCONTRADOS ${invalidStateBudgets.length} BUDGETS CON ESTADOS INVÁLIDOS:\n`);
      invalidStateBudgets.forEach(b => {
        console.log(`   ⚠️  ID: ${b.idBudget} | Estado: "${b.status}" | Cliente: ${b.applicantName}`);
      });
    } else {
      console.log('✅ Todos los budgets tienen estados válidos');
    }

    // Análisis 2: Distribución por estado
    console.log('\n═'.repeat(80));
    console.log('\n📊 ANÁLISIS 2: Distribución por Estado\n');
    const statusCount = {};
    allBudgets.forEach(b => {
      statusCount[b.status] = (statusCount[b.status] || 0) + 1;
    });
    
    validStates.forEach(state => {
      const count = statusCount[state] || 0;
      const percentage = ((count / allBudgets.length) * 100).toFixed(2);
      const isPaymentEligible = allowedStatesForPayment.includes(state);
      const icon = isPaymentEligible ? '💰' : '📝';
      
      console.log(`${icon} ${state.padEnd(22)} : ${String(count).padStart(4)} budgets (${percentage}%)`);
    });

    // Mostrar estados no reconocidos
    const unknownStates = Object.keys(statusCount).filter(s => !validStates.includes(s));
    if (unknownStates.length > 0) {
      console.log('\n⚠️  ESTADOS NO RECONOCIDOS:');
      unknownStates.forEach(state => {
        const count = statusCount[state];
        const percentage = ((count / allBudgets.length) * 100).toFixed(2);
        console.log(`   ❌ ${state.padEnd(22)} : ${String(count).padStart(4)} budgets (${percentage}%)`);
      });
    }

    // Análisis 3: Budgets elegibles para carga de comprobante
    console.log('\n═'.repeat(80));
    console.log('\n💰 ANÁLISIS 3: Budgets Elegibles para Comprobante de Pago\n');
    
    const eligibleForPayment = allBudgets.filter(b => 
      allowedStatesForPayment.includes(b.status)
    );
    
    const withPaymentProof = eligibleForPayment.filter(b => b.paymentInvoice);
    const withoutPaymentProof = eligibleForPayment.filter(b => !b.paymentInvoice);
    
    console.log(`✅ Total elegibles: ${eligibleForPayment.length}`);
    console.log(`   ├─ Con comprobante: ${withPaymentProof.length}`);
    console.log(`   └─ Sin comprobante: ${withoutPaymentProof.length}\n`);

    if (withoutPaymentProof.length > 0 && withoutPaymentProof.length <= 10) {
      console.log('📋 Budgets SIN comprobante (primeros 10):');
      withoutPaymentProof.slice(0, 10).forEach(b => {
        console.log(`   - ID ${String(b.idBudget).padStart(4)}: ${b.applicantName.substring(0, 30).padEnd(30)} | ${b.status}`);
      });
    }

    // Análisis 4: Métodos de firma
    console.log('\n═'.repeat(80));
    console.log('\n✍️  ANÁLISIS 4: Distribución por Método de Firma\n');
    
    const signatureMethodCount = {};
    allBudgets.forEach(b => {
      const method = b.signatureMethod || 'none';
      signatureMethodCount[method] = (signatureMethodCount[method] || 0) + 1;
    });
    
    Object.entries(signatureMethodCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([method, count]) => {
        const percentage = ((count / allBudgets.length) * 100).toFixed(2);
        const icon = method === 'signnow' ? '🌐' : method === 'manual_upload' ? '📄' : method === 'none' ? '❌' : '❓';
        console.log(`${icon} ${method.padEnd(20)} : ${String(count).padStart(4)} budgets (${percentage}%)`);
      });

    // Análisis 5: Budgets con SignNow pero sin estado 'signed'
    console.log('\n═'.repeat(80));
    console.log('\n🔍 ANÁLISIS 5: Validación de Firmas SignNow\n');
    
    const signNowBudgets = allBudgets.filter(b => 
      b.signatureMethod === 'signnow' && b.signNowDocumentId
    );
    
    const signNowNotSigned = signNowBudgets.filter(b => b.status !== 'signed');
    
    console.log(`📊 Total con SignNow: ${signNowBudgets.length}`);
    console.log(`   ├─ Estado 'signed': ${signNowBudgets.filter(b => b.status === 'signed').length}`);
    console.log(`   └─ Otros estados: ${signNowNotSigned.length}`);
    
    if (signNowNotSigned.length > 0 && signNowNotSigned.length <= 15) {
      console.log('\n⚠️  Budgets SignNow que NO están en estado "signed":');
      signNowNotSigned.forEach(b => {
        console.log(`   - ID ${String(b.idBudget).padStart(4)}: ${b.status.padEnd(20)} | ${b.applicantName.substring(0, 30)}`);
      });
    }

    // Análisis 6: Budgets con firma manual
    console.log('\n═'.repeat(80));
    console.log('\n📄 ANÁLISIS 6: Validación de Firmas Manuales\n');
    
    const manualBudgets = allBudgets.filter(b => 
      b.signatureMethod === 'manual_upload'
    );
    
    console.log(`📊 Total con firma manual: ${manualBudgets.length}`);
    
    const manualByState = {};
    manualBudgets.forEach(b => {
      manualByState[b.status] = (manualByState[b.status] || 0) + 1;
    });
    
    console.log('\nDistribución por estado:');
    Object.entries(manualByState)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`   - ${state.padEnd(20)}: ${count}`);
      });

    // Análisis 7: Estadísticas por año
    console.log('\n═'.repeat(80));
    console.log('\n📅 ANÁLISIS 7: Distribución por Año\n');
    
    const yearStats = {};
    allBudgets.forEach(b => {
      const year = b.date ? b.date.substring(0, 4) : 'Sin fecha';
      if (!yearStats[year]) {
        yearStats[year] = {
          total: 0,
          byStatus: {}
        };
      }
      yearStats[year].total++;
      yearStats[year].byStatus[b.status] = (yearStats[year].byStatus[b.status] || 0) + 1;
    });
    
    Object.entries(yearStats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([year, stats]) => {
        console.log(`📆 ${year}: ${stats.total} budgets`);
        
        const topStates = Object.entries(stats.byStatus)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        
        topStates.forEach(([state, count]) => {
          console.log(`   ├─ ${state.padEnd(20)}: ${count}`);
        });
      });

    // Análisis 8: Compatibilidad con filtros de GestionBudgets
    console.log('\n═'.repeat(80));
    console.log('\n🎯 ANÁLISIS 8: Compatibilidad con Filtros de GestionBudgets\n');
    
    console.log('Estados válidos esperados por el frontend:');
    validStates.forEach(state => {
      const count = statusCount[state] || 0;
      const icon = count > 0 ? '✅' : '⚪';
      console.log(`   ${icon} ${state.padEnd(22)}: ${count > 0 ? `${count} budgets` : 'Sin registros'}`);
    });

    // Resumen final
    console.log('\n═'.repeat(80));
    console.log('\n📈 RESUMEN FINAL\n');
    console.log(`✅ Total de budgets: ${allBudgets.length}`);
    console.log(`✅ Estados válidos: ${Object.keys(statusCount).filter(s => validStates.includes(s)).length}`);
    console.log(`${invalidStateBudgets.length > 0 ? '❌' : '✅'} Estados inválidos: ${invalidStateBudgets.length}`);
    console.log(`✅ Elegibles para pago: ${eligibleForPayment.length}`);
    console.log(`✅ Con SignNow: ${signNowBudgets.length}`);
    console.log(`✅ Con firma manual: ${manualBudgets.length}`);
    
    if (invalidStateBudgets.length === 0) {
      console.log('\n🎉 ¡EXCELENTE! Todos los budgets tienen estados válidos y compatibles con GestionBudgets');
    } else {
      console.log('\n⚠️  ATENCIÓN: Se encontraron budgets con estados no válidos que requieren corrección');
    }
    
    console.log('\n═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await conn.close();
    console.log('\n✅ Conexión cerrada');
    process.exit(0);
  }
}

verifyProductionBudgetStates();
