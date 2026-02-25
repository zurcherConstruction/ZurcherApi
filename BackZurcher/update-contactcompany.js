/**
 * 📝 ACTUALIZACIÓN DE CONTACT_COMPANY
 * 
 * Este script lee el archivo missing-contactcompany-report.json
 * y actualiza los budgets con el contactCompany especificado
 * 
 * INSTRUCCIONES:
 * 1. Ejecutar primero: node analyze-missing-contactcompany.js
 * 2. Editar el archivo missing-contactcompany-report.json
 * 3. Completar el campo "suggestedCompany" para cada entrada
 * 4. Ejecutar este script: node update-contactcompany.js
 */

require('dotenv').config();
const { Budget, sequelize } = require('./src/data');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function updateContactCompany() {
  try {
    // 1. Leer archivo de reporte
    if (!fs.existsSync('./missing-contactcompany-report.json')) {
      console.error('❌ ERROR: Archivo missing-contactcompany-report.json no encontrado');
      console.log('📋 Primero ejecuta: node analyze-missing-contactcompany.js');
      return;
    }

    const reportData = JSON.parse(fs.readFileSync('./missing-contactcompany-report.json', 'utf8'));
    
    console.log('📋 Reporte cargado exitosamente');
    console.log(`📊 Total de clientes a procesar: ${reportData.length}\n`);

    // 2. Filtrar solo los que tienen suggestedCompany definido
    const toUpdate = reportData.filter(item => item.suggestedCompany && item.suggestedCompany.trim() !== '');
    const needsReview = reportData.filter(item => !item.suggestedCompany || item.suggestedCompany.trim() === '');

    console.log(`✅ Con contactCompany definido: ${toUpdate.length}`);
    console.log(`⚠️  Sin contactCompany (se omitirán): ${needsReview.length}\n`);

    if (needsReview.length > 0) {
      console.log('⚠️  CLIENTES SIN EMPRESA DEFINIDA (necesitan revisión manual):');
      needsReview.forEach(item => {
        console.log(`   - ${item.email} (${item.name}) - ${item.budgetCount} budgets`);
      });
      console.log('');
    }

    if (toUpdate.length === 0) {
      console.log('ℹ️  No hay actualizaciones para realizar');
      return;
    }

    // 3. Mostrar vista previa
    console.log('📝 VISTA PREVIA DE ACTUALIZACIONES:');
    console.log('='.repeat(80));
    toUpdate.forEach((item, index) => {
      console.log(`${index + 1}. ${item.email} (${item.name})`);
      console.log(`   Empresa: "${item.suggestedCompany}"`);
      console.log(`   Budgets a actualizar: ${item.budgetCount} (IDs: ${item.budgetIds.slice(0, 5).join(', ')}${item.budgetIds.length > 5 ? '...' : ''})`);
      console.log('');
    });
    console.log('='.repeat(80));
    console.log('');

    // 4. Confirmar con el usuario
    const confirm = await question('¿Proceder con las actualizaciones? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Actualizaciones canceladas por el usuario');
      return;
    }

    // 5. Ejecutar actualizaciones
    console.log('\n🔄 Iniciando actualizaciones...\n');

    let totalUpdated = 0;
    const results = [];

    for (const item of toUpdate) {
      try {
        const [updatedCount] = await Budget.update(
          { contactCompany: item.suggestedCompany },
          { 
            where: { 
              idBudget: item.budgetIds 
            } 
          }
        );

        totalUpdated += updatedCount;
        results.push({
          email: item.email,
          company: item.suggestedCompany,
          updated: updatedCount,
          expected: item.budgetCount,
          success: updatedCount === item.budgetCount
        });

        console.log(`✅ ${item.email} → "${item.suggestedCompany}" (${updatedCount}/${item.budgetCount} budgets)`);

      } catch (error) {
        console.error(`❌ Error actualizando ${item.email}:`, error.message);
        results.push({
          email: item.email,
          company: item.suggestedCompany,
          updated: 0,
          expected: item.budgetCount,
          success: false,
          error: error.message
        });
      }
    }

    // 6. Resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE ACTUALIZACIONES');
    console.log('='.repeat(80));
    console.log(`Total de budgets actualizados: ${totalUpdated}`);
    console.log(`Clientes procesados exitosamente: ${results.filter(r => r.success).length}/${results.length}`);
    
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log(`\n⚠️  ERRORES (${failed.length}):`);
      failed.forEach(f => {
        console.log(`   - ${f.email}: ${f.error || 'No se actualizó la cantidad esperada'}`);
      });
    }

    // 7. Guardar log de resultados
    fs.writeFileSync(
      `./contactcompany-update-log-${Date.now()}.json`,
      JSON.stringify(results, null, 2)
    );
    console.log('\n✅ Log guardado exitosamente');

  } catch (error) {
    console.error('❌ Error en actualización:', error);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Ejecutar
updateContactCompany();
