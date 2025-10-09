/**
 * Migración: Actualizar valores antiguos de paymentMethod a los nuevos valores del ENUM
 * 
 * Problema: Hay datos existentes con valores como "transferencia cuenta chase"
 * que no coinciden con los nuevos valores del ENUM
 * 
 * Solución: Mapear valores antiguos a los nuevos valores válidos del ENUM
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Actualizando valores de paymentMethod en tablas Income y Expense...');

    // Mapeo de valores antiguos a nuevos
    const paymentMethodMapping = {
      // Valores antiguos -> Nuevos valores del ENUM
      'transferencia cuenta chase': 'Chase Bank',
      'transferencia chase': 'Chase Bank',
      'chase bank': 'Chase Bank',
      'chase': 'Chase Bank',
      'cap trabajos': 'Cap Trabajos Septic',
      'capital proyectos': 'Capital Proyectos Septic',
      'amex': 'AMEX',
      'chase credit': 'Chase Credit Card',
      'chase card': 'Chase Credit Card',
      'cheque': 'Cheque',
      'check': 'Cheque',
      'transferencia': 'Transferencia Bancaria',
      'transferencia bancaria': 'Transferencia Bancaria',
      'efectivo': 'Efectivo',
      'cash': 'Efectivo',
      'zelle': 'Zelle',
      'tarjeta': 'Tarjeta Débito',
      'tarjeta debito': 'Tarjeta Débito',
      'debito': 'Tarjeta Débito',
      'paypal': 'PayPal',
      'otro': 'Otro',
      'other': 'Otro'
    };

    // Actualizar tabla Expenses
    console.log('📝 Actualizando tabla Expenses...');
    
    for (const [oldValue, newValue] of Object.entries(paymentMethodMapping)) {
      try {
        // Usar ILIKE para búsqueda case-insensitive
        await queryInterface.sequelize.query(`
          UPDATE "Expenses" 
          SET "paymentMethod" = :newValue 
          WHERE LOWER("paymentMethod") = LOWER(:oldValue)
        `, {
          replacements: { oldValue, newValue }
        });
        
        const [results] = await queryInterface.sequelize.query(`
          SELECT COUNT(*) as count 
          FROM "Expenses" 
          WHERE "paymentMethod" = :newValue
        `, {
          replacements: { newValue }
        });
        
        if (results[0].count > 0) {
          console.log(`  ✅ "${oldValue}" -> "${newValue}" (${results[0].count} registros)`);
        }
      } catch (error) {
        console.log(`  ⚠️ Error actualizando "${oldValue}":`, error.message);
      }
    }

    // Actualizar tabla Incomes
    console.log('📝 Actualizando tabla Incomes...');
    
    for (const [oldValue, newValue] of Object.entries(paymentMethodMapping)) {
      try {
        await queryInterface.sequelize.query(`
          UPDATE "Incomes" 
          SET "paymentMethod" = :newValue 
          WHERE LOWER("paymentMethod") = LOWER(:oldValue)
        `, {
          replacements: { oldValue, newValue }
        });
        
        const [results] = await queryInterface.sequelize.query(`
          SELECT COUNT(*) as count 
          FROM "Incomes" 
          WHERE "paymentMethod" = :newValue
        `, {
          replacements: { newValue }
        });
        
        if (results[0].count > 0) {
          console.log(`  ✅ "${oldValue}" -> "${newValue}" (${results[0].count} registros)`);
        }
      } catch (error) {
        console.log(`  ⚠️ Error actualizando "${oldValue}":`, error.message);
      }
    }

    // Establecer NULL para valores que no se pueden mapear
    console.log('🧹 Limpiando valores no reconocidos...');
    
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

    // Limpiar Expenses
    const [expensesInvalid] = await queryInterface.sequelize.query(`
      UPDATE "Expenses" 
      SET "paymentMethod" = NULL 
      WHERE "paymentMethod" IS NOT NULL 
      AND "paymentMethod" NOT IN (:validValues)
      RETURNING "idExpense"
    `, {
      replacements: { validValues }
    });

    if (expensesInvalid.length > 0) {
      console.log(`  ⚠️ Se estableció NULL en ${expensesInvalid.length} registros de Expenses con valores no reconocidos`);
    }

    // Limpiar Incomes
    const [incomesInvalid] = await queryInterface.sequelize.query(`
      UPDATE "Incomes" 
      SET "paymentMethod" = NULL 
      WHERE "paymentMethod" IS NOT NULL 
      AND "paymentMethod" NOT IN (:validValues)
      RETURNING "idIncome"
    `, {
      replacements: { validValues }
    });

    if (incomesInvalid.length > 0) {
      console.log(`  ⚠️ Se estableció NULL en ${incomesInvalid.length} registros de Incomes con valores no reconocidos`);
    }

    // Mostrar resumen
    const [expensesCount] = await queryInterface.sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("paymentMethod") as con_metodo,
        COUNT(*) - COUNT("paymentMethod") as sin_metodo
      FROM "Expenses"
    `);

    const [incomesCount] = await queryInterface.sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("paymentMethod") as con_metodo,
        COUNT(*) - COUNT("paymentMethod") as sin_metodo
      FROM "Incomes"
    `);

    console.log('\n📊 Resumen final:');
    console.log(`  Expenses: ${expensesCount[0].total} total, ${expensesCount[0].con_metodo} con método, ${expensesCount[0].sin_metodo} sin método`);
    console.log(`  Incomes: ${incomesCount[0].total} total, ${incomesCount[0].con_metodo} con método, ${incomesCount[0].sin_metodo} sin método`);
    
    console.log('\n✅ Migración de datos completada');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️ Esta migración no tiene rollback automático');
    console.log('Los valores antiguos se perdieron al hacer el mapeo');
  }
};
