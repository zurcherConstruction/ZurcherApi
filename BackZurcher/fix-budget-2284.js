const { Budget } = require('./src/data');

async function fixBudget2284() {
  try {
    const budget = await Budget.findByPk(2284);
    
    if (!budget) {
      console.log('❌ Presupuesto 2284 no encontrado');
      process.exit(1);
    }

    console.log('\n🔧 Corrigiendo Budget 2284...');
    console.log(`Estado actual: signatureMethod = "${budget.signatureMethod}"`);
    
    await budget.update({
      signatureMethod: 'signnow'
    });
    
    console.log(`✅ Actualizado: signatureMethod = "signnow"`);
    console.log('\n📊 Estado final:');
    console.log(`   - Status: ${budget.status}`);
    console.log(`   - Signature Method: ${budget.signatureMethod}`);
    console.log(`   - SignNow Document ID: ${budget.signNowDocumentId}`);
    console.log(`   - Signed PDF Path: ${budget.signedPdfPath ? '✅ Presente' : '❌ Ausente'}`);
    
    console.log('\n✅ Budget 2284 corregido exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBudget2284();
