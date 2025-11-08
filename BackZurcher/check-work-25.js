/**
 * Investigar Work #25 con Change Order problemático
 */

require('dotenv').config();
const { Work, Budget, ChangeOrder, FinalInvoice } = require('./src/data');

async function checkWork25() {
  try {
    console.log('🔍 INVESTIGANDO WORK #25\n');
    
    // Buscar por invoice number 25
    const budget = await Budget.findOne({
      where: { invoiceNumber: '25' },
      include: [{
        model: Work,
        include: [
          {
            model: ChangeOrder,
            as: 'changeOrders'
          },
          {
            model: FinalInvoice,
            as: 'finalInvoice'
          }
        ]
      }]
    });
    
    if (!budget) {
      console.log('❌ No se encontró Budget con invoice #25');
      return;
    }
    
    console.log('📋 BUDGET INFO:');
    console.log(`   Invoice #: ${budget.invoiceNumber}`);
    console.log(`   Propiedad: ${budget.propertyAddress}`);
    console.log(`   Total Price: $${parseFloat(budget.totalPrice || 0).toFixed(2)}`);
    console.log(`   Client Total: $${parseFloat(budget.clientTotalPrice || 0).toFixed(2)}`);
    console.log(`   Initial Payment: $${parseFloat(budget.paymentProofAmount || 0).toFixed(2)}`);
    
    const work = budget.Work;
    if (!work) {
      console.log('\n❌ Este Budget NO tiene Work asociado');
      return;
    }
    
    console.log('\n🔨 WORK INFO:');
    console.log(`   Work ID: ${work.idWork}`);
    console.log(`   Status: ${work.status}`);
    
    console.log('\n📊 CHANGE ORDERS:');
    if (work.changeOrders && work.changeOrders.length > 0) {
      work.changeOrders.forEach((co, index) => {
        const diff = parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0);
        console.log(`\n   C.O. ${index + 1}:`);
        console.log(`   - ID: ${co.id}`);
        console.log(`   - Status: ${co.status}`);
        console.log(`   - Description: ${co.description || co.itemDescription || 'N/A'}`);
        console.log(`   - Previous Total: $${parseFloat(co.previousTotalPrice || 0).toFixed(2)}`);
        console.log(`   - New Total: $${parseFloat(co.newTotalPrice || 0).toFixed(2)}`);
        console.log(`   - Diferencia: $${diff.toFixed(2)} ${diff >= 0 ? '(Aumento)' : '(Descuento)'}`);
      });
    } else {
      console.log('   No hay Change Orders');
    }
    
    console.log('\n💰 FINAL INVOICE:');
    if (work.finalInvoice) {
      console.log(`   Status: ${work.finalInvoice.status}`);
      console.log(`   Original Budget: $${parseFloat(work.finalInvoice.originalBudgetTotal || 0).toFixed(2)}`);
      console.log(`   Subtotal Extras: $${parseFloat(work.finalInvoice.subtotalExtras || 0).toFixed(2)}`);
      console.log(`   Discount: $${parseFloat(work.finalInvoice.discount || 0).toFixed(2)}`);
      console.log(`   Final Amount Due: $${parseFloat(work.finalInvoice.finalAmountDue || 0).toFixed(2)}`);
    } else {
      console.log('   No tiene Final Invoice');
    }
    
    // Calcular como lo hace el endpoint
    console.log('\n🧮 CÁLCULO DEL ENDPOINT:');
    const budgetTotal = parseFloat(budget.clientTotalPrice || budget.totalPrice || 0);
    const initialPayment = parseFloat(budget.paymentProofAmount || 0);
    
    const changeOrdersTotal = (work.changeOrders || []).reduce((sum, co) => {
      return sum + (parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0));
    }, 0);
    
    const finalInvoiceExtras = parseFloat(work.finalInvoice?.subtotalExtras || 0);
    const expectedTotal = budgetTotal + changeOrdersTotal + finalInvoiceExtras;
    
    let totalCollected = initialPayment;
    if (work.finalInvoice?.status === 'paid') {
      totalCollected += parseFloat(work.finalInvoice.finalAmountDue || 0);
    } else if (work.finalInvoice?.status === 'partially_paid') {
      totalCollected += parseFloat(work.finalInvoice.amountPaid || 0);
    }
    
    const remainingAmount = expectedTotal - totalCollected;
    
    console.log(`   Budget Total: $${budgetTotal.toFixed(2)}`);
    console.log(`   Change Orders Total: $${changeOrdersTotal.toFixed(2)}`);
    console.log(`   Final Invoice Extras: $${finalInvoiceExtras.toFixed(2)}`);
    console.log(`   Expected Total: $${expectedTotal.toFixed(2)}`);
    console.log(`   Initial Payment: $${initialPayment.toFixed(2)}`);
    console.log(`   Total Collected: $${totalCollected.toFixed(2)}`);
    console.log(`   Remaining: $${remainingAmount.toFixed(2)}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkWork25();
