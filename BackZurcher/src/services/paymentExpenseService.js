const { FixedExpense, FixedExpensePayment, Expense } = require('../data');
const moment = require('moment');

/**
 * 💰 GENERAR EXPENSE CUANDO SE REGISTRA UN PAGO
 * 
 * Este servicio se ejecuta cuando el usuario registra un pago
 * de un gasto fijo y genera el expense correspondiente.
 * 
 * Debe llamarse desde el controller cuando se crea un FixedExpensePayment
 */

/**
 * Generar expense cuando se registra un pago
 * @param {string} fixedExpenseId - ID del gasto fijo
 * @param {object} paymentData - Datos del pago registrado
 */
const generateExpenseOnPayment = async (fixedExpenseId, paymentData) => {
  try {
    console.log(`💰 [PAYMENT EXPENSE] Generando expense para gasto fijo: ${fixedExpenseId}`);

    // Obtener el gasto fijo
    const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
    
    if (!fixedExpense) {
      throw new Error(`Gasto fijo no encontrado: ${fixedExpenseId}`);
    }

    // Verificar si ya existe un expense para esta fecha y gasto fijo
    const existingExpense = await Expense.findOne({
      where: {
        relatedFixedExpenseId: fixedExpenseId,
        date: paymentData.paymentDate
      }
    });

    if (existingExpense) {
      console.log(`⚠️ [PAYMENT EXPENSE] Ya existe expense para ${fixedExpense.name} en ${paymentData.paymentDate}`);
      return existingExpense;
    }

    // Crear el expense
    const newExpense = await Expense.create({
      date: paymentData.paymentDate,
      amount: paymentData.amount,
      typeExpense: fixedExpense.category || 'Gasto Fijo',
      paymentMethod: paymentData.paymentMethod || fixedExpense.paymentMethod || 'Otro',
      paymentStatus: 'paid', // Se marca como pagado porque ya se registró el pago
      notes: `${fixedExpense.name} - Pago registrado (${moment().format('YYYY-MM-DD')})`,
      relatedFixedExpenseId: fixedExpenseId,
      staffId: paymentData.staffId || fixedExpense.createdByStaffId,
      paidDate: paymentData.paymentDate,
      paidAmount: paymentData.amount
    });

    console.log(`✅ [PAYMENT EXPENSE] Expense generado: $${paymentData.amount} para ${fixedExpense.name}`);

    // Actualizar el estado del gasto fijo
    await fixedExpense.update({
      paymentStatus: 'paid',
      paidAmount: parseFloat(fixedExpense.paidAmount || 0) + parseFloat(paymentData.amount),
      paidDate: paymentData.paymentDate
    });

    console.log(`✅ [PAYMENT EXPENSE] Gasto fijo actualizado: ${fixedExpense.name}`);

    return newExpense;

  } catch (error) {
    console.error(`❌ [PAYMENT EXPENSE] Error generando expense:`, error);
    throw error;
  }
};

/**
 * Verificar y corregir expenses faltantes para pagos existentes
 */
const syncPaymentsWithExpenses = async () => {
  try {
    console.log(`🔄 [PAYMENT SYNC] Sincronizando pagos con expenses`);

    // Buscar pagos que no tienen expense correspondiente
    const paymentsWithoutExpenses = await FixedExpensePayment.findAll({
      include: [{
        model: FixedExpense,
        as: 'fixedExpense',
        required: true
      }]
    });

    let syncedCount = 0;

    for (const payment of paymentsWithoutExpenses) {
      try {
        // Verificar si ya existe expense para este pago
        const existingExpense = await Expense.findOne({
          where: {
            relatedFixedExpenseId: payment.fixedExpenseId,
            date: payment.paymentDate,
            amount: payment.amount
          }
        });

        if (!existingExpense) {
          // Generar expense para este pago
          await generateExpenseOnPayment(payment.fixedExpenseId, {
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            staffId: payment.staffId
          });
          
          syncedCount++;
        }
      } catch (error) {
        console.error(`❌ Error sincronizando pago ${payment.idPayment}:`, error.message);
      }
    }

    console.log(`✅ [PAYMENT SYNC] Expenses sincronizados: ${syncedCount}`);
    return syncedCount;

  } catch (error) {
    console.error(`❌ [PAYMENT SYNC] Error:`, error);
    throw error;
  }
};

module.exports = {
  generateExpenseOnPayment,
  syncPaymentsWithExpenses
};