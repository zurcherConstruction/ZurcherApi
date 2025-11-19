/**
 * Script de prueba para Bank Transaction API
 * 
 * Prueba los endpoints de transacciones bancarias
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Debes reemplazar este token con uno válido de tu sistema
const AUTH_TOKEN = 'tu_token_aqui'; // 🔑 Reemplazar con token válido

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testBankTransactionEndpoints() {
  console.log('🧪 PRUEBAS DE ENDPOINTS - BANK TRANSACTIONS\n');
  console.log('=' .repeat(60));

  try {
    // Primero obtener cuentas disponibles
    const accountsResponse = await api.get('/bank-accounts');
    
    if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length < 2) {
      console.error('❌ Se necesitan al menos 2 cuentas para probar transferencias.');
      console.error('   Ejecuta el seed primero: node seed-bank-accounts.js');
      return;
    }

    const account1 = accountsResponse.data.accounts[0];
    const account2 = accountsResponse.data.accounts[1];
    
    console.log(`📋 Cuentas para pruebas:`);
    console.log(`   Cuenta 1: ${account1.accountName} (${account1.idBankAccount})`);
    console.log(`   Cuenta 2: ${account2.accountName} (${account2.idBankAccount})`);
    console.log(`   Balance inicial cuenta 1: ${account1.formattedBalance}`);
    console.log(`   Balance inicial cuenta 2: ${account2.formattedBalance}`);

    // 1. POST /bank-transactions/deposit - Crear depósito
    console.log('\n1️⃣ POST /bank-transactions/deposit - Registrar depósito');
    console.log('-'.repeat(60));
    const depositData = {
      bankAccountId: account1.idBankAccount,
      amount: 1000.00,
      description: 'Depósito de prueba',
      category: 'manual',
      notes: 'Prueba del sistema de cuentas bancarias'
    };
    
    const depositResponse = await api.post('/bank-transactions/deposit', depositData);
    console.log('✅ Status:', depositResponse.status);
    console.log('💰 Depósito:', depositResponse.data.transaction.formattedAmount);
    console.log('📊 Nuevo balance:', depositResponse.data.formattedBalance);
    console.log('🆔 ID transacción:', depositResponse.data.transaction.idTransaction);

    const depositId = depositResponse.data.transaction.idTransaction;

    // 2. POST /bank-transactions/withdrawal - Crear retiro
    console.log('\n2️⃣ POST /bank-transactions/withdrawal - Registrar retiro');
    console.log('-'.repeat(60));
    const withdrawalData = {
      bankAccountId: account1.idBankAccount,
      amount: 250.00,
      description: 'Retiro de prueba',
      category: 'manual',
      notes: 'Prueba de retiro'
    };
    
    const withdrawalResponse = await api.post('/bank-transactions/withdrawal', withdrawalData);
    console.log('✅ Status:', withdrawalResponse.status);
    console.log('💰 Retiro:', withdrawalResponse.data.transaction.formattedAmount);
    console.log('📊 Nuevo balance:', withdrawalResponse.data.formattedBalance);
    console.log('🆔 ID transacción:', withdrawalResponse.data.transaction.idTransaction);

    const withdrawalId = withdrawalResponse.data.transaction.idTransaction;

    // 3. POST /bank-transactions/transfer - Transferir entre cuentas
    console.log('\n3️⃣ POST /bank-transactions/transfer - Transferir entre cuentas');
    console.log('-'.repeat(60));
    const transferData = {
      fromAccountId: account1.idBankAccount,
      toAccountId: account2.idBankAccount,
      amount: 300.00,
      description: 'Transferencia de prueba',
      notes: 'Moviendo fondos entre cuentas'
    };
    
    const transferResponse = await api.post('/bank-transactions/transfer', transferData);
    console.log('✅ Status:', transferResponse.status);
    console.log('💸 Transferencia completada: $', transferResponse.data.transfer.amount);
    console.log('📤 Desde:', transferResponse.data.transfer.from.account);
    console.log('   Balance: $', transferResponse.data.transfer.from.oldBalance, '→ $', transferResponse.data.transfer.from.newBalance);
    console.log('📥 Hacia:', transferResponse.data.transfer.to.account);
    console.log('   Balance: $', transferResponse.data.transfer.to.oldBalance, '→ $', transferResponse.data.transfer.to.newBalance);

    // 4. GET /bank-transactions - Listar transacciones
    console.log('\n4️⃣ GET /bank-transactions - Listar todas las transacciones');
    console.log('-'.repeat(60));
    const transactionsResponse = await api.get('/bank-transactions', {
      params: {
        limit: 10,
        orderBy: 'date',
        orderDirection: 'DESC'
      }
    });
    console.log('✅ Status:', transactionsResponse.status);
    console.log('📊 Total transacciones:', transactionsResponse.data.count);
    console.log('📋 Mostrando:', transactionsResponse.data.transactions.length, 'transacciones');
    
    if (transactionsResponse.data.transactions.length > 0) {
      console.log('\n📋 Últimas transacciones:');
      transactionsResponse.data.transactions.slice(0, 5).forEach(t => {
        console.log(`   - ${t.date} | ${t.bankAccount.accountName} | ${t.transactionType} | ${t.formattedAmount} | ${t.description}`);
      });
    }

    // 5. GET /bank-transactions/:id - Detalle de transacción
    console.log('\n5️⃣ GET /bank-transactions/:id - Detalle de transacción');
    console.log('-'.repeat(60));
    const detailResponse = await api.get(`/bank-transactions/${depositId}`);
    console.log('✅ Status:', detailResponse.status);
    console.log('📋 Tipo:', detailResponse.data.transaction.transactionType);
    console.log('💰 Monto:', detailResponse.data.transaction.formattedAmount);
    console.log('📅 Fecha:', detailResponse.data.transaction.date);
    console.log('🏦 Cuenta:', detailResponse.data.transaction.bankAccount.accountName);
    console.log('📝 Descripción:', detailResponse.data.transaction.description);

    // 6. GET /bank-transactions con filtros
    console.log('\n6️⃣ GET /bank-transactions?bankAccountId - Filtrar por cuenta');
    console.log('-'.repeat(60));
    const filteredResponse = await api.get('/bank-transactions', {
      params: {
        bankAccountId: account1.idBankAccount,
        limit: 5
      }
    });
    console.log('✅ Status:', filteredResponse.status);
    console.log('📊 Transacciones de', account1.accountName + ':', filteredResponse.data.count);

    // 7. Verificar balances finales
    console.log('\n7️⃣ Verificar balances finales');
    console.log('-'.repeat(60));
    const finalBalance1 = await api.get(`/bank-accounts/${account1.idBankAccount}/balance`);
    const finalBalance2 = await api.get(`/bank-accounts/${account2.idBankAccount}/balance`);
    
    console.log('💰 Balance final', account1.accountName + ':', finalBalance1.data.formattedBalance);
    console.log('💰 Balance final', account2.accountName + ':', finalBalance2.data.formattedBalance);
    
    // Cálculo esperado para cuenta 1: 0 + 1000 - 250 - 300 = 450
    const expectedBalance1 = parseFloat(account1.currentBalance) + 1000 - 250 - 300;
    const actualBalance1 = finalBalance1.data.currentBalance;
    
    if (Math.abs(actualBalance1 - expectedBalance1) < 0.01) {
      console.log('✅ Balance cuenta 1 es correcto');
    } else {
      console.log('⚠️ Balance cuenta 1 difiere. Esperado: $' + expectedBalance1.toFixed(2) + ', Actual: $' + actualBalance1.toFixed(2));
    }

    // Cálculo esperado para cuenta 2: 0 + 300 = 300
    const expectedBalance2 = parseFloat(account2.currentBalance) + 300;
    const actualBalance2 = finalBalance2.data.currentBalance;
    
    if (Math.abs(actualBalance2 - expectedBalance2) < 0.01) {
      console.log('✅ Balance cuenta 2 es correcto');
    } else {
      console.log('⚠️ Balance cuenta 2 difiere. Esperado: $' + expectedBalance2.toFixed(2) + ', Actual: $' + actualBalance2.toFixed(2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n⚠️ NOTA: Para limpiar las transacciones de prueba, puedes usar:');
    console.log(`   DELETE /bank-transactions/${depositId}`);
    console.log(`   DELETE /bank-transactions/${withdrawalId}`);

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.message.includes('401')) {
      console.error('\n🔑 NOTA: Asegúrate de actualizar el AUTH_TOKEN en el script con un token válido.');
    }
  }
}

// Ejecutar pruebas
testBankTransactionEndpoints();
