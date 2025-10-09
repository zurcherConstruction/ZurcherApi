const { Budget } = require('./src/data');

(async () => {
  try {
    console.log('🔍 Verificando budgets con external referrals...\n');

    // Buscar budgets con leadSource = 'external_referral'
    const externalReferralBudgets = await Budget.findAll({
      where: {
        leadSource: 'external_referral'
      },
      attributes: [
        'idBudget',
        'propertyAddress',
        'leadSource',
        'externalReferralName',
        'externalReferralEmail',
        'externalReferralCompany',
        'commissionAmount',
        'salesCommissionAmount',
        'commissionPaid',
        'status',
        'date'
      ]
    });

    if (externalReferralBudgets.length === 0) {
      console.log('❌ No se encontraron budgets con leadSource = "external_referral"');
      console.log('\n💡 Posibles razones:');
      console.log('   1. No has creado ningún budget con External Referral todavía');
      console.log('   2. Los budgets fueron creados antes de agregar esta funcionalidad');
      console.log('   3. Hay un error en el formulario de creación\n');
    } else {
      console.log(`✅ Encontrados ${externalReferralBudgets.length} budgets con external referrals:\n`);
      externalReferralBudgets.forEach(budget => {
        console.log(`Budget #${budget.idBudget}`);
        console.log(`  Propiedad: ${budget.propertyAddress}`);
        console.log(`  Referido: ${budget.externalReferralName || 'N/A'}`);
        console.log(`  Email: ${budget.externalReferralEmail || 'N/A'}`);
        console.log(`  Empresa: ${budget.externalReferralCompany || 'N/A'}`);
        console.log(`  Comisión: $${budget.commissionAmount || 0}`);
        console.log(`  Sales Commission: $${budget.salesCommissionAmount || 0}`);
        console.log(`  Pagada: ${budget.commissionPaid ? 'Sí' : 'No'}`);
        console.log(`  Estado: ${budget.status}`);
        console.log(`  Fecha: ${budget.date}`);
        console.log('---');
      });
    }

    // También verificar budgets con sales_rep para comparar
    console.log('\n📊 Para comparación - Budgets con sales_rep:');
    const salesRepBudgets = await Budget.findAll({
      where: {
        leadSource: 'sales_rep'
      },
      attributes: [
        'idBudget',
        'propertyAddress',
        'commissionAmount',
        'salesCommissionAmount'
      ],
      limit: 3
    });

    salesRepBudgets.forEach(budget => {
      console.log(`Budget #${budget.idBudget}: commissionAmount=$${budget.commissionAmount}, salesCommissionAmount=$${budget.salesCommissionAmount}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
