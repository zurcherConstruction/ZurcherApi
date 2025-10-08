const { conn, Budget, Permit } = require('./src/data');

async function diagnoseBudgetsEditable() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    
    // Obtener todos los presupuestos con información relevante
    const budgets = await Budget.findAll({
      attributes: [
        'idBudget', 
        'status', 
        'applicantName', 
        'propertyAddress', 
        'paymentInvoice',
        'paymentProofAmount',
        'paymentProofMethod'
      ],
      include: [{
        model: Permit,
        attributes: ['permitNumber']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50 // Últimos 50 presupuestos
    });
    
    console.log(`📊 TOTAL DE PRESUPUESTOS EN BD: ${budgets.length}\n`);
    console.log('=' .repeat(100));
    
    // Contadores
    let editableCount = 0;
    let lockedCount = 0;
    
    // Analizar cada presupuesto
    budgets.forEach((budget, index) => {
      // 🔍 LÓGICA DE BLOQUEO (igual que EditBudget.jsx)
      let isLocked = false;
      let lockReason = '';
      
      // Bloquear si tiene URL de comprobante
      if (budget.paymentInvoice && budget.paymentInvoice.trim() !== '') {
        isLocked = true;
        lockReason = 'Tiene paymentInvoice';
      }
      
      // Bloquear si tiene monto de comprobante registrado
      if (budget.paymentProofAmount && parseFloat(budget.paymentProofAmount) > 0) {
        isLocked = true;
        lockReason = lockReason ? `${lockReason} + paymentProofAmount` : 'Tiene paymentProofAmount';
      }
      
      if (isLocked) {
        lockedCount++;
      } else {
        editableCount++;
      }
      
      const icon = isLocked ? '🔒' : '✅';
      const statusPadded = budget.status.padEnd(20);
      
      console.log(`${icon} ID: ${budget.idBudget} | Estado: ${statusPadded} | ${isLocked ? `BLOQUEADO (${lockReason})` : 'EDITABLE'}`);
      console.log(`   Cliente: ${budget.applicantName}`);
      console.log(`   Dirección: ${budget.propertyAddress}`);
      if (budget.Permit) {
        console.log(`   Permit: ${budget.Permit.permitNumber}`);
      }
      console.log(`   paymentInvoice: ${budget.paymentInvoice || 'NULL'}`);
      console.log(`   paymentProofAmount: ${budget.paymentProofAmount || 'NULL'}`);
      console.log(`   paymentProofMethod: ${budget.paymentProofMethod || 'NULL'}`);
      console.log('');
    });
    
    console.log('=' .repeat(100));
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Presupuestos EDITABLES: ${editableCount}`);
    console.log(`   🔒 Presupuestos BLOQUEADOS: ${lockedCount}`);
    console.log(`   📋 Total: ${budgets.length}\n`);
    
    // Desglose por estado
    console.log('📈 DESGLOSE POR ESTADO:\n');
    const statusCount = {};
    const statusEditable = {};
    const statusLocked = {};
    
    budgets.forEach(b => {
      statusCount[b.status] = (statusCount[b.status] || 0) + 1;
      
      // Verificar si está bloqueado
      const hasInvoice = b.paymentInvoice && b.paymentInvoice.trim() !== '';
      const hasAmount = b.paymentProofAmount && parseFloat(b.paymentProofAmount) > 0;
      const isLocked = hasInvoice || hasAmount;
      
      if (isLocked) {
        statusLocked[b.status] = (statusLocked[b.status] || 0) + 1;
      } else {
        statusEditable[b.status] = (statusEditable[b.status] || 0) + 1;
      }
    });
    
    // Ordenar estados
    const allStatuses = [...new Set([
      ...Object.keys(statusEditable),
      ...Object.keys(statusLocked)
    ])].sort();
    
    allStatuses.forEach(status => {
      const total = statusCount[status] || 0;
      const editable = statusEditable[status] || 0;
      const locked = statusLocked[status] || 0;
      
      console.log(`   ${status.padEnd(20)}: ${total} total (✅ ${editable} editables, 🔒 ${locked} bloqueados)`);
    });
    
    console.log('\n🔍 CASOS ESPECIALES:\n');
    
    // Presupuestos aprobados sin comprobante (anomalía)
    const approvedWithoutPayment = budgets.filter(b => 
      b.status === 'approved' && 
      (!b.paymentInvoice || b.paymentInvoice.trim() === '') &&
      (!b.paymentProofAmount || parseFloat(b.paymentProofAmount) === 0)
    );
    
    if (approvedWithoutPayment.length > 0) {
      console.log(`   ⚠️  Presupuestos en estado "approved" SIN comprobante: ${approvedWithoutPayment.length}`);
      approvedWithoutPayment.forEach(b => {
        console.log(`      - ID ${b.idBudget}: ${b.applicantName} (ANOMALÍA)`);
      });
    }
    
    // Presupuestos con comprobante pero NO aprobados (posible)
    const withPaymentNotApproved = budgets.filter(b => 
      b.status !== 'approved' && 
      (
        (b.paymentInvoice && b.paymentInvoice.trim() !== '') ||
        (b.paymentProofAmount && parseFloat(b.paymentProofAmount) > 0)
      )
    );
    
    if (withPaymentNotApproved.length > 0) {
      console.log(`\n   📌 Presupuestos CON comprobante pero NO en estado "approved": ${withPaymentNotApproved.length}`);
      withPaymentNotApproved.forEach(b => {
        console.log(`      - ID ${b.idBudget}: ${b.applicantName} (Estado: ${b.status})`);
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

diagnoseBudgetsEditable();
