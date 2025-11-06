const { Expense } = require('./src/data');

async function deleteDuplicateExpense() {
  try {
    const count = await Expense.destroy({
      where: {
        notes: 'Gasto general desde invoice 1121',
        amount: 3000,
        workId: null
      }
    });
    
    console.log(`✅ Gastos duplicados eliminados: ${count}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteDuplicateExpense();
