#!/usr/bin/env node
/**
 * PRUEBA COMPLETA DE ACCOUNTS RECEIVABLE EN LOCAL
 * Verifica todos los cambios antes de deploy a producción
 */

require('dotenv').config();
const { Work, Budget, ChangeOrder, FinalInvoice } = require('./src/data');

async function testAccountsReceivableComplete() {
  try {
    console.log('🧪 PRUEBA COMPLETA - ACCOUNTS RECEIVABLE\n');
    console.log('=' .repeat(60));
    
    // TEST 1: Verificar que solo muestre Works (no budgets sueltos)
    console.log('\n📊 TEST 1: Conteo de Works vs Budgets');
    console.log('-'.repeat(60));
    
    const totalWorks = await Work.count();
    const totalBudgetsSigned = await Budget.count({
      where: { status: 'signed' }
    });
    
    console.log(`✅ Total Works: ${totalWorks}`);
    console.log(`📋 Total Budgets Signed: ${totalBudgetsSigned}`);
    console.log(`ℹ️  Accounts Receivable debe mostrar ${totalWorks} registros (no ${totalBudgetsSigned})`);
    
    // TEST 2: Verificar Works con Change Orders
    console.log('\n📊 TEST 2: Works con Change Orders');
    console.log('-'.repeat(60));
    
    const worksWithCO = await Work.findAll({
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'invoiceNumber', 'totalPrice', 'propertyAddress']
        },
        {
          model: ChangeOrder,
          as: 'changeOrders',
          where: { status: 'approved' },
          required: true
        }
      ]
    });
    
    console.log(`\n✅ Encontrados ${worksWithCO.length} Works con Change Orders aprobados\n`);
    
    let problemCOs = 0;
    worksWithCO.forEach(work => {
      const cos = work.changeOrders || [];
      cos.forEach(co => {
        const prev = parseFloat(co.previousTotalPrice || 0);
        const newT = parseFloat(co.newTotalPrice || 0);
        const diff = newT - prev;
        
        if (prev === 0 || newT === 0) {
          problemCOs++;
          console.log(`⚠️  Invoice #${work.budget?.invoiceNumber || 'N/A'}`);
          console.log(`   ${work.budget?.propertyAddress || 'N/A'}`);
          console.log(`   C.O.: Previous=$${prev.toFixed(2)}, New=$${newT.toFixed(2)}, Diff=$${diff.toFixed(2)}`);
          console.log(`   ❌ PROBLEMA: Valores en $0 - C.O. mal creado\n`);
        }
      });
    });
    
    if (problemCOs === 0) {
      console.log('✅ Todos los Change Orders tienen valores correctos');
    } else {
      console.log(`\n⚠️  Se encontraron ${problemCOs} Change Orders con problemas`);
      console.log('   Estos mostrarán +$0.00 en la tabla');
    }
    
    // TEST 3: Verificar cálculo de cobros
    console.log('\n📊 TEST 3: Verificar Cálculos de Cobros');
    console.log('-'.repeat(60));
    
    const sampleWork = await Work.findOne({
      include: [
        {
          model: Budget,
          as: 'budget',
          attributes: ['idBudget', 'invoiceNumber', 'totalPrice', 'clientTotalPrice', 'paymentProofAmount', 'propertyAddress']
        },
        {
          model: ChangeOrder,
          as: 'changeOrders',
          where: { status: 'approved' },
          required: false
        },
        {
          model: FinalInvoice,
          as: 'finalInvoice',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    if (sampleWork) {
      console.log(`\n📋 Ejemplo: Invoice #${sampleWork.budget?.invoiceNumber || 'N/A'}`);
      console.log(`   ${sampleWork.budget?.propertyAddress || 'N/A'}`);
      
      const budgetTotal = parseFloat(sampleWork.budget?.clientTotalPrice || sampleWork.budget?.totalPrice || 0);
      const initialPayment = parseFloat(sampleWork.budget?.paymentProofAmount || 0);
      
      const changeOrdersTotal = (sampleWork.changeOrders || []).reduce((sum, co) => {
        return sum + (parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0));
      }, 0);
      
      const finalInvoiceExtras = parseFloat(sampleWork.finalInvoice?.subtotalExtras || 0);
      const expectedTotal = budgetTotal + changeOrdersTotal + finalInvoiceExtras;
      
      let totalCollected = initialPayment;
      if (sampleWork.finalInvoice?.status === 'paid') {
        totalCollected += parseFloat(sampleWork.finalInvoice.finalAmountDue || 0);
      }
      
      const remainingAmount = expectedTotal - totalCollected;
      
      console.log(`\n   Budget Total: $${budgetTotal.toFixed(2)}`);
      console.log(`   Change Orders: +$${changeOrdersTotal.toFixed(2)}`);
      console.log(`   Final Invoice Extras: +$${finalInvoiceExtras.toFixed(2)}`);
      console.log(`   --------------------------------`);
      console.log(`   Expected Total: $${expectedTotal.toFixed(2)}`);
      console.log(`\n   Initial Payment: $${initialPayment.toFixed(2)}`);
      console.log(`   Final Invoice Paid: $${(totalCollected - initialPayment).toFixed(2)}`);
      console.log(`   --------------------------------`);
      console.log(`   Total Collected: $${totalCollected.toFixed(2)}`);
      console.log(`   Remaining: $${remainingAmount.toFixed(2)}`);
      
      if (remainingAmount < 0) {
        console.log(`   ⚠️  ADVERTENCIA: Remaining negativo - Revisar cálculo`);
      } else {
        console.log(`   ✅ Cálculo correcto`);
      }
    }
    
    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    console.log(`\n✅ Endpoint debe mostrar ${totalWorks} Works (no budgets sueltos)`);
    
    if (problemCOs > 0) {
      console.log(`⚠️  Hay ${problemCOs} Change Orders con valores en $0`);
      console.log(`   Estos necesitan corrección manual en producción`);
    } else {
      console.log(`✅ Todos los Change Orders tienen valores correctos`);
    }
    
    console.log('\n📍 SIGUIENTE PASO:');
    console.log('   1. Refrescar página de Accounts Receivable en LOCAL');
    console.log('   2. Verificar que tabla muestre solo Works (no "Sin Work")');
    console.log('   3. Verificar columnas: Invoice #, Propiedad, Fecha, Budget, C.O., Cobrado, Restante, Estado');
    console.log('   4. Si todo OK → Commit y push a producción');
    
    console.log('\n✅ PRUEBA COMPLETADA\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    process.exit(1);
  }
}

testAccountsReceivableComplete();
