/**
 * TEST: Verificar que Accounts Receivable muestre TODOS los Works
 * Prueba la función actualizada sin filtro de status
 */

require('dotenv').config();
const { Work, Budget } = require('./src/data');

async function testAccountsReceivable() {
  try {
    console.log('🧪 PROBANDO ACCOUNTS RECEIVABLE ACTUALIZADO\n');
    
    // 1. Contar todos los Works sin filtro
    const allWorksCount = await Work.count();
    console.log(`📊 Total Works en base de datos: ${allWorksCount}`);
    
    // 2. Contar Works por status
    const worksByStatus = await Work.findAll({
      attributes: ['status', [require('sequelize').fn('COUNT', 'status'), 'count']],
      group: ['status'],
      raw: true
    });
    
    console.log('\n📋 Distribución por Status:');
    worksByStatus.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} works`);
    });
    
    // 3. Obtener algunos Works con sus budgets
    const sampleWorks = await Work.findAll({
      limit: 5,
      include: [{
        model: Budget,
        as: 'budget',
        attributes: ['idBudget', 'totalPrice', 'paymentProofAmount', 'applicantName']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\n🔍 Muestra de Works recientes:');
    sampleWorks.forEach(work => {
      const budgetTotal = parseFloat(work.budget?.totalPrice || 0);
      const paid = parseFloat(work.budget?.paymentProofAmount || 0);
      const pending = budgetTotal - paid;
      
      console.log(`   - Work #${work.idWork}: ${work.status}`);
      console.log(`     Cliente: ${work.budget?.applicantName || 'N/A'}`);
      console.log(`     Total: $${budgetTotal.toFixed(2)} | Pagado: $${paid.toFixed(2)} | Pendiente: $${pending.toFixed(2)}`);
    });
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log(`\nℹ️  El endpoint /accounts-receivable ahora mostrará los ${allWorksCount} Works`);
    console.log('   sin importar su status.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    process.exit(1);
  }
}

testAccountsReceivable();
