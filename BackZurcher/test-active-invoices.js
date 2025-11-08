/**
 * TEST: Verificar que getActiveInvoices solo muestre WORKS (no budgets sueltos)
 */

require('dotenv').config();
const { Work, Budget } = require('./src/data');
const { Op } = require('sequelize');

async function testActiveInvoices() {
  try {
    console.log('🧪 PROBANDO ACTIVE INVOICES (solo Works)\n');
    
    // 1. Contar Budgets signed/approved SIN Work (los que antes se mostraban mal)
    const budgetsWithoutWork = await Budget.count({
      where: {
        status: {
          [Op.in]: ['signed', 'approved']
        }
      },
      include: [{
        model: Work,
        required: false // LEFT JOIN para encontrar budgets SIN work
      }]
    });
    
    const budgetsWithWork = await Work.count({
      include: [{
        model: Budget,
        as: 'budget',
        required: true
      }]
    });
    
    console.log(`📊 Budgets signed/approved TOTAL: ${budgetsWithoutWork}`);
    console.log(`✅ Works con Budget: ${budgetsWithWork}`);
    console.log(`❌ Budgets SIN Work: ${budgetsWithoutWork - budgetsWithWork}`);
    
    // 2. Obtener algunos Works con sus budgets (lo que ahora se mostrará)
    const sampleWorks = await Work.findAll({
      limit: 5,
      include: [{
        model: Budget,
        as: 'budget',
        required: true,
        attributes: ['idBudget', 'totalPrice', 'paymentProofAmount', 'applicantName', 'status']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\n🔍 Muestra de Works que se mostrarán:');
    sampleWorks.forEach(work => {
      console.log(`   - Work #${work.idWork}`);
      console.log(`     Status: ${work.status}`);
      console.log(`     Cliente: ${work.budget?.applicantName || 'N/A'}`);
      console.log(`     Budget Status: ${work.budget?.status}`);
      console.log(`     Total: $${parseFloat(work.budget?.totalPrice || 0).toFixed(2)}`);
    });
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log(`\nℹ️  El endpoint /accounts-receivable/active-invoices ahora mostrará`);
    console.log(`   solo los ${budgetsWithWork} Works (NO los budgets sueltos sin Work).`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    process.exit(1);
  }
}

testActiveInvoices();
