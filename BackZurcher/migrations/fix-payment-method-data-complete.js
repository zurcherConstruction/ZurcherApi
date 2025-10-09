/**
 * Migración: Limpiar TODOS los valores antiguos de paymentMethod
 * 
 * Problema: Hay datos con valores como "bank transfer chase" que no coinciden con el ENUM
 * 
 * Solución: Mapear TODOS los valores posibles a los 12 valores válidos del ENUM
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Limpiando TODOS los valores de paymentMethod en Incomes y Expenses...\n');

    // Mapeo COMPLETO de valores antiguos a nuevos
    const paymentMethodMapping = {
      // Variaciones de Chase Bank
      'chase bank': 'Chase Bank',
      'chase': 'Chase Bank',
      'bank transfer chase': 'Chase Bank',
      'transferencia chase': 'Chase Bank',
      'transferencia cuenta chase': 'Chase Bank',
      'chase transfer': 'Chase Bank',
      
      // Cap Trabajos
      'cap trabajos septic': 'Cap Trabajos Septic',
      'cap trabajos': 'Cap Trabajos Septic',
      'cap': 'Cap Trabajos Septic',
      
      // Capital Proyectos
      'capital proyectos septic': 'Capital Proyectos Septic',
      'capital proyectos': 'Capital Proyectos Septic',
      'capital': 'Capital Proyectos Septic',
      
      // AMEX
      'amex': 'AMEX',
      'american express': 'AMEX',
      
      // Chase Credit Card
      'chase credit card': 'Chase Credit Card',
      'chase credit': 'Chase Credit Card',
      'chase card': 'Chase Credit Card',
      'tarjeta chase': 'Chase Credit Card',
      
      // Cheque
      'cheque': 'Cheque',
      'check': 'Cheque',
      
      // Transferencia Bancaria
      'transferencia bancaria': 'Transferencia Bancaria',
      'transferencia': 'Transferencia Bancaria',
      'transfer': 'Transferencia Bancaria',
      'bank transfer': 'Transferencia Bancaria',
      'wire transfer': 'Transferencia Bancaria',
      
      // Efectivo
      'efectivo': 'Efectivo',
      'cash': 'Efectivo',
      
      // Zelle
      'zelle': 'Zelle',
      
      // Tarjeta Débito
      'tarjeta débito': 'Tarjeta Débito',
      'tarjeta debito': 'Tarjeta Débito',
      'tarjeta': 'Tarjeta Débito',
      'debito': 'Tarjeta Débito',
      'debit': 'Tarjeta Débito',
      'debit card': 'Tarjeta Débito',
      
      // PayPal
      'paypal': 'PayPal',
      
      // Otro
      'otro': 'Otro',
      'other': 'Otro',
      'others': 'Otro'
    };

    try {
      // 1️⃣ VERIFICAR VALORES EXISTENTES EN INCOMES
      console.log('📊 Verificando valores actuales en Incomes...');
      const [incomeValues] = await queryInterface.sequelize.query(`
        SELECT DISTINCT "paymentMethod" 
        FROM "Incomes" 
        WHERE "paymentMethod" IS NOT NULL
        ORDER BY "paymentMethod"
      `);
      
      console.log('📋 Valores encontrados en Incomes:');
      incomeValues.forEach(row => {
        const currentValue = row.paymentMethod;
        const mappedValue = paymentMethodMapping[currentValue.toLowerCase()];
        console.log(`   - "${currentValue}" → ${mappedValue ? `"${mappedValue}" ✅` : '❌ NO MAPEADO'}`);
      });

      // 2️⃣ VERIFICAR VALORES EXISTENTES EN EXPENSES
      console.log('\n📊 Verificando valores actuales en Expenses...');
      const [expenseValues] = await queryInterface.sequelize.query(`
        SELECT DISTINCT "paymentMethod" 
        FROM "Expenses" 
        WHERE "paymentMethod" IS NOT NULL
        ORDER BY "paymentMethod"
      `);
      
      console.log('📋 Valores encontrados en Expenses:');
      expenseValues.forEach(row => {
        const currentValue = row.paymentMethod;
        const mappedValue = paymentMethodMapping[currentValue.toLowerCase()];
        console.log(`   - "${currentValue}" → ${mappedValue ? `"${mappedValue}" ✅` : '❌ NO MAPEADO'}`);
      });

      // 3️⃣ ACTUALIZAR INCOMES
      console.log('\n🔄 Actualizando tabla Incomes...');
      let incomesUpdated = 0;
      
      for (const [oldValue, newValue] of Object.entries(paymentMethodMapping)) {
        const [results] = await queryInterface.sequelize.query(`
          UPDATE "Incomes" 
          SET "paymentMethod" = :newValue 
          WHERE LOWER("paymentMethod") = LOWER(:oldValue)
          RETURNING id
        `, {
          replacements: { oldValue, newValue }
        });
        
        if (results.length > 0) {
          console.log(`   ✅ "${oldValue}" → "${newValue}" (${results.length} registros)`);
          incomesUpdated += results.length;
        }
      }
      
      console.log(`\n📊 Total Incomes actualizados: ${incomesUpdated}`);

      // 4️⃣ ACTUALIZAR EXPENSES
      console.log('\n🔄 Actualizando tabla Expenses...');
      let expensesUpdated = 0;
      
      for (const [oldValue, newValue] of Object.entries(paymentMethodMapping)) {
        const [results] = await queryInterface.sequelize.query(`
          UPDATE "Expenses" 
          SET "paymentMethod" = :newValue 
          WHERE LOWER("paymentMethod") = LOWER(:oldValue)
          RETURNING "idExpense"
        `, {
          replacements: { oldValue, newValue }
        });
        
        if (results.length > 0) {
          console.log(`   ✅ "${oldValue}" → "${newValue}" (${results.length} registros)`);
          expensesUpdated += results.length;
        }
      }
      
      console.log(`\n📊 Total Expenses actualizados: ${expensesUpdated}`);

      // 5️⃣ VERIFICACIÓN FINAL
      console.log('\n🔍 Verificación final de valores inválidos...');
      
      const validValues = [
        'Cap Trabajos Septic',
        'Capital Proyectos Septic',
        'Chase Bank',
        'AMEX',
        'Chase Credit Card',
        'Cheque',
        'Transferencia Bancaria',
        'Efectivo',
        'Zelle',
        'Tarjeta Débito',
        'PayPal',
        'Otro'
      ];
      
      const [invalidIncomes] = await queryInterface.sequelize.query(`
        SELECT "paymentMethod", COUNT(*) as count
        FROM "Incomes"
        WHERE "paymentMethod" IS NOT NULL
        AND "paymentMethod" NOT IN (${validValues.map((_, i) => `$${i + 1}`).join(', ')})
        GROUP BY "paymentMethod"
      `, {
        bind: validValues
      });
      
      const [invalidExpenses] = await queryInterface.sequelize.query(`
        SELECT "paymentMethod", COUNT(*) as count
        FROM "Expenses"
        WHERE "paymentMethod" IS NOT NULL
        AND "paymentMethod" NOT IN (${validValues.map((_, i) => `$${i + 1}`).join(', ')})
        GROUP BY "paymentMethod"
      `, {
        bind: validValues
      });
      
      if (invalidIncomes.length > 0) {
        console.log('\n⚠️  VALORES INVÁLIDOS ENCONTRADOS EN INCOMES:');
        invalidIncomes.forEach(row => {
          console.log(`   ❌ "${row.paymentMethod}" (${row.count} registros)`);
          console.log(`      💡 Sugerencia: Agregar mapeo para este valor`);
        });
      } else {
        console.log('\n✅ No se encontraron valores inválidos en Incomes');
      }
      
      if (invalidExpenses.length > 0) {
        console.log('\n⚠️  VALORES INVÁLIDOS ENCONTRADOS EN EXPENSES:');
        invalidExpenses.forEach(row => {
          console.log(`   ❌ "${row.paymentMethod}" (${row.count} registros)`);
          console.log(`      💡 Sugerencia: Agregar mapeo para este valor`);
        });
      } else {
        console.log('\n✅ No se encontraron valores inválidos en Expenses');
      }

      console.log('\n✅ Migración completada exitosamente!');
      console.log(`\n📊 Resumen:`);
      console.log(`   - Incomes actualizados: ${incomesUpdated}`);
      console.log(`   - Expenses actualizados: ${expensesUpdated}`);
      console.log(`   - Valores inválidos restantes: ${invalidIncomes.length + invalidExpenses.length}`);

    } catch (error) {
      console.error('\n❌ Error durante la migración:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  No se puede revertir esta migración (los valores antiguos se perdieron)');
  }
};
