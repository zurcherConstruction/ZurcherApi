/**
 * Script: Debug del cambio de estado al crear Materiales Iniciales
 */

const { Expense, Work, sequelize } = require('./src/data');

async function debugMaterialesIniciales() {
  console.log('\n🔍 Debugeando cambio de estado con Materiales Iniciales...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Buscar los expenses de Materiales Iniciales recientes
    const materialesExpenses = await Expense.findAll({
      where: {
        typeExpense: 'Materiales Iniciales'
      },
      order: [['createdAt', 'DESC']],
      limit: 3,
      include: [{
        model: Work,
        as: 'work',
        attributes: ['idWork', 'propertyAddress', 'status', 'createdAt', 'updatedAt']
      }]
    });

    console.log(`📋 Encontrados ${materialesExpenses.length} gastos de Materiales Iniciales:\n`);

    materialesExpenses.forEach((exp, i) => {
      console.log(`${i + 1}. Expense ID: ${exp.idExpense.slice(0, 8)}...`);
      console.log(`   Monto: $${exp.amount}`);
      console.log(`   Fecha: ${exp.date}`);
      console.log(`   Creado: ${exp.createdAt}`);
      
      if (exp.work) {
        console.log(`   Work ID: ${exp.work.idWork.slice(0, 8)}...`);
        console.log(`   Work Status: ${exp.work.status}`);
        console.log(`   Work Dirección: ${exp.work.propertyAddress}`);
        console.log(`   Work Actualizado: ${exp.work.updatedAt}`);
      } else {
        console.log(`   ⚠️  Sin work asociado`);
      }
      console.log('');
    });

    // Buscar el work específico que estás probando
    const testWorkId = 'ed90f85f-5f11-4238-a63e-3968981246cd';
    const testWork = await Work.findByPk(testWorkId);

    if (testWork) {
      console.log('📌 Work que estás probando:');
      console.log(`   ID: ${testWork.idWork}`);
      console.log(`   Dirección: ${testWork.propertyAddress}`);
      console.log(`   Status ACTUAL: ${testWork.status}`);
      console.log(`   Última actualización: ${testWork.updatedAt}`);
      console.log('');

      // Verificar la condición del código
      console.log('🔍 Verificación de la condición del código:');
      console.log(`   if (work.status === 'permitApproved') {`);
      console.log(`   Status actual: '${testWork.status}'`);
      console.log(`   ¿Cumple condición? ${testWork.status === 'permitApproved' ? '✅ SÍ' : '❌ NO'}`);
      console.log('');

      if (testWork.status !== 'permitApproved') {
        console.log(`💡 El work NO está en 'permitApproved', está en '${testWork.status}'`);
        console.log(`   Por eso no se cambió a 'inProgress'`);
        console.log('');
        console.log('📚 Posibles estados del trabajo:');
        console.log('   - assigned: Asignado');
        console.log('   - permitApproved: Permiso aprobado (estado que esperamos)');
        console.log('   - inProgress: En progreso');
        console.log('   - firstInspectionPending: Inspección inicial pendiente');
        console.log('   etc...');
      }
    } else {
      console.log('❌ Work de prueba no encontrado');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

debugMaterialesIniciales();
