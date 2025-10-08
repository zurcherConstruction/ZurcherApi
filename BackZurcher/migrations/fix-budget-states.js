/**
 * 🔧 Script para corregir estados de budgets y invoice numbers
 * 
 * PROBLEMA: Muchos budgets tienen invoiceNumber pero deberían estar en draft
 * 
 * SOLUCIÓN:
 * 1. Budgets SIN paymentInvoice → Volver a draft y quitar invoiceNumber
 * 2. Budgets CON paymentInvoice → Mantener approved y invoiceNumber
 * 3. Reasignar invoice numbers secuenciales solo a los que realmente fueron aprobados
 */

const { conn } = require('../src/data');
const { QueryTypes } = require('sequelize');

async function fixBudgetStates() {
  const transaction = await conn.transaction();
  
  try {
    console.log('🔍 Analizando estado de budgets...\n');

    // 1. Ver estado actual
    const currentState = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("invoiceNumber") as with_invoice,
        COUNT("paymentInvoice") as with_payment,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
        COUNT(CASE WHEN status = 'client_approved' THEN 1 END) as client_approved,
        COUNT(CASE WHEN status = 'created' THEN 1 END) as created,
        COUNT(CASE WHEN status = 'send' THEN 1 END) as send,
        COUNT(CASE WHEN status = 'sent_for_signature' THEN 1 END) as sent_for_signature,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'notResponded' THEN 1 END) as not_responded,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM "Budgets"
    `, { type: QueryTypes.SELECT, transaction });

    console.log('📊 ESTADO ACTUAL:');
    console.log('─'.repeat(60));
    console.log(`  Total de Budgets: ${currentState[0].total}`);
    console.log(`  Con Invoice Number: ${currentState[0].with_invoice}`);
    console.log(`  Con Comprobante de Pago: ${currentState[0].with_payment}`);
    console.log('\n  Distribución por Estado:');
    console.log(`    - draft: ${currentState[0].drafts}`);
    console.log(`    - pending_review: ${currentState[0].pending_review}`);
    console.log(`    - client_approved: ${currentState[0].client_approved}`);
    console.log(`    - created: ${currentState[0].created}`);
    console.log(`    - send: ${currentState[0].send}`);
    console.log(`    - sent_for_signature: ${currentState[0].sent_for_signature}`);
    console.log(`    - signed: ${currentState[0].signed}`);
    console.log(`    - approved: ${currentState[0].approved}`);
    console.log(`    - notResponded: ${currentState[0].not_responded}`);
    console.log(`    - rejected: ${currentState[0].rejected}`);
    console.log('\n');

    // 2. Identificar budgets que NO deberían tener invoiceNumber
    const incorrectBudgets = await conn.query(`
      SELECT 
        "idBudget",
        "invoiceNumber",
        "status",
        "paymentInvoice" IS NOT NULL as "hasPayment",
        "createdAt"
      FROM "Budgets"
      WHERE "invoiceNumber" IS NOT NULL
        AND "paymentInvoice" IS NULL
      ORDER BY "invoiceNumber"
    `, { type: QueryTypes.SELECT, transaction });

    console.log(`❌ BUDGETS INCORRECTOS (tienen invoice# pero NO tienen pago):`);
    console.log('─'.repeat(60));
    console.log(`  Encontrados: ${incorrectBudgets.length}`);
    
    if (incorrectBudgets.length > 0) {
      console.log('\n  Ejemplos:');
      incorrectBudgets.slice(0, 5).forEach(b => {
        console.log(`    Budget #${b.idBudget} → Invoice #${b.invoiceNumber} → Status: ${b.status}`);
      });
      console.log('\n');
    }

    // 3. PASO 1: Limpiar budgets sin pago
    console.log('🧹 PASO 1: Limpiando budgets sin comprobante de pago...');
    console.log('─'.repeat(60));
    
    const cleaned = await conn.query(`
      UPDATE "Budgets"
      SET 
        "invoiceNumber" = NULL,
        "convertedToInvoiceAt" = NULL,
        "status" = (CASE 
          -- Si ya está firmado, mantener 'signed'
          WHEN "status" = 'signed' THEN 'signed'
          -- Si está en proceso de firma, mantener 'sent_for_signature'
          WHEN "status" = 'sent_for_signature' THEN 'sent_for_signature'
          -- Si cliente ya aprobó, mantener 'client_approved'
          WHEN "status" = 'client_approved' THEN 'client_approved'
          -- Si está en revisión, mantener 'pending_review'
          WHEN "status" = 'pending_review' THEN 'pending_review'
          -- Si fue enviado (legacy), mantener 'send' o 'sent_for_signature'
          WHEN "status" IN ('send', 'sent') THEN 'send'
          -- Si fue rechazado, mantener 'rejected'
          WHEN "status" = 'rejected' THEN 'rejected'
          -- Si no respondió, mantener 'notResponded'
          WHEN "status" = 'notResponded' THEN 'notResponded'
          -- Si tiene SignNow document ID, probablemente está 'sent_for_signature'
          WHEN "signNowDocumentId" IS NOT NULL THEN 'sent_for_signature'
          -- Si tiene PDF firmado pero no pago, está 'signed' (esperando pago)
          WHEN "signedPdfPath" IS NOT NULL THEN 'signed'
          -- Si tiene items y fue creado, ponerlo en 'created' (estado original)
          WHEN EXISTS (
            SELECT 1 FROM "BudgetLineItems" 
            WHERE "BudgetLineItems"."budgetId" = "Budgets"."idBudget"
          ) THEN 'created'
          -- Si no tiene items, es un borrador
          ELSE 'draft'
        END)::"enum_Budgets_status"
      WHERE "paymentInvoice" IS NULL
        AND "invoiceNumber" IS NOT NULL
      RETURNING "idBudget", "status"
    `, { type: QueryTypes.UPDATE, transaction });

    console.log(`  ✅ ${cleaned[1]} budgets limpiados (invoiceNumber removido)`);
    console.log('\n');

    // 4. PASO 2: Verificar budgets CON pago (estos SÍ deben tener invoice#)
    const validBudgets = await conn.query(`
      SELECT 
        "idBudget",
        "invoiceNumber",
        "status",
        "paymentProofAmount",
        "createdAt"
      FROM "Budgets"
      WHERE "paymentInvoice" IS NOT NULL
      ORDER BY "createdAt" ASC
    `, { type: QueryTypes.SELECT, transaction });

    console.log('✅ BUDGETS VÁLIDOS (tienen comprobante de pago):');
    console.log('─'.repeat(60));
    console.log(`  Total: ${validBudgets.length}`);
    console.log('\n');

    // 5. PASO 3: Reasignar invoice numbers secuenciales
    console.log('📋 PASO 3: Reasignando invoice numbers secuenciales...');
    console.log('─'.repeat(60));
    
    let invoiceCounter = 1;
    for (const budget of validBudgets) {
      await conn.query(`
        UPDATE "Budgets"
        SET 
          "invoiceNumber" = :invoiceNumber,
          "status" = 'approved',
          "convertedToInvoiceAt" = CASE 
            WHEN "convertedToInvoiceAt" IS NULL THEN CURRENT_TIMESTAMP
            ELSE "convertedToInvoiceAt"
          END
        WHERE "idBudget" = :budgetId
      `, {
        replacements: { 
          invoiceNumber: invoiceCounter,
          budgetId: budget.idBudget
        },
        type: QueryTypes.UPDATE,
        transaction
      });

      console.log(`  ✅ Budget #${budget.idBudget} → Invoice #${invoiceCounter} (tiene pago de $${budget.paymentProofAmount || 'N/A'})`);
      invoiceCounter++;
    }

    console.log(`\n  ✅ ${validBudgets.length} budgets con invoice numbers válidos`);
    console.log('\n');

    // 6. Verificar resultado final
    const finalState = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("invoiceNumber") as with_invoice,
        COUNT("paymentInvoice") as with_payment,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
        COUNT(CASE WHEN status = 'client_approved' THEN 1 END) as client_approved,
        COUNT(CASE WHEN status = 'created' THEN 1 END) as created,
        COUNT(CASE WHEN status = 'send' THEN 1 END) as send,
        COUNT(CASE WHEN status = 'sent_for_signature' THEN 1 END) as sent_for_signature,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'notResponded' THEN 1 END) as not_responded,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN "invoiceNumber" IS NOT NULL AND "paymentInvoice" IS NULL THEN 1 END) as inconsistent
      FROM "Budgets"
    `, { type: QueryTypes.SELECT, transaction });

    console.log('📊 RESULTADO FINAL:');
    console.log('─'.repeat(60));
    console.log(`  Total de Budgets: ${finalState[0].total}`);
    console.log(`  Con Invoice Number: ${finalState[0].with_invoice}`);
    console.log(`  Con Comprobante de Pago: ${finalState[0].with_payment}`);
    console.log('\n  Distribución por Estado:');
    console.log(`    - draft: ${finalState[0].drafts}`);
    console.log(`    - pending_review: ${finalState[0].pending_review}`);
    console.log(`    - client_approved: ${finalState[0].client_approved}`);
    console.log(`    - created: ${finalState[0].created}`);
    console.log(`    - send: ${finalState[0].send}`);
    console.log(`    - sent_for_signature: ${finalState[0].sent_for_signature}`);
    console.log(`    - signed: ${finalState[0].signed}`);
    console.log(`    - approved: ${finalState[0].approved}`);
    console.log(`    - notResponded: ${finalState[0].not_responded}`);
    console.log(`    - rejected: ${finalState[0].rejected}`);
    console.log(`\n  Validación:`);
    console.log(`    - Inconsistentes (invoice# sin pago): ${finalState[0].inconsistent}`);
    console.log('\n');

    // 7. Validar que no haya inconsistencias
    if (finalState[0].inconsistent > 0) {
      throw new Error(`❌ ERROR: Todavía hay ${finalState[0].inconsistent} budgets con invoice# pero sin pago`);
    }

    // 8. Validar que todos los con pago tengan invoice#
    if (finalState[0].with_invoice !== finalState[0].with_payment) {
      throw new Error(`❌ ERROR: Desbalance - ${finalState[0].with_payment} con pago vs ${finalState[0].with_invoice} con invoice#`);
    }

    console.log('✅ VALIDACIÓN EXITOSA:');
    console.log('  ✓ Todos los budgets con pago tienen invoice number');
    console.log('  ✓ Todos los budgets sin pago NO tienen invoice number');
    console.log('  ✓ Estados correctos asignados');
    console.log('\n');

    // Confirmar transacción
    await transaction.commit();
    console.log('🎉 Corrección completada exitosamente!\n');

    // Mostrar resumen de cambios
    console.log('📝 RESUMEN DE CAMBIOS:');
    console.log('─'.repeat(60));
    console.log(`  Budgets limpiados: ${cleaned[1]}`);
    console.log(`  Budgets con invoice válido: ${validBudgets.length}`);
    console.log(`  Invoice numbers reasignados: 1 a ${validBudgets.length}`);
    console.log('\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERROR durante la corrección:', error.message);
    console.error('\n🔄 Transacción revertida - no se hicieron cambios\n');
    throw error;
  } finally {
    await conn.close();
  }
}

// Ejecutar corrección
fixBudgetStates()
  .then(() => {
    console.log('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
