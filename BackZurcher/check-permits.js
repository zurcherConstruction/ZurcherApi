const { Permit } = require('./src/data');

(async () => {
  try {
    // Contar permisos con permitNumber vacío
    const emptyPermits = await Permit.findAll({ 
      where: { permitNumber: '' },
      attributes: ['idPermit', 'permitNumber']
    });
    console.log(`\n📊 Permisos con permitNumber vacío: ${emptyPermits.length}`);
    if (emptyPermits.length > 0) {
      console.log('\nPrimeros 10:');
      emptyPermits.slice(0, 10).forEach(p => {
        console.log(`  - ID: ${p.idPermit}`);
      });
    }

    // Buscar duplicados
    const allPermits = await Permit.findAll({ 
      attributes: ['idPermit', 'permitNumber'] 
    });
    
    const permitNumbers = {};
    allPermits.forEach(p => {
      const num = p.permitNumber || '(vacío)';
      if (!permitNumbers[num]) permitNumbers[num] = [];
      permitNumbers[num].push(p.idPermit);
    });

    const duplicates = Object.entries(permitNumbers).filter(([k, v]) => v.length > 1);
    
    console.log(`\n🔍 PermitNumbers duplicados: ${duplicates.length}`);
    duplicates.forEach(([num, ids]) => {
      console.log(`  "${num}": ${ids.length} veces (IDs: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
