/**
 * Script de prueba para integración de Income/Expense con Bank Transactions
 * 
 * Verifica que se creen transacciones bancarias automáticamente
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

async function testIncomeExpenseIntegration() {
  console.log('🧪 PRUEBAS DE INTEGRACIÓN - INCOME/EXPENSE → BANK TRANSACTIONS\n');
  console.log('=' .repeat(60));

  try {
    // 1. Obtener cuentas bancarias disponibles
    console.log('\n1️⃣ Obtener cuentas bancarias disponibles');
    console.log('-'.repeat(60));
    const accountsResponse = await api.get('/bank-accounts');
    
    if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length === 0) {
      console.error('❌ No hay cuentas bancarias. Ejecuta: node seed-bank-accounts.js');
      return;
    }

    const chaseBank = accountsResponse.data.accounts.find(a => a.accountName === 'Chase Bank');
    
    if (!chaseBank) {
      console.error('❌ No se encontró cuenta "Chase Bank"');
      return;
    }

    console.log(`✅ Cuenta encontrada: ${chaseBank.accountName}`);
    console.log(`💰 Balance inicial: ${chaseBank.formattedBalance}`);
    
    const initialBalance = parseFloat(chaseBank.currentBalance);

    // 2. Crear Income con paymentMethod = Chase Bank
    console.log('\n2️⃣ Crear Income con paymentMethod = "Chase Bank"');
    console.log('-'.repeat(60));
    
    const incomeData = {
      date: '2025-11-18',
      amount: 5000.00,
      typeIncome: 'Comprobante Ingreso',
      notes: 'Prueba de integración bancaria',
      paymentMethod: 'Chase Bank',
      paymentDetails: 'Depósito directo',
      verified: false
    };

    console.log('📤 Creando Income:', JSON.stringify(incomeData, null, 2));
    
    const incomeResponse = await api.post('/income', incomeData);
    console.log('✅ Income creado:', incomeResponse.data.idIncome);
    console.log('💰 Monto:', `$${incomeResponse.data.amount}`);

    // Esperar un momento para que se procese
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Verificar que se creó la transacción bancaria
    console.log('\n3️⃣ Verificar transacción bancaria creada (deposit)');
    console.log('-'.repeat(60));
    
    const transactionsResponse = await api.get('/bank-transactions', {
      params: {
        bankAccountId: chaseBank.idBankAccount,
        category: 'income',
        limit: 1,
        orderBy: 'createdAt',
        orderDirection: 'DESC'
      }
    });

    if (transactionsResponse.data.count === 0) {
      console.error('❌ No se encontró transacción bancaria asociada');
      console.error('   La integración no funcionó correctamente');
    } else {
      const transaction = transactionsResponse.data.transactions[0];
      console.log('✅ Transacción bancaria encontrada:');
      console.log('   ID:', transaction.idTransaction);
      console.log('   Tipo:', transaction.transactionType);
      console.log('   Monto:', transaction.formattedAmount);
      console.log('   Descripción:', transaction.description);
      console.log('   Balance después:', `$${transaction.balanceAfter}`);
      console.log('   Related Income:', transaction.relatedIncomeId || 'N/A');
      
      if (transaction.relatedIncomeId === incomeResponse.data.idIncome) {
        console.log('✅ Transacción correctamente vinculada al Income');
      } else {
        console.warn('⚠️ La transacción no está vinculada al Income creado');
      }
    }

    // 4. Verificar balance actualizado
    console.log('\n4️⃣ Verificar balance actualizado de Chase Bank');
    console.log('-'.repeat(60));
    
    const updatedBalanceResponse = await api.get(`/bank-accounts/${chaseBank.idBankAccount}/balance`);
    const newBalance = updatedBalanceResponse.data.currentBalance;
    
    console.log('💰 Balance inicial:', `$${initialBalance.toFixed(2)}`);
    console.log('💰 Balance actual:', `$${newBalance.toFixed(2)}`);
    console.log('📈 Diferencia:', `$${(newBalance - initialBalance).toFixed(2)}`);
    
    const expectedBalance = initialBalance + 5000.00;
    if (Math.abs(newBalance - expectedBalance) < 0.01) {
      console.log('✅ Balance actualizado correctamente');
    } else {
      console.error('❌ Balance incorrecto. Esperado: $' + expectedBalance.toFixed(2));
    }

    // 5. Crear Expense con paymentMethod = Chase Bank
    console.log('\n5️⃣ Crear Expense con paymentMethod = "Chase Bank"');
    console.log('-'.repeat(60));
    
    const expenseData = {
      date: '2025-11-18',
      amount: 1500.00,
      typeExpense: 'Materiales',
      notes: 'Prueba de integración bancaria - retiro',
      paymentMethod: 'Chase Bank',
      paymentDetails: 'Compra de materiales',
      verified: false
    };

    console.log('📤 Creando Expense:', JSON.stringify(expenseData, null, 2));
    
    const expenseResponse = await api.post('/expense', expenseData);
    console.log('✅ Expense creado:', expenseResponse.data.idExpense);
    console.log('💰 Monto:', `$${expenseResponse.data.amount}`);

    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Verificar transacción de retiro
    console.log('\n6️⃣ Verificar transacción bancaria creada (withdrawal)');
    console.log('-'.repeat(60));
    
    const withdrawalResponse = await api.get('/bank-transactions', {
      params: {
        bankAccountId: chaseBank.idBankAccount,
        category: 'expense',
        limit: 1,
        orderBy: 'createdAt',
        orderDirection: 'DESC'
      }
    });

    if (withdrawalResponse.data.count === 0) {
      console.error('❌ No se encontró transacción de retiro');
    } else {
      const transaction = withdrawalResponse.data.transactions[0];
      console.log('✅ Transacción de retiro encontrada:');
      console.log('   ID:', transaction.idTransaction);
      console.log('   Tipo:', transaction.transactionType);
      console.log('   Monto:', transaction.formattedAmount);
      console.log('   Descripción:', transaction.description);
      console.log('   Balance después:', `$${transaction.balanceAfter}`);
      console.log('   Related Expense:', transaction.relatedExpenseId || 'N/A');
      
      if (transaction.relatedExpenseId === expenseResponse.data.idExpense) {
        console.log('✅ Transacción correctamente vinculada al Expense');
      } else {
        console.warn('⚠️ La transacción no está vinculada al Expense creado');
      }
    }

    // 7. Verificar balance final
    console.log('\n7️⃣ Verificar balance final de Chase Bank');
    console.log('-'.repeat(60));
    
    const finalBalanceResponse = await api.get(`/bank-accounts/${chaseBank.idBankAccount}/balance`);
    const finalBalance = finalBalanceResponse.data.currentBalance;
    
    console.log('💰 Balance después de Income:', `$${newBalance.toFixed(2)}`);
    console.log('💰 Balance final:', `$${finalBalance.toFixed(2)}`);
    console.log('📉 Diferencia:', `$${(finalBalance - newBalance).toFixed(2)}`);
    
    const expectedFinalBalance = newBalance - 1500.00;
    if (Math.abs(finalBalance - expectedFinalBalance) < 0.01) {
      console.log('✅ Balance actualizado correctamente después de Expense');
    } else {
      console.error('❌ Balance incorrecto. Esperado: $' + expectedFinalBalance.toFixed(2));
    }

    // 8. Resumen de todas las transacciones
    console.log('\n8️⃣ Resumen de transacciones en Chase Bank');
    console.log('-'.repeat(60));
    
    const allTransactions = await api.get('/bank-transactions', {
      params: {
        bankAccountId: chaseBank.idBankAccount,
        limit: 10
      }
    });

    console.log(`📊 Total transacciones: ${allTransactions.data.count}`);
    console.log('\n📋 Últimas transacciones:');
    allTransactions.data.transactions.forEach(t => {
      const icon = t.transactionType === 'deposit' ? '📥' : '📤';
      console.log(`   ${icon} ${t.date} | ${t.transactionType} | ${t.formattedAmount} | ${t.description}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS DE INTEGRACIÓN COMPLETADAS');
    console.log('='.repeat(60));
    console.log('\n📊 RESUMEN:');
    console.log(`   Balance inicial: $${initialBalance.toFixed(2)}`);
    console.log(`   Income creado: +$5000.00`);
    console.log(`   Expense creado: -$1500.00`);
    console.log(`   Balance final: $${finalBalance.toFixed(2)}`);
    console.log(`   Balance esperado: $${(initialBalance + 5000 - 1500).toFixed(2)}`);
    
    if (Math.abs(finalBalance - (initialBalance + 5000 - 1500)) < 0.01) {
      console.log('\n✅ INTEGRACIÓN FUNCIONANDO CORRECTAMENTE ✅');
    } else {
      console.log('\n❌ REVISAR INTEGRACIÓN - Balance no coincide');
    }

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
testIncomeExpenseIntegration();
