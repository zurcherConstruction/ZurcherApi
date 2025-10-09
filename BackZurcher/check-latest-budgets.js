const { Budget } = require('./src/data');

(async () => {
  try {
    console.log('🔍 Verificando últimos budgets creados...\n');

    // Buscar los últimos 5 budgets ordenados por fecha de creación
    const latestBudgets = await Budget.findAll({
      attributes: [
        'idBudget',
        'propertyAddress',
        'leadSource',
        'externalReferralName',
        'externalReferralEmail',
        'externalReferralCompany',
        'commissionAmount',
        'salesCommissionAmount',
        'status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log(`✅ Últimos ${latestBudgets.length} budgets:\n`);
    
    latestBudgets.forEach((budget, index) => {
      console.log(`${index + 1}. Budget #${budget.idBudget}`);
      console.log(`   Propiedad: ${budget.propertyAddress || 'N/A'}`);
      console.log(`   Lead Source: ${budget.leadSource || 'N/A'}`);
      
      if (budget.leadSource === 'external_referral') {
        console.log(`   ✨ EXTERNAL REFERRAL:`);
        console.log(`      - Nombre: ${budget.externalReferralName || 'N/A'}`);
        console.log(`      - Email: ${budget.externalReferralEmail || 'N/A'}`);
        console.log(`      - Empresa: ${budget.externalReferralCompany || 'N/A'}`);
        console.log(`      - Comisión: $${budget.commissionAmount || 0}`);
      } else if (budget.leadSource === 'sales_rep') {
        console.log(`   👤 SALES REP: Comisión $${budget.commissionAmount || 0}`);
      } else {
        console.log(`   📝 Otros: ${budget.leadSource}`);
      }
      
      console.log(`   Comisión Amount: $${budget.commissionAmount || 0}`);
      console.log(`   Sales Commission: $${budget.salesCommissionAmount || 0}`);
      console.log(`   Estado: ${budget.status}`);
      console.log(`   Creado: ${budget.createdAt}`);
      console.log('---');
    });

    // Buscar específicamente budgets con leadSource = 'external_referral'
    console.log('\n🔍 Buscando budgets con leadSource = "external_referral"...\n');
    
    const externalReferralBudgets = await Budget.findAll({
      where: {
        leadSource: 'external_referral'
      },
      attributes: [
        'idBudget',
        'propertyAddress',
        'externalReferralName',
        'commissionAmount',
        'status',
        'createdAt'
      ]
    });

    if (externalReferralBudgets.length === 0) {
      console.log('❌ No se encontraron budgets con leadSource = "external_referral"');
      console.log('\n💡 Esto significa que:');
      console.log('   1. El budget no se guardó (hubo error en el backend)');
      console.log('   2. Se guardó con otro leadSource');
      console.log('   3. commissionAmount quedó en 0 o null');
    } else {
      console.log(`✅ Encontrados ${externalReferralBudgets.length} budgets con external referral:`);
      externalReferralBudgets.forEach(b => {
        console.log(`   - Budget #${b.idBudget}: ${b.externalReferralName}, $${b.commissionAmount}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
