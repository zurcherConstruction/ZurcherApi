/**
 * Script de prueba para Bank Account API
 * 
 * Prueba los endpoints de gestión de cuentas bancarias
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

async function testBankAccountEndpoints() {
  console.log('🧪 PRUEBAS DE ENDPOINTS - BANK ACCOUNTS\n');
  console.log('=' .repeat(60));

  try {
    // 1. GET /bank-accounts - Obtener todas las cuentas
    console.log('\n1️⃣ GET /bank-accounts - Listar todas las cuentas');
    console.log('-'.repeat(60));
    const accountsResponse = await api.get('/bank-accounts');
    console.log('✅ Status:', accountsResponse.status);
    console.log('📊 Cuentas encontradas:', accountsResponse.data.count);
    console.log('💰 Balance total:', accountsResponse.data.formattedTotalBalance || `$${accountsResponse.data.totalBalance}`);
    
    if (accountsResponse.data.accounts && accountsResponse.data.accounts.length > 0) {
      console.log('\n📋 Lista de cuentas:');
      accountsResponse.data.accounts.forEach(account => {
        console.log(`   - ${account.accountName} (${account.accountType}): ${account.formattedBalance}`);
      });

      // Guardar ID de primera cuenta para siguientes pruebas
      const firstAccountId = accountsResponse.data.accounts[0].idBankAccount;

      // 2. GET /bank-accounts/:id - Detalle de cuenta específica
      console.log('\n2️⃣ GET /bank-accounts/:id - Detalle de cuenta');
      console.log('-'.repeat(60));
      const detailResponse = await api.get(`/bank-accounts/${firstAccountId}`);
      console.log('✅ Status:', detailResponse.status);
      console.log('📋 Cuenta:', detailResponse.data.account.accountName);
      console.log('💰 Balance:', detailResponse.data.account.formattedBalance);
      console.log('📊 Estadísticas:');
      console.log('   - Depósitos:', detailResponse.data.statistics.depositCount, 'transacciones');
      console.log('   - Retiros:', detailResponse.data.statistics.withdrawalCount, 'transacciones');
      console.log('   - Total depósitos: $', detailResponse.data.statistics.totalDeposits);
      console.log('   - Total retiros: $', detailResponse.data.statistics.totalWithdrawals);

      // 3. GET /bank-accounts/:id/balance - Balance actual
      console.log('\n3️⃣ GET /bank-accounts/:id/balance - Balance actual');
      console.log('-'.repeat(60));
      const balanceResponse = await api.get(`/bank-accounts/${firstAccountId}/balance`);
      console.log('✅ Status:', balanceResponse.status);
      console.log('💰 Balance actual:', balanceResponse.data.formattedBalance);
      console.log('🔢 Transacciones:', balanceResponse.data.transactionCount);
      if (balanceResponse.data.lastTransaction) {
        console.log('📅 Última transacción:', balanceResponse.data.lastTransaction.date);
        console.log('   Tipo:', balanceResponse.data.lastTransaction.transactionType);
        console.log('   Monto: $', balanceResponse.data.lastTransaction.amount);
      } else {
        console.log('📅 Última transacción: Ninguna');
      }

      // 4. GET /bank-accounts/summary/dashboard - Dashboard
      console.log('\n4️⃣ GET /bank-accounts/summary/dashboard - Resumen dashboard');
      console.log('-'.repeat(60));
      const dashboardResponse = await api.get('/bank-accounts/summary/dashboard');
      console.log('✅ Status:', dashboardResponse.status);
      console.log('📊 Total cuentas:', dashboardResponse.data.summary.totalAccounts);
      console.log('💰 Balance total:', dashboardResponse.data.summary.formattedTotalBalance);
      console.log('\n📋 Por tipo de cuenta:');
      Object.keys(dashboardResponse.data.summary.byType).forEach(type => {
        const typeData = dashboardResponse.data.summary.byType[type];
        console.log(`   - ${type}: ${typeData.count} cuentas, $${typeData.balance.toFixed(2)}`);
      });

    } else {
      console.log('⚠️ No se encontraron cuentas. Ejecuta el seed primero.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('='.repeat(60));

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
testBankAccountEndpoints();
