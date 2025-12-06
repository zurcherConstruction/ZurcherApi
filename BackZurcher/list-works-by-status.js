const { sequelize, Work } = require('./src/data');

async function listWorksByStatus() {
  try {
    console.log('🔍 Conectando a la base de datos...\n');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');
    console.log('='.repeat(80));

    // Obtener todos los estados únicos
    const allStatuses = await Work.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('status')), 'status']],
      order: [['status', 'ASC']],
      raw: true
    });

    const statuses = allStatuses.map(s => s.status);

    // Para cada estado, listar las direcciones
    for (const status of statuses) {
      const works = await Work.findAll({
        where: { status },
        attributes: ['propertyAddress', 'staffId', 'isLegacy'],
        order: [['createdAt', 'DESC']],
        raw: true
      });

      console.log(`\n📋 ${status.toUpperCase()} (${works.length} works)`);
      console.log('─'.repeat(80));

      if (works.length > 0) {
        works.forEach((work, index) => {
          const legacy = work.isLegacy ? '🏷️ Legacy' : '';
          const staff = work.staffId ? `👤 Staff: ${work.staffId.substring(0, 8)}...` : '⚠️ Sin staff';
          console.log(`${(index + 1).toString().padStart(3)}. ${work.propertyAddress} ${legacy} ${staff}`);
        });
      } else {
        console.log('   (vacío)');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ Listado completado\n');

    await sequelize.close();
    console.log('🔌 Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

listWorksByStatus();
