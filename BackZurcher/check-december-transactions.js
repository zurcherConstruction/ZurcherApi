const { BankTransaction, BankAccount } = require('./src/data');
const { Op } = require('sequelize');

async function checkDecemberTransactions() {
  try {
    const payments = await BankTransaction.findAll({
      where: {
        date: { [Op.gte]: '2025-12-01' }
      },
      include: [{
        model: BankAccount,
        as: 'bankAccount',
        attributes: ['accountName']
      }],
      order: [['date', 'DESC']]
    });

    console.log(`\nTotal transacciones desde diciembre 1: ${payments.length}\n`);
    
    payments.forEach(p => {
      console.log('─'.repeat(60));
      console.log(`Fecha: ${p.date}`);
      console.log(`Monto: $${p.amount}`);
      console.log(`Descripción: ${p.description}`);
      console.log(`Cuenta: ${p.bankAccount ? p.bankAccount.accountName : 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDecemberTransactions();
