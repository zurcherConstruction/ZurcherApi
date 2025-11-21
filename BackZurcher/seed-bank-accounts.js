/**
 * Script para inicializar las cuentas bancarias del sistema
 * 
 * Crea las 3 cuentas principales con balance inicial en $0.00:
 * - Chase Bank (cuenta corriente)
 * - Proyecto Septic BOFA (cuenta corriente)
 * - Caja Chica (efectivo)
 * 
 * EJECUTAR: node seed-bank-accounts.js
 */

const { BankAccount, sequelize } = require('./src/data');

const initialAccounts = [
  {
    accountName: 'Chase Bank',
    accountType: 'checking',
    currentBalance: 0.00,
    currency: 'USD',
    isActive: true,
    bankName: 'Chase',
    accountNumber: null,
    notes: 'Cuenta bancaria principal de Chase Bank'
  },
  {
    accountName: 'Proyecto Septic BOFA',
    accountType: 'checking',
    currentBalance: 0.00,
    currency: 'USD',
    isActive: true,
    bankName: 'Bank of America',
    accountNumber: null,
    notes: 'Cuenta para proyectos de sistemas sépticos - BOFA'
  },
  {
    accountName: 'Caja Chica',
    accountType: 'cash',
    currentBalance: 0.00,
    currency: 'USD',
    isActive: true,
    bankName: null,
    accountNumber: null,
    notes: 'Efectivo disponible para gastos menores y pagos inmediatos'
  }
];

const seedBankAccounts = async () => {
  try {
    console.log('🏦 Iniciando seed de cuentas bancarias...\n');

    // Verificar conexión a base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida\n');

    // Verificar si ya existen cuentas
    const existingCount = await BankAccount.count();
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} cuenta(s) en la base de datos.`);
      console.log('¿Desea continuar y crear las cuentas faltantes? (ya existentes se omitirán)\n');
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const accountData of initialAccounts) {
      // Verificar si la cuenta ya existe
      const existing = await BankAccount.findOne({
        where: { accountName: accountData.accountName }
      });

      if (existing) {
        console.log(`⏭️  Omitida: ${accountData.accountName} (ya existe)`);
        skippedCount++;
        continue;
      }

      // Crear cuenta
      const account = await BankAccount.create(accountData);
      console.log(`✅ Creada: ${account.accountName} | Balance: ${account.getFormattedBalance()}`);
      createdCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Resumen:`);
    console.log(`   Cuentas creadas: ${createdCount}`);
    console.log(`   Cuentas omitidas: ${skippedCount}`);
    console.log(`   Total en sistema: ${await BankAccount.count()}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Seed completado exitosamente\n');

    // Mostrar todas las cuentas
    const allAccounts = await BankAccount.findAll({
      attributes: ['accountName', 'accountType', 'currentBalance', 'isActive'],
      order: [['accountName', 'ASC']]
    });

    console.log('📋 Cuentas bancarias en el sistema:\n');
    allAccounts.forEach((acc) => {
      const status = acc.isActive ? '✅' : '❌';
      console.log(`   ${status} ${acc.accountName.padEnd(30)} | ${acc.accountType.padEnd(10)} | ${acc.getFormattedBalance()}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar seed
seedBankAccounts();
