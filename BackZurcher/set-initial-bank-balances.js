/**
 * Script para establecer los BALANCES REALES INICIALES de las cuentas bancarias
 * 
 * ⚠️ IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ en producción
 * DESPUÉS de crear las cuentas con seed-bank-accounts.js
 * 
 * EJECUTAR: node set-initial-bank-balances.js
 */

const { conn } = require('./src/data');

/**
 * ⚠️ BALANCES REALES PROPORCIONADOS POR EL CLIENTE ⚠️
 * Datos recibidos el 20 de noviembre de 2025
 */
const REAL_BALANCES = [
  {
    accountName: 'Chase Bank',
    realBalance: 7899.86,
    description: 'Balance inicial registrado al implementar el sistema de tracking'
  },
  {
    accountName: 'Cap Trabajos Septic',
    realBalance: 0.00,  // No mencionado por el cliente - se asume $0
    description: 'Balance inicial registrado al implementar el sistema de tracking'
  },
  {
    accountName: 'Capital Proyectos Septic',
    realBalance: 2965.12,
    description: 'Balance inicial registrado al implementar el sistema de tracking'
  },
  {
    accountName: 'Caja Chica',
    realBalance: 0.00,  // Cliente confirmó: efectivo = 0
    description: 'Efectivo inicial contado al implementar el sistema de tracking'
  }
];

const setInitialBalances = async () => {
  try {
    console.log('💰 Estableciendo balances iniciales reales...\n');
    console.log('⚠️  IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ\n');

    await conn.authenticate();
    console.log('✅ Conexión establecida\n');

    // Verificar que existan cuentas
    const [accountsCheck] = await conn.query(`
      SELECT COUNT(*) as count FROM "BankAccounts"
    `);
    
    if (parseInt(accountsCheck[0].count) === 0) {
      throw new Error('❌ No existen cuentas. Ejecuta primero: node migrations/20251121-seed-bank-accounts.js');
    }

    // Verificar ejecución previa
    const [existingCheck] = await conn.query(`
      SELECT COUNT(*) as count FROM "BankTransactions" 
      WHERE "transactionType" = 'deposit' AND "description" LIKE 'Balance inicial%'
    `);

    if (parseInt(existingCheck[0].count) > 0) {
      console.log(`⚠️  ADVERTENCIA: ${existingCheck[0].count} transacciones iniciales previas encontradas`);
      console.log('⚠️  Si ya ejecutaste este script, presiona Ctrl+C para cancelar\n');
      console.log('Esperando 5 segundos...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('📋 Balances a establecer:\n');
    REAL_BALANCES.forEach(({ accountName, realBalance }) => {
      console.log(`   ${accountName.padEnd(30)} → $${realBalance.toFixed(2)}`);
    });
    console.log('\n' + '='.repeat(60) + '\n');

    let successCount = 0;
    let totalAmount = 0;

    for (const config of REAL_BALANCES) {
      const { accountName, realBalance, description } = config;

      // Buscar cuenta
      const [accounts] = await conn.query(`
        SELECT * FROM "BankAccounts" 
        WHERE "accountName" = '${accountName}'
        LIMIT 1
      `);

      if (accounts.length === 0) {
        console.log(`⚠️  Cuenta no encontrada: ${accountName}`);
        continue;
      }

      const account = accounts[0];
      const previousBalance = parseFloat(account.currentBalance);

      // Actualizar balance
      await conn.query(`
        UPDATE "BankAccounts" 
        SET "currentBalance" = ${realBalance}, "updatedAt" = NOW()
        WHERE "idBankAccount" = '${account.idBankAccount}'
      `);

      // Crear transacción inicial como 'deposit'
      const transactionDescription = `${description} | Previo: $${previousBalance.toFixed(2)}`;
      const balanceAfter = realBalance; // El balance después de establecer el inicial

      await conn.query(`
        INSERT INTO "BankTransactions" (
          "idTransaction", "bankAccountId", "transactionType", "amount", 
          "date", "description", "category", "balanceAfter",
          "notes", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), '${account.idBankAccount}', 'deposit', ${realBalance}, 
          CURRENT_DATE, '${transactionDescription.replace(/'/g, "''")}', 'manual', ${balanceAfter},
          'Balance inicial del sistema', NOW(), NOW()
        )
      `);

      console.log(`✅ ${accountName}`);
      console.log(`   Previo:  $${previousBalance.toFixed(2)}`);
      console.log(`   Nuevo:   $${realBalance.toFixed(2)}`);
      console.log('');

      successCount++;
      totalAmount += realBalance;
    }

    console.log('='.repeat(60));
    console.log('📊 Resumen:\n');
    console.log(`   ✅ Cuentas actualizadas: ${successCount}`);
    console.log(`   💰 Total en cuentas:     $${totalAmount.toFixed(2)}`);
    console.log('='.repeat(60) + '\n');

    // Mostrar estado final
    const [allAccounts] = await conn.query(`
      SELECT "accountName", "currentBalance", "isActive"
      FROM "BankAccounts"
      ORDER BY "accountName" ASC
    `);

    console.log('📋 Estado final:\n');
    let grandTotal = 0;
    allAccounts.forEach((acc) => {
      const balance = parseFloat(acc.currentBalance);
      grandTotal += balance;
      const status = acc.isActive ? '✅' : '❌';
      console.log(`   ${status} ${acc.accountName.padEnd(30)} | $${balance.toFixed(2).padStart(12)}`);
    });
    console.log('   ' + '-'.repeat(48));
    console.log(`   ${'TOTAL'.padEnd(30)} | $${grandTotal.toFixed(2).padStart(12)}`);
    console.log('');

    console.log('✅ Sistema listo para producción\n');
    console.log('📌 Próximos pasos:');
    console.log('   1. Verificar balances con estados de cuenta reales');
    console.log('   2. NO ejecutar este script nuevamente\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await conn.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

setInitialBalances();
