const { conn, Budget, Permit } = require('./src/data');

/**
 * Script para verificar budgets según la LÓGICA EXACTA del frontend GestionBudgets
 * Replica las categorías que se muestran en las tarjetas del dashboard
 */

async function verifyFrontendBudgetStats() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos de PRODUCCIÓN\n');
    console.log('🔍 Analizando budgets según lógica del FRONTEND GestionBudgets...\n');
    console.log('═'.repeat(80));
    
    // Obtener TODOS los budgets con todos los campos necesarios
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
        'isLegacy',
        'createdAt'
      ],
      include: [{
        model: Permit,
        attributes: ['permitNumber', 'idPermit']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 TOTAL DE BUDGETS: ${allBudgets.length}\n`);
    console.log('═'.repeat(80));

    // CATEGORÍAS SEGÚN EL FRONTEND (GestionBudgets.jsx líneas 155-188)
    
    // 1. BORRADORES: draft, created
    const borradores = allBudgets.filter(b => 
      ['draft', 'created'].includes(b.status)
    );
    
    // 2. EN REVISIÓN: send, pending_review, client_approved, notResponded, sent_for_signature
    const enRevision = allBudgets.filter(b => 
      ['send', 'pending_review', 'client_approved', 'notResponded', 'sent_for_signature'].includes(b.status)
    );
    
    // 3. FIRMADOS (sin pago): status = 'signed' AND NOT isLegacy
    const firmados = allBudgets.filter(b => 
      b.status === 'signed' && !b.isLegacy
    );
    
    // 4. APROBADOS (firmados + pago): status = 'approved' AND NOT isLegacy
    const aprobados = allBudgets.filter(b => 
      b.status === 'approved' && !b.isLegacy
    );
    
    // 5. LEGACY: isLegacy = true
    const legacy = allBudgets.filter(b => 
      b.isLegacy === true
    );
    
    // 6. RECHAZADOS: status = 'rejected'
    const rechazados = allBudgets.filter(b => 
      b.status === 'rejected'
    );

    // Mostrar resultados como en el frontend
    console.log('\n📊 ESTADÍSTICAS SEGÚN FRONTEND (GestionBudgets Dashboard)\n');
    console.log(`┌─────────────────────────────────────────────────────────────┐`);
    console.log(`│  🎯 TOTAL:                                ${String(allBudgets.length).padStart(3)}              │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  📝 Borradores:                           ${String(borradores.length).padStart(3)}              │`);
    console.log(`│     (draft, created)                                        │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  📤 Enviados (En seguimiento):            ${String(enRevision.length).padStart(3)}              │`);
    console.log(`│     (send, pending_review, client_approved,                 │`);
    console.log(`│      notResponded, sent_for_signature)                      │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  ✍️  Firmados Sin Pago:                    ${String(firmados.length).padStart(3)}              │`);
    console.log(`│     (status=signed AND NOT legacy)                          │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  ✅ Aprobados (Firmados + Pago):           ${String(aprobados.length).padStart(3)}              │`);
    console.log(`│     (status=approved AND NOT legacy)                        │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  🗂️  Legacy:                               ${String(legacy.length).padStart(3)}              │`);
    console.log(`│     (isLegacy=true)                                         │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│  ❌ Rechazados:                            ${String(rechazados.length).padStart(3)}              │`);
    console.log(`│     (status=rejected)                                       │`);
    console.log(`└─────────────────────────────────────────────────────────────┘`);

    // Verificación de suma
    const totalCategorizado = borradores.length + enRevision.length + firmados.length + 
                              aprobados.length + legacy.length + rechazados.length;
    
    console.log('\n═'.repeat(80));
    console.log('\n🔍 VERIFICACIÓN DE SUMA\n');
    console.log(`Suma de categorías: ${totalCategorizado}`);
    console.log(`Total en BD:        ${allBudgets.length}`);
    
    if (totalCategorizado === allBudgets.length) {
      console.log('✅ ¡CORRECTO! Todos los budgets están categorizados\n');
    } else {
      const diferencia = allBudgets.length - totalCategorizado;
      console.log(`❌ ¡DISCREPANCIA! Hay ${Math.abs(diferencia)} budget(s) sin categorizar\n`);
      
      // Encontrar el budget que no está categorizado
      const categorizados = new Set([
        ...borradores.map(b => b.idBudget),
        ...enRevision.map(b => b.idBudget),
        ...firmados.map(b => b.idBudget),
        ...aprobados.map(b => b.idBudget),
        ...legacy.map(b => b.idBudget),
        ...rechazados.map(b => b.idBudget)
      ]);
      
      const noCategorizado = allBudgets.filter(b => !categorizados.has(b.idBudget));
      
      if (noCategorizado.length > 0) {
        console.log('⚠️  BUDGETS NO CATEGORIZADOS:\n');
        noCategorizado.forEach(b => {
          console.log(`   📍 ID: ${b.idBudget}`);
          console.log(`      Estado: ${b.status}`);
          console.log(`      Cliente: ${b.applicantName}`);
          console.log(`      isLegacy: ${b.isLegacy}`);
          console.log(`      Dirección: ${b.propertyAddress}`);
          console.log(`      Fecha: ${b.date}`);
          console.log('');
        });
      }
    }

    // Desglose detallado de "En Revisión"
    console.log('═'.repeat(80));
    console.log('\n📤 DESGLOSE DETALLADO: "Enviados (En seguimiento)" = 38\n');
    
    const send = enRevision.filter(b => b.status === 'send');
    const pendingReview = enRevision.filter(b => b.status === 'pending_review');
    const clientApproved = enRevision.filter(b => b.status === 'client_approved');
    const notResponded = enRevision.filter(b => b.status === 'notResponded');
    const sentForSignature = enRevision.filter(b => b.status === 'sent_for_signature');
    
    console.log(`   ├─ send:                 ${String(send.length).padStart(2)} budgets`);
    console.log(`   ├─ pending_review:       ${String(pendingReview.length).padStart(2)} budgets`);
    console.log(`   ├─ client_approved:      ${String(clientApproved.length).padStart(2)} budgets`);
    console.log(`   ├─ notResponded:         ${String(notResponded.length).padStart(2)} budgets`);
    console.log(`   └─ sent_for_signature:   ${String(sentForSignature.length).padStart(2)} budgets`);
    console.log(`                           ────`);
    console.log(`      TOTAL:                ${String(enRevision.length).padStart(2)} budgets`);

    // Análisis de comprobantes de pago
    console.log('\n═'.repeat(80));
    console.log('\n💰 ANÁLISIS DE COMPROBANTES DE PAGO\n');
    
    const conComprobante = allBudgets.filter(b => b.paymentInvoice);
    const sinComprobante = allBudgets.filter(b => !b.paymentInvoice);
    
    console.log(`✅ Con comprobante de pago:  ${conComprobante.length}`);
    console.log(`❌ Sin comprobante de pago:  ${sinComprobante.length}\n`);
    
    // Comprobantes por categoría
    console.log('Distribución de comprobantes por categoría:');
    console.log(`   - Borradores:        ${borradores.filter(b => b.paymentInvoice).length}/${borradores.length} con comprobante`);
    console.log(`   - En Revisión:       ${enRevision.filter(b => b.paymentInvoice).length}/${enRevision.length} con comprobante`);
    console.log(`   - Firmados Sin Pago: ${firmados.filter(b => b.paymentInvoice).length}/${firmados.length} con comprobante`);
    console.log(`   - Aprobados:         ${aprobados.filter(b => b.paymentInvoice).length}/${aprobados.length} con comprobante`);
    console.log(`   - Legacy:            ${legacy.filter(b => b.paymentInvoice).length}/${legacy.length} con comprobante`);

    // Métodos de firma
    console.log('\n═'.repeat(80));
    console.log('\n✍️  ANÁLISIS DE MÉTODOS DE FIRMA\n');
    
    const signNow = allBudgets.filter(b => b.signatureMethod === 'signnow');
    const manual = allBudgets.filter(b => b.signatureMethod === 'manual' || b.signatureMethod === 'manual_upload');
    const legacyMethod = allBudgets.filter(b => b.signatureMethod === 'legacy');
    const none = allBudgets.filter(b => !b.signatureMethod || b.signatureMethod === 'none');
    
    console.log(`🌐 SignNow:           ${signNow.length} budgets`);
    console.log(`📄 Manual:            ${manual.length} budgets`);
    console.log(`🗂️  Legacy:            ${legacyMethod.length} budgets`);
    console.log(`❌ None/Sin método:   ${none.length} budgets`);
    console.log(`                     ────`);
    console.log(`   TOTAL:            ${allBudgets.length} budgets`);

    // Listado de budgets firmados sin pago
    if (firmados.length > 0) {
      console.log('\n═'.repeat(80));
      console.log('\n✍️  LISTADO: Firmados Sin Pago (Gestión de cobros)\n');
      firmados.forEach((b, index) => {
        const hasProof = b.paymentInvoice ? '💰' : '❌';
        console.log(`${String(index + 1).padStart(2)}. ${hasProof} ID ${String(b.idBudget).padStart(4)} | ${b.applicantName.substring(0, 35).padEnd(35)} | ${b.status}`);
      });
    }

    // Listado de budgets aprobados
    if (aprobados.length > 0) {
      console.log('\n═'.repeat(80));
      console.log('\n✅ LISTADO: Aprobados (Firmados + Pago)\n');
      aprobados.forEach((b, index) => {
        const hasProof = b.paymentInvoice ? '✅' : '⚠️';
        console.log(`${String(index + 1).padStart(2)}. ${hasProof} ID ${String(b.idBudget).padStart(4)} | ${b.applicantName.substring(0, 35).padEnd(35)} | ${b.status}`);
      });
    }

    console.log('\n═'.repeat(80));
    console.log('\n🎯 CONCLUSIÓN\n');
    console.log(`El sistema tiene ${allBudgets.length} budgets en total.`);
    console.log(`Los filtros del frontend están ${totalCategorizado === allBudgets.length ? 'CORRECTOS ✅' : 'INCORRECTOS ❌'}`);
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

verifyFrontendBudgetStats();
