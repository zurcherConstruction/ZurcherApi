const { Budget } = require('./src/data');

async function checkBudget() {
  try {
    const budget = await Budget.findByPk(2284);
    
    if (!budget) {
      console.log('❌ Presupuesto 2284 no encontrado');
      process.exit(1);
    }

    console.log('\n📊 Estado del Budget 2284:');
    console.log('━'.repeat(70));
    console.log(`ID: ${budget.idBudget}`);
    console.log(`Status: ${budget.status}`);
    console.log(`Signature Method: ${budget.signatureMethod}`);
    console.log(`SignNow Document ID: ${budget.signNowDocumentId}`);
    console.log(`Signed PDF Path: ${budget.signedPdfPath}`);
    console.log(`Manual Signed PDF Path: ${budget.manualSignedPdfPath}`);
    console.log(`Created At: ${budget.createdAt}`);
    console.log(`Updated At: ${budget.updatedAt}`);
    console.log('━'.repeat(70));
    
    // Verificar por qué no lo encuentra el cron
    if (budget.signatureMethod === 'signnow' && budget.signNowDocumentId && budget.status !== 'signed') {
      console.log('\n⚠️  Este presupuesto DEBERÍA ser encontrado por el cron job');
      console.log('   - Tiene signNowDocumentId: ✅');
      console.log('   - signatureMethod es "signnow": ✅');
      console.log(`   - Status NO es "signed": ${budget.status !== 'signed' ? '✅' : '❌'}`);
    } else {
      console.log('\n✅ Este presupuesto NO debería ser encontrado por el cron porque:');
      if (budget.status === 'signed') {
        console.log('   - Ya está firmado (status: signed)');
      }
      if (budget.signatureMethod !== 'signnow') {
        console.log(`   - Método de firma: ${budget.signatureMethod} (no es signnow)`);
      }
      if (!budget.signNowDocumentId) {
        console.log('   - No tiene signNowDocumentId');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkBudget();
