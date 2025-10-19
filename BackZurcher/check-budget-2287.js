const { Budget } = require('./src/data');

async function checkBudget() {
  try {
    const budget = await Budget.findByPk(2287);
    
    if (!budget) {
      console.log('❌ Presupuesto 2287 no encontrado');
      return;
    }

    console.log('\n📊 Estado del Budget 2287:');
    console.log('━'.repeat(60));
    console.log(`ID: ${budget.idBudget}`);
    console.log(`Status: ${budget.status}`);
    console.log(`Signature Method: ${budget.signatureMethod}`);
    console.log(`Manual Signed PDF Path: ${budget.manualSignedPdfPath}`);
    console.log(`Manual Signed PDF Public ID: ${budget.manualSignedPdfPublicId}`);
    console.log(`SignNow Document ID: ${budget.signNowDocumentId}`);
    console.log(`Signed PDF Path: ${budget.signedPdfPath}`);
    console.log('━'.repeat(60));
    
    if (budget.signatureMethod === 'manual' && budget.manualSignedPdfPath) {
      console.log('✅ El presupuesto tiene firma manual configurada correctamente');
      console.log(`📄 URL del PDF: ${budget.manualSignedPdfPath}`);
    } else {
      console.log('⚠️ El presupuesto NO tiene firma manual');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkBudget();
