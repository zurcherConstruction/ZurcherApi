const { Expense } = require('./src/data');
const { Op, Sequelize } = require('sequelize');

async function debugAmexSearch() {
  try {
    console.log('🔍 === BÚSQUEDA DIRECTA DE AMEX EN BASE DE DATOS ===');
    
    // Buscar TODOS los gastos que contengan AMEX en cualquier campo
    const amexExpenses = await Expense.findAll({
      where: {
        [Op.or]: [
          // Convertir ENUM a texto para la búsqueda
          Sequelize.where(
            Sequelize.cast(Sequelize.col('paymentMethod'), 'TEXT'),
            { [Op.iLike]: '%amex%' }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.col('paymentMethod'), 'TEXT'),
            { [Op.iLike]: '%american%' }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.col('paymentMethod'), 'TEXT'),
            { [Op.iLike]: '%express%' }
          ),
          { notes: { [Op.iLike]: '%amex%' } },
          { notes: { [Op.iLike]: '%american%' } },
          // También convertir typeExpense ENUM a texto para la búsqueda
          Sequelize.where(
            Sequelize.cast(Sequelize.col('typeExpense'), 'TEXT'),
            { [Op.iLike]: '%amex%' }
          )
          // Nota: No hay columna 'description' en Expenses, solo 'notes'
        ]
      },
      attributes: ['idExpense', 'amount', 'paymentMethod', 'paymentStatus', 'date', 'notes', 'typeExpense', 'supplierInvoiceItemId', 'relatedFixedExpenseId'],
      order: [['date', 'DESC']],
      limit: 50
    });
    
    console.log(`📊 Total gastos AMEX encontrados en DB: ${amexExpenses.length}`);
    
    if (amexExpenses.length > 0) {
      console.log('\n🔍 DETALLES DE GASTOS AMEX:');
      amexExpenses.forEach((expense, index) => {
        console.log(`--- GASTO AMEX #${index + 1} ---`);
        console.log('ID:', expense.idExpense);
        console.log('Amount:', expense.amount);
        console.log('PaymentMethod:', expense.paymentMethod);
        console.log('PaymentStatus:', expense.paymentStatus);
        console.log('Date:', expense.date);
        console.log('Notes:', expense.notes?.substring(0, 100));
        console.log('TypeExpense:', expense.typeExpense);
        console.log('SupplierInvoiceItemId:', expense.supplierInvoiceItemId);
        console.log('RelatedFixedExpenseId:', expense.relatedFixedExpenseId);
        console.log('---');
      });
      
      // Contar por paymentStatus
      const statusCounts = {};
      amexExpenses.forEach(expense => {
        statusCounts[expense.paymentStatus] = (statusCounts[expense.paymentStatus] || 0) + 1;
      });
      console.log('\n📊 Distribución por paymentStatus:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} gastos`);
      });
      
      // Buscar fechas recientes (diciembre 2025)
      const recentAmex = amexExpenses.filter(expense => 
        expense.date && expense.date.startsWith('2025-12')
      );
      console.log(`\n📅 Gastos AMEX en diciembre 2025: ${recentAmex.length}`);
      
    } else {
      console.log('❌ NO se encontraron gastos AMEX en la base de datos');
    }
    
    // Buscar todos los paymentMethods únicos (convertir ENUM a texto)
    console.log('\n📋 === OBTENIENDO TODOS LOS MÉTODOS DE PAGO ===');
    const allPaymentMethods = await Expense.findAll({
      attributes: [
        [Sequelize.cast(Sequelize.col('paymentMethod'), 'TEXT'), 'paymentMethodText'],
        [Sequelize.fn('COUNT', Sequelize.col('paymentMethod')), 'count']
      ],
      group: [Sequelize.cast(Sequelize.col('paymentMethod'), 'TEXT')],
      order: [[Sequelize.fn('COUNT', Sequelize.col('paymentMethod')), 'DESC']]
    });
    
    console.log('\n📋 TODOS LOS MÉTODOS DE PAGO EN LA DB (ordenados por frecuencia):');
    allPaymentMethods.forEach(method => {
      console.log(`   - "${method.dataValues.paymentMethodText}" (${method.dataValues.count} usos)`);
    });
    
    // Buscar gastos recientes para entender el patrón
    console.log('\n📅 === GASTOS RECIENTES (Diciembre 2025) ===');
    const recentExpenses = await Expense.findAll({
      where: {
        date: {
          [Op.like]: '2025-12%'
        }
      },
      attributes: ['idExpense', 'amount', 'paymentMethod', 'date', 'notes'],
      order: [['date', 'DESC']],
      limit: 20
    });
    
    console.log(`Total gastos en diciembre 2025: ${recentExpenses.length}`);
    if (recentExpenses.length > 0) {
      console.log('\nPrimeros 10 gastos recientes:');
      recentExpenses.slice(0, 10).forEach((expense, index) => {
        console.log(`${index + 1}. $${expense.amount} - ${expense.paymentMethod} - ${expense.date} - ${expense.notes?.substring(0, 50)}`);
      });
    }
    
    console.log('=== FIN BÚSQUEDA AMEX ===');
    
  } catch (error) {
    console.error('Error en búsqueda AMEX:', error);
  }
}

// Ejecutar la función
debugAmexSearch().then(() => {
  console.log('✅ Búsqueda AMEX completada');
  process.exit(0);
});