/**
 * Script: Verificar status de un trabajo específico
 */

const { Work, sequelize } = require('./src/data');

async function checkWorkStatus() {
  const workId = 'ed90f85f-5f11-4238-a63e-3968981246cd'; // El ID del trabajo que estás viendo
  
  console.log('\n🔍 Verificando status del trabajo...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    const work = await Work.findByPk(workId, {
      attributes: ['idWork', 'propertyAddress', 'status', 'createdAt', 'updatedAt']
    });

    if (!work) {
      console.log('❌ Trabajo no encontrado');
      return;
    }

    console.log('📋 Información del trabajo:\n');
    console.log(`ID: ${work.idWork}`);
    console.log(`Dirección: ${work.propertyAddress}`);
    console.log(`STATUS ACTUAL: ${work.status}`);
    console.log(`Creado: ${work.createdAt}`);
    console.log(`Actualizado: ${work.updatedAt}`);
    console.log('\n');

    console.log('📌 Condiciones para ver el botón "PEDIR INSPECCIÓN":');
    console.log(`   ✓ canMarkInstalled = (status === 'inProgress')`);
    console.log(`   ✓ Status actual: '${work.status}'`);
    console.log(`   ${work.status === 'inProgress' ? '✅' : '❌'} Botón ${work.status === 'inProgress' ? 'VISIBLE' : 'OCULTO'}`);
    console.log('\n');

    if (work.status !== 'inProgress') {
      console.log('💡 El trabajo NO está en status "inProgress".');
      console.log('   Para ver el botón, el status debe ser exactamente: "inProgress"');
      console.log(`   Status actual: "${work.status}"\n`);
    } else {
      console.log('✅ El trabajo está en el status correcto para ver el botón\n');
    }

    // Mostrar todos los posibles statuses
    console.log('📚 Posibles statuses de un trabajo:');
    console.log('   - inProgress: En progreso (muestra botón PEDIR INSPECCIÓN)');
    console.log('   - firstInspectionPending: Inspección inicial pendiente');
    console.log('   - rejectedInspection: Rechazado en inspección inicial');
    console.log('   - coverPending: Pendiente de cubrir');
    console.log('   - finalInspectionPending: Inspección final pendiente');
    console.log('   - finalRejected: Rechazado en inspección final');
    console.log('   - covered: Cubierto');
    console.log('   - invoiceFinal: Factura final creada');
    console.log('   - paymentReceived: Pago recibido');
    console.log('   - maintenance: En mantenimiento');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Conexión cerrada\n');
    process.exit(0);
  }
}

checkWorkStatus();
