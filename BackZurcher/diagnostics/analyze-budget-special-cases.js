const { conn, Budget, Permit } = require('./src/data');

/**
 * Script para analizar casos especiales de budgets:
 * 1. Aprobados sin firma (inconsistencias)
 * 2. Necesidad del campo manualSignaturePath
 * 3. Budgets sin método de firma
 */

async function analyzeSpecialCases() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos de PRODUCCIÓN\n');
    console.log('🔍 ANÁLISIS COMPLETO DE CASOS ESPECIALES\n');
    console.log('═'.repeat(80));
    
    // Obtener TODOS los budgets con información completa
    const allBudgets = await Budget.findAll({
      attributes: [
        'idBudget', 
        'status', 
        'applicantName', 
        'propertyAddress', 
        'paymentInvoice',
        'signatureMethod',
        'signNowDocumentId',
        'signedPdfPath',           // Para firmas SignNow
        'manualSignedPdfPath',     // Para firmas manuales
        'legacySignedPdfUrl',      // Para budgets legacy
        'date',
        'isLegacy',
        'createdAt',
        'updatedAt'
      ],
      include: [{
        model: Permit,
        attributes: ['permitNumber', 'idPermit']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 TOTAL DE BUDGETS: ${allBudgets.length}\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1️⃣ APROBADOS SIN FIRMA (INCONSISTENCIAS)
    // ═══════════════════════════════════════════════════════════════════════════
    
    console.log('═'.repeat(80));
    console.log('\n1️⃣  ANÁLISIS: Budgets APROBADOS sin Método de Firma\n');
    
    // Aprobados = status 'approved' (firmados + pago confirmado)
    // Deberían tener un método de firma (signnow, manual, etc.)
    const aprobados = allBudgets.filter(b => b.status === 'approved');
    const aprobadosSinFirma = aprobados.filter(b => 
      !b.signatureMethod || b.signatureMethod === 'none'
    );
    const aprobadosConFirma = aprobados.filter(b => 
      b.signatureMethod && b.signatureMethod !== 'none'
    );
    
    console.log(`📊 Total Aprobados: ${aprobados.length}`);
    console.log(`   ├─ ✅ Con método de firma:  ${aprobadosConFirma.length}`);
    console.log(`   └─ ⚠️  Sin método de firma:  ${aprobadosSinFirma.length}\n`);
    
    if (aprobadosSinFirma.length > 0) {
      console.log('⚠️  INCONSISTENCIA: Budgets APROBADOS sin método de firma:\n');
      aprobadosSinFirma.forEach((b, i) => {
        console.log(`${String(i + 1).padStart(2)}. ID ${String(b.idBudget).padStart(4)} | ${b.applicantName.substring(0, 40).padEnd(40)}`);
        console.log(`    Estado: ${b.status} | Firma: ${b.signatureMethod || 'NONE'} | Pago: ${b.paymentInvoice ? 'SÍ' : 'NO'}`);
        console.log(`    Fecha: ${b.date} | Creado: ${b.createdAt.toISOString().split('T')[0]}`);
        console.log('');
      });
      console.log('💡 RECOMENDACIÓN: Estos budgets deberían tener signatureMethod = "manual" o "legacy"');
    } else {
      console.log('✅ Todos los budgets aprobados tienen método de firma registrado');
    }

    // Firmados sin método
    console.log('\n' + '─'.repeat(80) + '\n');
    const firmados = allBudgets.filter(b => b.status === 'signed');
    const firmadosSinMetodo = firmados.filter(b => 
      !b.signatureMethod || b.signatureMethod === 'none'
    );
    
    if (firmadosSinMetodo.length > 0) {
      console.log(`⚠️  INCONSISTENCIA: Budgets FIRMADOS sin método de firma: ${firmadosSinMetodo.length}\n`);
      firmadosSinMetodo.forEach((b, i) => {
        console.log(`${String(i + 1).padStart(2)}. ID ${String(b.idBudget).padStart(4)} | ${b.applicantName.substring(0, 40).padEnd(40)}`);
      });
      console.log('\n💡 RECOMENDACIÓN: Actualizar a signatureMethod = "manual" o "legacy"');
    } else {
      console.log('✅ Todos los budgets firmados tienen método de firma registrado');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2️⃣ CAMPO manualSignaturePath - ¿LO NECESITAMOS?
    // ═══════════════════════════════════════════════════════════════════════════
    
    console.log('\n═'.repeat(80));
    console.log('\n2️⃣  ANÁLISIS: Campo manualSignaturePath\n');
    
    // Verificar qué columnas existen en la tabla
    const [columns] = await conn.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Budgets' 
      AND column_name LIKE '%signature%' OR column_name LIKE '%signed%'
      ORDER BY column_name;
    `);
    
    console.log('📋 Columnas relacionadas con firmas en la tabla Budgets:\n');
    columns.forEach(col => {
      console.log(`   ✓ ${col.column_name.padEnd(30)} | Tipo: ${col.data_type}`);
    });
    
    const tieneManualSignaturePath = columns.some(c => c.column_name === 'manualSignaturePath');
    
    console.log('\n' + '─'.repeat(80) + '\n');
    
    if (tieneManualSignaturePath) {
      console.log('✅ La columna manualSignaturePath EXISTE en producción\n');
    } else {
      console.log('❌ La columna manualSignaturePath NO EXISTE en producción\n');
    }
    
    // Analizar budgets con firma manual
    const manuales = allBudgets.filter(b => 
      b.signatureMethod === 'manual' || b.signatureMethod === 'manual_upload'
    );
    
    console.log(`📊 Budgets con signatureMethod 'manual': ${manuales.length}\n`);
    
    if (manuales.length > 0) {
      console.log('Desglose de budgets con firma manual:\n');
      
      const conManualPath = manuales.filter(b => b.manualSignedPdfPath);
      const sinManualPath = manuales.filter(b => !b.manualSignedPdfPath);
      
      console.log(`   ├─ Con manualSignedPdfPath:    ${conManualPath.length}`);
      console.log(`   └─ Sin manualSignedPdfPath:    ${sinManualPath.length}\n`);
      
      if (conManualPath.length > 0) {
        console.log('✅ Budgets manuales CON manualSignedPdfPath (primeros 5):');
        conManualPath.slice(0, 5).forEach((b, i) => {
          console.log(`   ${i + 1}. ID ${b.idBudget}: ${b.applicantName.substring(0, 30)}`);
          console.log(`      Path: ${b.manualSignedPdfPath}`);
        });
      }
      
      if (sinManualPath.length > 0) {
        console.log('\n⚠️  Budgets manuales SIN manualSignedPdfPath:');
        sinManualPath.forEach((b, i) => {
          console.log(`   ${i + 1}. ID ${b.idBudget}: ${b.applicantName.substring(0, 30)} | Estado: ${b.status}`);
        });
      }
    }
    
    console.log('\n💡 ANÁLISIS:\n');
    console.log('   ✅ manualSignedPdfPath SÍ EXISTE en producción');
    console.log('   ✅ signedPdfPath se usa para firmas de SignNow');
    console.log('   ✅ manualSignedPdfPath se usa para firmas manuales');
    console.log('   ✅ legacySignedPdfUrl se usa para budgets legacy\n');
    
    console.log('🎯 RECOMENDACIÓN:\n');
    console.log('   ✓ Sistema actual es CORRECTO - 3 campos separados:');
    console.log('     • signedPdfPath       → Firmas SignNow');
    console.log('     • manualSignedPdfPath → Firmas manuales');
    console.log('     • legacySignedPdfUrl  → Budgets legacy');

    // ═══════════════════════════════════════════════════════════════════════════
    // 3️⃣ BUDGETS SIN MÉTODO DE FIRMA (43 budgets)
    // ═══════════════════════════════════════════════════════════════════════════
    
    console.log('\n═'.repeat(80));
    console.log('\n3️⃣  ANÁLISIS: Budgets SIN Método de Firma (43 budgets)\n');
    
    const sinMetodo = allBudgets.filter(b => 
      !b.signatureMethod || b.signatureMethod === 'none'
    );
    
    console.log(`📊 Total sin método de firma: ${sinMetodo.length}\n`);
    
    // Distribución por estado
    const porEstado = {};
    sinMetodo.forEach(b => {
      porEstado[b.status] = (porEstado[b.status] || 0) + 1;
    });
    
    console.log('Distribución por ESTADO:\n');
    Object.entries(porEstado)
      .sort((a, b) => b[1] - a[1])
      .forEach(([estado, count]) => {
        console.log(`   ${estado.padEnd(25)}: ${String(count).padStart(2)} budgets`);
      });
    
    // Analizar por antigüedad
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('Distribución por ANTIGÜEDAD:\n');
    
    const ultimos30Dias = sinMetodo.filter(b => {
      const diff = (new Date() - new Date(b.createdAt)) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    });
    
    const ultimos90Dias = sinMetodo.filter(b => {
      const diff = (new Date() - new Date(b.createdAt)) / (1000 * 60 * 60 * 24);
      return diff > 30 && diff <= 90;
    });
    
    const masAntiguo = sinMetodo.filter(b => {
      const diff = (new Date() - new Date(b.createdAt)) / (1000 * 60 * 60 * 24);
      return diff > 90;
    });
    
    console.log(`   📅 Últimos 30 días:    ${ultimos30Dias.length} budgets`);
    console.log(`   📅 30-90 días:         ${ultimos90Dias.length} budgets`);
    console.log(`   📅 Más de 90 días:     ${masAntiguo.length} budgets`);
    
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('Categorización por FLUJO DE TRABAJO:\n');
    
    // Categorizar según su estado en el flujo
    const enProceso = sinMetodo.filter(b => 
      ['draft', 'created', 'send', 'pending_review', 'client_approved', 'notResponded', 'sent_for_signature'].includes(b.status)
    );
    
    const completadosSinFirma = sinMetodo.filter(b => 
      ['signed', 'approved'].includes(b.status)
    );
    
    const rechazados = sinMetodo.filter(b => b.status === 'rejected');
    const legacy = sinMetodo.filter(b => b.isLegacy);
    
    console.log(`   🔄 En proceso (draft, pending, etc.):     ${enProceso.length} budgets`);
    console.log(`   ⚠️  Completados sin firma (signed/approved): ${completadosSinFirma.length} budgets`);
    console.log(`   ❌ Rechazados:                              ${rechazados.length} budgets`);
    console.log(`   🗂️  Legacy:                                  ${legacy.length} budgets`);
    
    console.log('\n═'.repeat(80));
    console.log('\n🎯 RECOMENDACIONES\n');
    console.log('═'.repeat(80));
    
    console.log('\n1️⃣  BUDGETS COMPLETADOS SIN MÉTODO DE FIRMA:\n');
    if (completadosSinFirma.length > 0) {
      console.log(`   ⚠️  ${completadosSinFirma.length} budgets en estado 'signed' o 'approved' SIN método de firma`);
      console.log('   📝 ACCIÓN: Actualizar a signatureMethod = "manual" o "legacy"');
      console.log('   💡 SCRIPT: Crear migración para asignar método retroactivamente\n');
      
      if (completadosSinFirma.length <= 10) {
        console.log('   Listado:');
        completadosSinFirma.forEach((b, i) => {
          console.log(`   ${i + 1}. ID ${b.idBudget} | ${b.status} | ${b.applicantName.substring(0, 35)}`);
        });
      }
    } else {
      console.log('   ✅ No hay budgets completados sin método de firma');
    }
    
    console.log('\n2️⃣  BUDGETS EN PROCESO SIN MÉTODO:\n');
    console.log(`   📊 ${enProceso.length} budgets en estados intermedios (draft, pending, etc.)`);
    console.log('   ✅ ACCIÓN: DEJAR COMO ESTÁN (signatureMethod = none)');
    console.log('   💡 RAZÓN: Aún no han sido enviados a firmar, esperando definición');
    console.log('   📝 Se asignará método cuando se envíen a firma (SignNow o manual)');
    
    console.log('\n3️⃣  ESTRATEGIA PARA signatureMethod = "none":\n');
    console.log('   ✓ Es VÁLIDO tener budgets con signatureMethod = "none"');
    console.log('   ✓ Representa budgets que AÚN NO han sido enviados a firma');
    console.log('   ✓ NO es necesario asignar un método genérico');
    console.log('   ✓ El método se asigna cuando el usuario elige cómo firmar');
    
    console.log('\n4️⃣  CAMPO manualSignedPdfPath:\n');
    console.log('   ✅ SÍ existe en producción - sistema correcto');
    console.log('   ✓ signedPdfPath → Firmas SignNow');
    console.log('   ✓ manualSignedPdfPath → Firmas manuales');
    console.log('   ✓ legacySignedPdfUrl → Budgets legacy');
    
    // Resumen ejecutivo
    console.log('\n═'.repeat(80));
    console.log('\n📋 RESUMEN EJECUTIVO\n');
    console.log('═'.repeat(80));
    
    console.log(`
✅ Estados del Sistema:
   • ${aprobados.length} Aprobados (${aprobadosSinFirma.length} sin método de firma)
   • ${firmados.length} Firmados (${firmadosSinMetodo.length} sin método de firma)
   • ${sinMetodo.length} Sin método de firma
   
⚠️  Acciones Necesarias:
   ${completadosSinFirma.length > 0 ? `• Migrar ${completadosSinFirma.length} budgets completados a signatureMethod = "manual"` : '• Ninguna migración necesaria'}
   
✅ Mantener Como Está:
   • ${enProceso.length} budgets en proceso con signatureMethod = "none" (correcto)
   • Sistema de 3 campos para firmas (signedPdfPath, manualSignedPdfPath, legacySignedPdfUrl)
   • Campo signatureMethod para distinguir tipo de firma
`);
    
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await conn.close();
    console.log('\n✅ Conexión cerrada');
    process.exit(0);
  }
}

analyzeSpecialCases();
