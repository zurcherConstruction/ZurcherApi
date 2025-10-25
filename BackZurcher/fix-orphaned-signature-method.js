/**
 * 🔧 SCRIPT DE LIMPIEZA: Corregir signatureMethod huérfanos
 * 
 * Este script encuentra y corrige budgets que tienen:
 * - signatureMethod: 'signnow' 
 * - PERO NO tienen signNowDocumentId
 * 
 * Esto ocurría cuando el envío a SignNow fallaba DESPUÉS de actualizar
 * el signatureMethod en la base de datos.
 * 
 * USO:
 * - node fix-orphaned-signature-method.js --dry-run   (Solo muestra los afectados)
 * - node fix-orphaned-signature-method.js --fix       (Corrige los registros)
 */

const { Budget } = require('./src/data/models');
const sequelize = require('./src/data/index');

const isDryRun = process.argv.includes('--dry-run');
const shouldFix = process.argv.includes('--fix');

async function findOrphanedSignatureMethods() {
  console.log('\n🔍 === BUSCANDO BUDGETS CON signatureMethod HUÉRFANO ===\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos exitosa\n');

    // Buscar budgets con signatureMethod='signnow' pero sin signNowDocumentId
    const orphanedBudgets = await Budget.findAll({
      where: {
        signatureMethod: 'signnow',
        signNowDocumentId: null
      },
      attributes: ['idBudget', 'status', 'signatureMethod', 'signNowDocumentId', 'sentForSignatureAt', 'propertyAddress', 'totalPrice', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 RESULTADOS: Encontrados ${orphanedBudgets.length} budgets con signatureMethod huérfano\n`);

    if (orphanedBudgets.length === 0) {
      console.log('✅ No hay budgets con signatureMethod huérfano. Todo está correcto.\n');
      return [];
    }

    console.log('📋 LISTADO DE BUDGETS AFECTADOS:\n');
    console.log('┌─────────┬─────────────────┬────────────────┬──────────────────────┬────────────────────┬──────────────┐');
    console.log('│ Budget  │ Status          │ SignatureMethod│ SignNowDocumentId    │ Property           │ Total        │');
    console.log('├─────────┼─────────────────┼────────────────┼──────────────────────┼────────────────────┼──────────────┤');

    orphanedBudgets.forEach(budget => {
      const budgetData = budget.toJSON();
      const id = String(budgetData.idBudget).padEnd(7);
      const status = String(budgetData.status || 'N/A').padEnd(15);
      const sigMethod = String(budgetData.signatureMethod || 'N/A').padEnd(14);
      const docId = String(budgetData.signNowDocumentId || 'NULL').padEnd(20);
      const address = String(budgetData.propertyAddress || 'N/A').substring(0, 18).padEnd(18);
      const total = `$${parseFloat(budgetData.totalPrice || 0).toFixed(2)}`.padEnd(12);

      console.log(`│ ${id} │ ${status} │ ${sigMethod} │ ${docId} │ ${address} │ ${total} │`);
    });

    console.log('└─────────┴─────────────────┴────────────────┴──────────────────────┴────────────────────┴──────────────┘\n');

    return orphanedBudgets;

  } catch (error) {
    console.error('❌ Error al buscar budgets:', error);
    throw error;
  }
}

async function fixOrphanedSignatureMethods(budgets) {
  console.log('\n🔧 === INICIANDO CORRECCIÓN DE BUDGETS ===\n');

  let successCount = 0;
  let errorCount = 0;

  for (const budget of budgets) {
    try {
      const budgetData = budget.toJSON();
      
      // Determinar el nuevo estado apropiado
      let newStatus = budgetData.status;
      
      // Si el status es 'sent_for_signature' y no hay documento, volver a 'send' o 'pending'
      if (budgetData.status === 'sent_for_signature') {
        newStatus = 'send'; // Volver a 'send' para que se pueda reenviar
        console.log(`📝 Budget #${budgetData.idBudget}: Cambiando status de 'sent_for_signature' a 'send'`);
      }

      await budget.update({
        signatureMethod: 'none',
        status: newStatus,
        sentForSignatureAt: null
      });

      console.log(`✅ Budget #${budgetData.idBudget} corregido: signatureMethod='none', status='${newStatus}'`);
      successCount++;

    } catch (error) {
      console.error(`❌ Error al corregir Budget #${budget.idBudget}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 === RESUMEN DE CORRECCIÓN ===');
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`📋 Total procesados: ${budgets.length}\n`);
}

async function main() {
  if (!isDryRun && !shouldFix) {
    console.log('\n⚠️  MODO DE USO:');
    console.log('   node fix-orphaned-signature-method.js --dry-run   (Solo muestra los afectados)');
    console.log('   node fix-orphaned-signature-method.js --fix       (Corrige los registros)\n');
    process.exit(0);
  }

  try {
    const orphanedBudgets = await findOrphanedSignatureMethods();

    if (isDryRun) {
      console.log('ℹ️  MODO DRY-RUN: No se realizaron cambios en la base de datos.');
      console.log('   Ejecuta con --fix para corregir estos registros.\n');
    }

    if (shouldFix && orphanedBudgets.length > 0) {
      console.log('⚠️  ADVERTENCIA: Vas a modificar ' + orphanedBudgets.length + ' registro(s) en la base de datos.');
      console.log('   Esto establecerá signatureMethod=\'none\' y ajustará el status si es necesario.\n');
      
      // Esperar 3 segundos para dar tiempo a cancelar
      console.log('⏳ Iniciando en 3 segundos... (Ctrl+C para cancelar)');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await fixOrphanedSignatureMethods(orphanedBudgets);
      
      console.log('✅ Corrección completada exitosamente.\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión a base de datos cerrada.\n');
  }
}

main();
