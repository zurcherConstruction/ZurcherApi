const { sequelize, Work } = require('./src/data');

async function testSearch() {
  try {
    console.log('🔍 Conectando a la base de datos...\n');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    const searchTerm = '9005 penny';
    
    console.log(`🔎 Buscando works con: "${searchTerm}"\n`);
    console.log('='.repeat(80));

    // Simular búsqueda del frontend
    const allWorks = await Work.findAll({
      attributes: ['idWork', 'propertyAddress', 'status', 'isLegacy'],
      order: [['createdAt', 'DESC']],
      raw: true
    });

    console.log(`\n📊 Total de works en DB: ${allWorks.length}\n`);

    // Filtrar igual que en ProgressTracker
    const filtered = allWorks.filter((work) =>
      work.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(`\n✅ Works que coinciden con "${searchTerm}":\n`);
    console.log('─'.repeat(80));

    if (filtered.length > 0) {
      filtered.forEach((work, index) => {
        const legacy = work.isLegacy ? '🏷️ Legacy' : '';
        console.log(`${(index + 1).toString().padStart(3)}. ${work.propertyAddress}`);
        console.log(`     ID: ${work.idWork}`);
        console.log(`     Estado: ${work.status} ${legacy}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No se encontraron works\n');
      
      // Buscar similares
      console.log('\n🔍 Buscando works similares (que contengan "penny" o "9005"):\n');
      const similar = allWorks.filter((work) =>
        work.propertyAddress?.toLowerCase().includes('penny') ||
        work.propertyAddress?.toLowerCase().includes('9005')
      );
      
      if (similar.length > 0) {
        similar.forEach((work) => {
          console.log(`   - ${work.propertyAddress} (${work.status})`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ Búsqueda completada\n');

    await sequelize.close();
    console.log('🔌 Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testSearch();
