const { Permit, Budget } = require('./src/data');

(async () => {
  try {
    console.log('\n🔍 Verificando constraints únicos...\n');

    // 1. Verificar Permits.permitNumber
    console.log('1️⃣ Verificando Permits.permitNumber:');
    const permits = await Permit.findAll({ attributes: ['idPermit', 'permitNumber'] });
    const permitNumbers = {};
    permits.forEach(p => {
      const num = p.permitNumber;
      permitNumbers[num] = (permitNumbers[num] || 0) + 1;
    });
    const duplicatePermitNumbers = Object.entries(permitNumbers).filter(([k, v]) => v > 1);
    
    if (duplicatePermitNumbers.length > 0) {
      console.log('   ❌ Aún hay duplicados:');
      duplicatePermitNumbers.forEach(([num, count]) => {
        console.log(`      - "${num}": ${count} veces`);
      });
    } else {
      console.log('   ✅ No hay duplicados en permitNumber');
    }

    // Verificar si hay valores temporales
    const tempPermits = permits.filter(p => p.permitNumber && p.permitNumber.startsWith('TEMP-'));
    if (tempPermits.length > 0) {
      console.log(`   ⚠️  ${tempPermits.length} permisos con valores temporales (TEMP-*)`);
      console.log('   ℹ️  Deberías actualizar estos manualmente con números reales');
      tempPermits.forEach(p => {
        console.log(`      - ID: ${p.idPermit}, Number: ${p.permitNumber}`);
      });
    }

    // 2. Verificar Budgets.propertyAddress
    console.log('\n2️⃣ Verificando Budgets.propertyAddress:');
    const budgets = await Budget.findAll({ attributes: ['idBudget', 'propertyAddress'] });
    const addresses = {};
    budgets.forEach(b => {
      const addr = b.propertyAddress;
      if (!addresses[addr]) addresses[addr] = [];
      addresses[addr].push(b.idBudget);
    });
    const duplicateAddresses = Object.entries(addresses).filter(([k, v]) => v.length > 1);
    
    if (duplicateAddresses.length > 0) {
      console.log('   ⚠️  Hay duplicados:');
      duplicateAddresses.slice(0, 5).forEach(([addr, ids]) => {
        console.log(`      - "${addr}": ${ids.length} veces (IDs: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''})`);
      });
    } else {
      console.log('   ✅ No hay duplicados en propertyAddress');
    }

    console.log('\n✅ Verificación completada\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
