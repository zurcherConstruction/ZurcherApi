const { Expense, Work, Staff } = require('./src/data');

async function checkExpenseDescriptions() {
  try {
    await Expense.sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Obtener los últimos 10 expenses creados
    const recentExpenses = await Expense.findAll({
      include: [
        { 
          model: Work, 
          as: 'work', 
          attributes: ['idWork', 'propertyAddress'],
          required: false
        },
        { 
          model: Staff, 
          as: 'Staff', 
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log('📋 ÚLTIMOS 10 EXPENSES CREADOS:');
    console.log('=' .repeat(80));
    
    if (recentExpenses.length === 0) {
      console.log('❌ No se encontraron expenses');
    } else {
      recentExpenses.forEach((expense, index) => {
        console.log(`\n${index + 1}. Expense ID: ${expense.idExpense}`);
        console.log(`   Tipo: ${expense.typeExpense}`);
        console.log(`   Monto: $${expense.amount}`);
        console.log(`   Estado de pago: ${expense.paymentStatus}`);
        console.log(`   Work: ${expense.work ? expense.work.propertyAddress : 'Sin work (General)'}`);
        console.log(`   Creado: ${expense.createdAt}`);
        console.log(`   📝 NOTAS: ${expense.notes || '(Sin notas)'}`);
        
        if (expense.notes) {
          // Verificar si contiene descripción personalizada
          const hasCustomDescription = expense.notes.includes(' - ') && 
                                       expense.notes.split(' - ').length >= 3;
          if (hasCustomDescription) {
            const parts = expense.notes.split(' - ');
            const customPart = parts.slice(2).join(' - ');
            console.log(`   ✅ Descripción personalizada: "${customPart}"`);
          }
        }
        
        if (expense.receiptUrl) {
          console.log(`   📎 Receipt: ${expense.receiptUrl.substring(0, 50)}...`);
        }
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 TIPS DE VERIFICACIÓN:');
    console.log('   - Las notas deben tener formato: "VENDOR - Invoice #NUMBER - [tu descripción]"');
    console.log('   - Si ves "(Sin notas)" es que la descripción NO se guardó');
    console.log('   - Busca el símbolo ✅ para confirmar que la descripción personalizada existe');
    console.log('');

    await Expense.sequelize.close();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkExpenseDescriptions();
