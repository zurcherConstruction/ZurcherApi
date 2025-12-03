const { BankTransaction, SupplierInvoice } = require('./src/data');
const { Op } = require('sequelize');

async function checkUnlinkedPayments() {
  try {
    console.log('🔍 Buscando todos los BankTransactions negativos desde diciembre 1...\n');
    
    const allWithdrawals = await BankTransaction.findAll({
      where: {
        amount: { [Op.lt]: 0 },
        date: { [Op.gte]: '2025-12-01' }
      },
      order: [['date', 'DESC']]
    });

    console.log(`Total retiros encontrados: ${allWithdrawals.length}\n`);
    
    allWithdrawals.forEach(payment => {
      console.log('─'.repeat(60));
      console.log(`ID: ${payment.idBankTransaction}`);
      console.log(`Fecha: ${payment.date}`);
      console.log(`Monto: $${payment.amount}`);
      console.log(`Descripción: "${payment.description}"`);
      console.log(`relatedCreditCardPaymentId: ${payment.relatedCreditCardPaymentId}`);
      console.log(`idBankAccount: ${payment.idBankAccount}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Buscando SupplierInvoices de pagos de tarjeta...\n');
    
    const cardPayments = await SupplierInvoice.findAll({
      where: {
        isCreditCard: true,
        issueDate: { [Op.gte]: '2025-12-01' }
      },
      order: [['issueDate', 'DESC']]
    });
    
    console.log(`Total SupplierInvoices de tarjeta: ${cardPayments.length}\n`);
    
    cardPayments.forEach(invoice => {
      console.log('─'.repeat(60));
      console.log(`ID: ${invoice.idSupplierInvoice}`);
      console.log(`Fecha: ${invoice.issueDate}`);
      console.log(`Monto: $${invoice.totalAmount}`);
      console.log(`Descripción: "${invoice.notes || 'N/A'}"`);
      console.log(`Payment Method: ${invoice.paymentMethod}`);
      console.log(`isCreditCard: ${invoice.isCreditCard}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUnlinkedPayments();
