/**
 * Script de migración para corregir signatureMethod de presupuestos firmados con SignNow
 * 
 * EJECUTAR UNA SOLA VEZ después del deploy
 * 
 * Este script encuentra todos los presupuestos que:
 * - Tienen signNowDocumentId (fueron enviados a SignNow)
 * - Tienen status 'signed' (están firmados)
 * - Tienen signatureMethod 'none' o NULL (valor incorrecto)
 * 
 * Y los actualiza a signatureMethod: 'signnow'
 */

const { Budget } = require('../src/data');
const { Op } = require('sequelize');

async function migrateSignNowSignatureMethods() {
  console.log('\n🔄 Iniciando migración de signatureMethod para presupuestos de SignNow...\n');
  
  try {
    // Buscar presupuestos que necesitan corrección
    const budgetsToFix = await Budget.findAll({
      where: {
        signNowDocumentId: { [Op.ne]: null }, // Tiene documento en SignNow
        status: 'signed', // Está firmado
        [Op.or]: [
          { signatureMethod: 'none' },
          { signatureMethod: null }
        ]
      }
    });

    if (budgetsToFix.length === 0) {
      console.log('✅ No hay presupuestos para corregir. Todos están correctos.');
      return;
    }

    console.log(`📋 Encontrados ${budgetsToFix.length} presupuestos para corregir:\n`);
    
    // Mostrar lista antes de actualizar
    budgetsToFix.forEach(budget => {
      console.log(`   - Budget #${budget.idBudget} (${budget.propertyAddress || 'Sin dirección'})`);
      console.log(`     Actual: signatureMethod="${budget.signatureMethod}"`);
      console.log(`     SignNow Doc ID: ${budget.signNowDocumentId}`);
      console.log(`     Signed PDF: ${budget.signedPdfPath ? '✅' : '❌'}`);
      console.log('');
    });

    // Confirmar antes de proceder
    console.log('━'.repeat(70));
    console.log('⚠️  ATENCIÓN: Se actualizarán estos presupuestos a signatureMethod="signnow"');
    console.log('━'.repeat(70));
    console.log('');

    // Actualizar todos en un solo UPDATE
    const [updatedCount] = await Budget.update(
      { signatureMethod: 'signnow' },
      {
        where: {
          signNowDocumentId: { [Op.ne]: null },
          status: 'signed',
          [Op.or]: [
            { signatureMethod: 'none' },
            { signatureMethod: null }
          ]
        }
      }
    );

    console.log(`✅ Migración completada: ${updatedCount} presupuesto(s) actualizado(s)\n`);
    
    // Verificar resultados
    const verifyBudgets = await Budget.findAll({
      where: {
        idBudget: { [Op.in]: budgetsToFix.map(b => b.idBudget) }
      },
      attributes: ['idBudget', 'signatureMethod', 'status']
    });

    console.log('📊 Verificación de resultados:');
    verifyBudgets.forEach(budget => {
      const icon = budget.signatureMethod === 'signnow' ? '✅' : '❌';
      console.log(`   ${icon} Budget #${budget.idBudget}: signatureMethod="${budget.signatureMethod}"`);
    });

    console.log('\n🎉 Migración finalizada exitosamente\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSignNowSignatureMethods();
