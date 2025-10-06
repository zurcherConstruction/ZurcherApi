const { conn, Budget, Permit } = require('./src/data');

async function checkBudgetStates() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    
    // Obtener todos los presupuestos con sus estados
    const budgets = await Budget.findAll({
      attributes: ['idBudget', 'status', 'applicantName', 'propertyAddress', 'paymentInvoice'],
      include: [{
        model: Permit,
        attributes: ['permitNumber']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    console.log(`📋 Últimos 20 presupuestos en la base de datos:\n`);
    
    const allowedStatesForPayment = [
      'created',
      'send', 
      'sent_for_signature', 
      'signed',
      'client_approved',
      'pending_review'
    ];
    
    budgets.forEach(budget => {
      const isAllowed = allowedStatesForPayment.includes(budget.status);
      const hasProof = budget.paymentInvoice ? '✅ Tiene comprobante' : '❌ Sin comprobante';
      const icon = isAllowed ? '✅' : '❌';
      
      console.log(`${icon} ID: ${budget.idBudget} | Estado: ${budget.status.padEnd(20)} | ${hasProof}`);
      console.log(`   Cliente: ${budget.applicantName}`);
      console.log(`   Dirección: ${budget.propertyAddress}`);
      if (budget.Permit) {
        console.log(`   Permit: ${budget.Permit.permitNumber}`);
      }
      console.log('');
    });
    
    console.log('\n📊 Resumen por estado:');
    const statusCount = {};
    budgets.forEach(b => {
      statusCount[b.status] = (statusCount[b.status] || 0) + 1;
    });
    
    Object.entries(statusCount).forEach(([status, count]) => {
      const isAllowed = allowedStatesForPayment.includes(status);
      const icon = isAllowed ? '✅' : '❌';
      console.log(`${icon} ${status.padEnd(20)}: ${count} presupuesto(s)`);
    });
    
    console.log('\n🔍 Estados permitidos para cargar comprobante:');
    allowedStatesForPayment.forEach(state => {
      const count = statusCount[state] || 0;
      console.log(`   - ${state.padEnd(20)}: ${count} presupuesto(s) disponibles`);
    });
    
    const eligibleBudgets = budgets.filter(b => 
      allowedStatesForPayment.includes(b.status) && !b.paymentInvoice
    );
    
    console.log(`\n✅ Total de presupuestos SIN comprobante y elegibles: ${eligibleBudgets.length}`);
    
    if (eligibleBudgets.length > 0) {
      console.log('\n📝 Presupuestos disponibles para cargar comprobante:');
      eligibleBudgets.forEach(b => {
        console.log(`   - ID ${b.idBudget}: ${b.applicantName} (${b.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await conn.close();
    process.exit(0);
  }
}

checkBudgetStates();
