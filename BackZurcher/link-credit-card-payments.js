const { BankTransaction, SupplierInvoice, sequelize } = require('./src/data');
const { Op } = require('sequelize');

async function linkCreditCardPayments() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔍 Buscando pagos de tarjeta sin vincular...\n');
    
    // Encontrar todos los BankTransactions que son pagos de tarjeta pero no tienen relatedCreditCardPaymentId
    const unlinkedPayments = await BankTransaction.findAll({
      where: {
        relatedCreditCardPaymentId: null,
        [Op.or]: [
          { description: { [Op.like]: '%Pago Tarjeta Chase Credit Card%' } },
          { description: { [Op.like]: '%Pago Chase Credit Card%' } },
          { description: { [Op.like]: '%Pago de Chase%' } },
          { description: { [Op.like]: '%Pago de AMEX%' } },
          { description: { [Op.like]: '%Pago AMEX%' } }
        ]
      },
      order: [['date', 'ASC']],
      transaction
    });

    console.log(`📋 Encontrados ${unlinkedPayments.length} pagos sin vincular:\n`);
    
    if (unlinkedPayments.length === 0) {
      console.log('✅ No hay pagos para vincular. Todo está actualizado.');
      await transaction.commit();
      return;
    }

    let linkedCount = 0;
    let notFoundCount = 0;

    for (const payment of unlinkedPayments) {
      console.log(`\n💳 Procesando pago:`);
      console.log(`   ID: ${payment.idBankTransaction}`);
      console.log(`   Fecha: ${payment.date}`);
      console.log(`   Monto: $${Math.abs(payment.amount).toFixed(2)}`);
      console.log(`   Descripción: ${payment.description}`);
      
      // Determinar si es Chase o AMEX
      const isChase = payment.description.includes('Chase');
      const paymentMethod = isChase ? 'Chase Credit Card' : 'AMEX';
      
      // Buscar el SupplierInvoice correspondiente
      // Nota: SupplierInvoice usa 'issueDate' no 'dateInvoice'
      const matchingInvoice = await SupplierInvoice.findOne({
        where: {
          isCreditCard: true,
          issueDate: payment.date,
          totalAmount: Math.abs(payment.amount)
        },
        transaction
      });

      if (matchingInvoice) {
        console.log(`   ✅ Encontrado SupplierInvoice #${matchingInvoice.idSupplierInvoice}`);
        
        // Actualizar el BankTransaction
        await payment.update({
          relatedCreditCardPaymentId: matchingInvoice.idSupplierInvoice
        }, { transaction });
        
        linkedCount++;
        console.log(`   ✅ Vinculado exitosamente`);
      } else {
        console.log(`   ⚠️  No se encontró SupplierInvoice correspondiente`);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   Total procesados: ${unlinkedPayments.length}`);
    console.log(`   ✅ Vinculados: ${linkedCount}`);
    console.log(`   ⚠️  No encontrados: ${notFoundCount}`);
    console.log('='.repeat(60));

    if (linkedCount > 0) {
      console.log('\n✅ Cambios guardados exitosamente');
      await transaction.commit();
      
      // Verificar el resultado
      console.log('\n🔍 Verificando resultado...');
      const linkedPayments = await BankTransaction.findAll({
        where: {
          relatedCreditCardPaymentId: { [Op.ne]: null }
        },
        include: [{
          model: SupplierInvoice,
          as: 'relatedCreditCardPayment',
          required: false
        }]
      });
      
      console.log(`\n💰 Total de pagos vinculados en la base de datos: ${linkedPayments.length}`);
      linkedPayments.forEach(p => {
        console.log(`   - ${p.date}: $${Math.abs(p.amount).toFixed(2)} - ${p.description}`);
      });
      
    } else {
      console.log('\n⚠️  No se realizaron cambios');
      await transaction.rollback();
    }

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error:', error.message);
    console.error(error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
linkCreditCardPayments()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });
