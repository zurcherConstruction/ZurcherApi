const { sequelize, Work } = require('./src/data');

async function analyzeWorksStatus() {
  try {
    console.log('🔍 Conectando a la base de datos...\n');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Total de works
    const totalWorks = await Work.count();
    console.log('📊 TOTAL DE WORKS EN LA BASE DE DATOS:', totalWorks);
    console.log('='.repeat(60));

    // 2. Works por estado
    console.log('\n📋 WORKS POR ESTADO:\n');
    const worksByStatus = await Work.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('idWork')), 'count']
      ],
      group: ['status'],
      order: [[sequelize.fn('COUNT', sequelize.col('idWork')), 'DESC']],
      raw: true
    });

    let totalCounted = 0;
    worksByStatus.forEach(item => {
      console.log(`   ${item.status.padEnd(25)} → ${item.count} works`);
      totalCounted += parseInt(item.count);
    });
    console.log('   ' + '-'.repeat(50));
    console.log(`   TOTAL VERIFICADO:          → ${totalCounted} works\n`);

    // 3. Works legacy vs no legacy
    console.log('🏷️  WORKS POR TIPO:\n');
    const legacyCount = await Work.count({ where: { isLegacy: true } });
    const nonLegacyCount = await Work.count({ where: { isLegacy: false } });
    const nullLegacy = await Work.count({ where: { isLegacy: null } });
    
    console.log(`   Legacy (isLegacy = true):     ${legacyCount}`);
    console.log(`   No Legacy (isLegacy = false): ${nonLegacyCount}`);
    console.log(`   Sin definir (isLegacy = null): ${nullLegacy}\n`);

    // 4. Works "en progreso" detallados
    console.log('🚧 WORKS EN ESTADO "inProgress":\n');
    const inProgressWorks = await Work.findAll({
      where: { status: 'inProgress' },
      attributes: ['idWork', 'propertyAddress', 'status', 'isLegacy', 'createdAt'],
      order: [['createdAt', 'DESC']],
      raw: true
    });

    if (inProgressWorks.length > 0) {
      console.log(`   Total: ${inProgressWorks.length} works\n`);
      inProgressWorks.forEach((work, index) => {
        console.log(`   ${index + 1}. ID: ${work.idWork}`);
        console.log(`      Address: ${work.propertyAddress || 'N/A'}`);
        console.log(`      Legacy: ${work.isLegacy}`);
        console.log(`      Creado: ${work.createdAt}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No hay works en estado "inProgress"\n');
    }

    // 5. Works por staff asignado (top 10)
    console.log('👥 TOP 10 STAFF CON MÁS WORKS ASIGNADOS:\n');
    const worksByStaff = await Work.findAll({
      attributes: [
        'staffId',
        [sequelize.fn('COUNT', sequelize.col('idWork')), 'count']
      ],
      group: ['staffId'],
      order: [[sequelize.fn('COUNT', sequelize.col('idWork')), 'DESC']],
      limit: 10,
      raw: true
    });

    worksByStaff.forEach((item, index) => {
      console.log(`   ${index + 1}. Staff ID: ${item.staffId || 'SIN ASIGNAR'} → ${item.count} works`);
    });

    // 6. Works sin dirección
    console.log('\n⚠️  WORKS SIN DIRECCIÓN:\n');
    const worksNoAddress = await Work.count({
      where: {
        propertyAddress: [null, '']
      }
    });
    console.log(`   Total: ${worksNoAddress} works\n`);

    // 7. Works creados en los últimos 30 días
    console.log('📅 WORKS CREADOS EN LOS ÚLTIMOS 30 DÍAS:\n');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWorks = await Work.findAll({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: thirtyDaysAgo
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('idWork')), 'count']
      ],
      group: ['status'],
      order: [[sequelize.fn('COUNT', sequelize.col('idWork')), 'DESC']],
      raw: true
    });

    if (recentWorks.length > 0) {
      recentWorks.forEach(item => {
        console.log(`   ${item.status.padEnd(25)} → ${item.count} works`);
      });
    } else {
      console.log('   ❌ No hay works creados en los últimos 30 días');
    }

    // 8. Works sin staff asignado
    console.log('\n⚠️  WORKS SIN STAFF ASIGNADO:\n');
    const worksNoStaff = await Work.findAll({
      where: { staffId: null },
      attributes: ['idWork', 'propertyAddress', 'status', 'createdAt'],
      raw: true
    });

    if (worksNoStaff.length > 0) {
      console.log(`   Total: ${worksNoStaff.length} works sin asignar\n`);
      worksNoStaff.forEach((work, index) => {
        console.log(`   ${index + 1}. ID: ${work.idWork}`);
        console.log(`      Address: ${work.propertyAddress || 'N/A'}`);
        console.log(`      Estado: ${work.status}`);
        console.log('');
      });
    } else {
      console.log('   ✅ Todos los works tienen staff asignado\n');
    }

    // 9. Verificar staff de works "inProgress"
    console.log('\n📋 STAFF ASIGNADO A WORKS "inProgress":\n');
    const inProgressWithStaff = await Work.findAll({
      where: { status: 'inProgress' },
      attributes: ['idWork', 'propertyAddress', 'staffId'],
      raw: true
    });

    inProgressWithStaff.forEach((work, index) => {
      console.log(`   ${index + 1}. ${work.propertyAddress}`);
      console.log(`      Staff: ${work.staffId || '❌ SIN ASIGNAR'}`);
      console.log('');
    });

    console.log('\n' + '='.repeat(60));
    console.log('✨ Análisis completado\n');

    await sequelize.close();
    console.log('🔌 Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzeWorksStatus();
