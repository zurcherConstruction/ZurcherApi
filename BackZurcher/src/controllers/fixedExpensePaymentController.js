/**
 * 🆕 CONTROLADOR: Pagos Parciales de Gastos Fijos
 * 
 * Funcionalidades:
 * - Registrar pagos parciales (crea Expense automáticamente)
 * - Ver historial de pagos
 * - Eliminar pagos (con rollback de Expense y montos)
 * - Calcular balance (total/pagado/restante)
 */

const { FixedExpensePayment, FixedExpense, Expense, Staff, Receipt } = require('../data');
const { Op } = require('sequelize');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUploader');
const { createWithdrawalTransaction } = require('../utils/bankTransactionHelper');

/**
 * 🔄 Calcular la siguiente fecha de vencimiento
 * @param {Date} currentDueDate - Fecha de vencimiento actual
 * @param {string} frequency - Frecuencia del gasto fijo
 * @returns {Date} - Nueva fecha de vencimiento
 */
function calculateNextDueDate(currentDueDate, frequency) {
  const current = new Date(currentDueDate);
  const next = new Date(current);

  switch (frequency) {
    case 'weekly':
      next.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(current.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(current.getMonth() + 3);
      break;
    case 'semiannual':
      next.setMonth(current.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(current.getFullYear() + 1);
      break;
    case 'one_time':
      return null; // No hay próxima fecha para gastos únicos
    default:
      next.setMonth(current.getMonth() + 1); // Default: mensual
  }

  return next;
}

/**
 * 💰 Registrar un pago parcial
 * POST /api/fixed-expenses/:id/payments
 */
const addPartialPayment = async (req, res) => {
  try {
    const { id: fixedExpenseId } = req.params;
    const { 
      amount, 
      paymentDate, 
      paymentMethod, 
      notes, 
      staffId, 
      expenseId, // 🆕 Expense ya creado desde el frontend
      skipExpenseCreation, // 🆕 Flag para no crear Expense duplicado
      receiptUrl, // 🆕 URL del receipt ya creado
      receiptPublicId // 🆕 Public ID del receipt ya creado
    } = req.body;

    console.log('📥 Datos recibidos:', { 
      amount, 
      paymentDate, 
      paymentMethod, 
      notes, 
      staffId, 
      expenseId, 
      skipExpenseCreation,
      hasReceiptUrl: !!receiptUrl 
    });
    console.log('📎 Archivo:', req.file);

    // Validaciones
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }

    // Buscar el gasto fijo
    const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
    if (!fixedExpense) {
      return res.status(404).json({ message: 'Gasto fijo no encontrado' });
    }

    const totalAmount = parseFloat(fixedExpense.totalAmount);
    const paidAmount = parseFloat(fixedExpense.paidAmount || 0);
    const remainingAmount = totalAmount - paidAmount;
    const paymentAmount = parseFloat(amount);

    console.log('💰 Montos:', { totalAmount, paidAmount, remainingAmount, paymentAmount });

    // Validar que no se pague más del total SOLO si estamos creando el expense desde el backend
    // Si viene del frontend (skipExpenseCreation=true), el frontend ya validó y actualizó el balance
    if (!skipExpenseCreation && paymentAmount > remainingAmount + 0.01) { // Tolerancia para decimales
      return res.status(400).json({ 
        message: `El pago de $${paymentAmount} excede el saldo restante de $${remainingAmount.toFixed(2)}`,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        remainingAmount: remainingAmount.toFixed(2)
      });
    }

    let finalExpenseId = expenseId; // Usar el expense ya creado si existe
    let finalReceiptUrl = receiptUrl; // Usar el receipt ya creado si existe
    let finalReceiptPublicId = receiptPublicId;

    // 🆕 SOLO crear Expense si NO viene desde el frontend
    if (!skipExpenseCreation && !expenseId) {
      console.log('� Creando Expense desde el backend...');
      
      // Subir comprobante a Cloudinary si existe
      if (req.file) {
        try {
          console.log('📤 Subiendo comprobante a Cloudinary...');
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'fixed_expense_receipts',
            resource_type: 'auto' // Permite PDF e imágenes
          });
          finalReceiptUrl = uploadResult.secure_url;
          finalReceiptPublicId = uploadResult.public_id;
          console.log('✅ Comprobante subido:', finalReceiptUrl);
        } catch (uploadError) {
          console.error('❌ Error al subir comprobante:', uploadError);
          // Continuar sin comprobante si falla la subida
        }
      } else {
        console.log('⚠️ No se recibió archivo de comprobante');
      }

      // 1️⃣ Crear el Expense automáticamente
      const expense = await Expense.create({
        date: paymentDate || new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        typeExpense: 'Gasto Fijo',
        paymentMethod: paymentMethod || fixedExpense.paymentMethod || 'Otro',
        notes: notes || `Pago parcial de: ${fixedExpense.name}`,
        paymentStatus: 'paid',
        paidDate: paymentDate || new Date().toISOString().split('T')[0],
        staffId: staffId || fixedExpense.createdByStaffId,
        relatedFixedExpenseId: fixedExpenseId,
        vendor: fixedExpense.vendor
      });

      finalExpenseId = expense.idExpense;
      console.log('✅ Expense creado desde backend:', finalExpenseId);

      // 🏦 Crear BankTransaction si paymentMethod es cuenta bancaria
      try {
        await createWithdrawalTransaction({
          paymentMethod: paymentMethod || fixedExpense.paymentMethod || 'Otro',
          amount: paymentAmount,
          date: paymentDate || new Date().toISOString().split('T')[0],
          description: `Pago parcial: ${fixedExpense.name}`,
          relatedExpenseId: finalExpenseId,
          notes: notes || `Gasto fijo: ${fixedExpense.name}`,
          createdByStaffId: staffId || fixedExpense.createdByStaffId
        });
      } catch (bankError) {
        console.error('❌ Error creando transacción bancaria:', bankError.message);
        // No bloqueamos el pago si falla la transacción bancaria
      }

      // 1.5️⃣ Crear el Receipt si hay comprobante
      if (finalReceiptUrl && finalReceiptPublicId) {
        try {
          await Receipt.create({
            relatedModel: 'Expense',
            relatedId: finalExpenseId,
            type: 'Gasto Fijo',
            notes: notes || `Comprobante de pago parcial: ${fixedExpense.name}`,
            fileUrl: finalReceiptUrl,
            publicId: finalReceiptPublicId,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname
          });
          console.log('✅ Receipt creado para Expense:', finalExpenseId);
        } catch (receiptError) {
          console.error('❌ Error al crear Receipt:', receiptError);
          // Continuar aunque falle el Receipt
        }
      }
    } else {
      console.log('✅ Usando Expense ya creado desde frontend:', finalExpenseId);
    }

    // 2️⃣ Registrar el pago parcial
    const payment = await FixedExpensePayment.create({
      fixedExpenseId,
      amount: paymentAmount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || fixedExpense.paymentMethod || 'Otro',
      receiptUrl: finalReceiptUrl,
      receiptPublicId: finalReceiptPublicId,
      notes,
      expenseId: finalExpenseId,
      createdByStaffId: staffId || fixedExpense.createdByStaffId
    });

    console.log('✅ Payment creado:', payment.idPayment);

    // 3️⃣ Actualizar el gasto fijo con el nuevo pago
    const newPaidAmount = Math.max(0, paidAmount) + paymentAmount; // Asegurar que paidAmount nunca sea negativo
    const newPaymentStatus = newPaidAmount >= totalAmount ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'unpaid');
    
    console.log('💰 Actualizando FixedExpense:', {
      oldPaidAmount: paidAmount,
      paymentAmount: paymentAmount,
      newPaidAmount: newPaidAmount,
      totalAmount: totalAmount,
      newPaymentStatus: newPaymentStatus,
      shouldBePaid: newPaidAmount >= totalAmount
    });

    await fixedExpense.update({
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      paidDate: newPaymentStatus === 'paid' ? (paymentDate || new Date().toISOString().split('T')[0]) : fixedExpense.paidDate
    });

    console.log('✅ FixedExpense actualizado:', {
      paidAmount: fixedExpense.paidAmount,
      paymentStatus: fixedExpense.paymentStatus
    });

    // 🆕 Si se pagó completamente, calcular siguiente nextDueDate
    if (newPaymentStatus === 'paid') {
      // 🔧 FIX: Solo resetear gastos recurrentes, NO bonos únicos
      const isRecurringExpense = fixedExpense.frequency &&
        fixedExpense.frequency !== 'one-time' &&
        !fixedExpense.name?.toLowerCase().includes('bono');

      if (isRecurringExpense) {
        // 🔧 FIX: Usar fecha de vencimiento original, NO fecha de pago
        // Los gastos fijos mantienen su día específico independientemente de cuándo se paguen
        const currentDueDate = fixedExpense.nextDueDate ? 
          new Date(fixedExpense.nextDueDate) : 
          new Date(fixedExpense.startDate || new Date());
        
        const nextDueDate = calculateNextDueDate(currentDueDate, fixedExpense.frequency);
        if (nextDueDate) {
          await fixedExpense.update({
            nextDueDate: nextDueDate.toISOString().split('T')[0],
            paymentStatus: 'unpaid', // Reset para el siguiente período
            paidAmount: 0 // Reset SOLO para gastos recurrentes
          });
          console.log('🔄 Siguiente período configurado para gasto recurrente:', {
            nextDueDate: nextDueDate.toISOString().split('T')[0],
            frequency: fixedExpense.frequency
          });
        }
      } else {
        console.log('💡 Gasto único/bono - NO se resetea el paidAmount:', {
          name: fixedExpense.name,
          frequency: fixedExpense.frequency,
          paidAmount: fixedExpense.paidAmount
        });
      }
    }

    // Recargar el gasto fijo para obtener valores actualizados
    await fixedExpense.reload();

    // Recargar con relaciones
    const paymentWithDetails = await FixedExpensePayment.findByPk(payment.idPayment, {
      include: [
        {
          model: Expense,
          as: 'generatedExpense'
        },
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Usar valores actualizados después del update
    const updatedTotalAmount = totalAmount;
    const updatedPaidAmount = newPaidAmount;
    const updatedRemainingAmount = updatedTotalAmount - updatedPaidAmount;
    const updatedPaymentStatus = newPaymentStatus;

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      payment: paymentWithDetails,
      expenseId: finalExpenseId, // 🔄 Corregido: usar finalExpenseId en lugar de expense
      fixedExpense: {
        idFixedExpense: fixedExpense.idFixedExpense,
        name: fixedExpense.name,
        totalAmount: updatedTotalAmount.toFixed(2),
        paidAmount: updatedPaidAmount.toFixed(2),
        remainingAmount: updatedRemainingAmount.toFixed(2),
        paymentStatus: updatedPaymentStatus
      },
      fixedExpenseBalance: {
        totalAmount: updatedTotalAmount.toFixed(2),
        paidAmount: updatedPaidAmount.toFixed(2),
        remainingAmount: updatedRemainingAmount.toFixed(2),
        paymentStatus: updatedPaymentStatus,
        isFullyPaid: updatedPaymentStatus === 'paid'
      }
    });

  } catch (error) {
    console.error('❌ Error al registrar pago parcial:', error);
    res.status(500).json({ 
      message: 'Error al registrar el pago',
      error: error.message 
    });
  }
};

/**
 * 📋 Obtener historial de pagos de un gasto fijo
 * GET /api/fixed-expenses/:id/payments
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { id: fixedExpenseId } = req.params;

    const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
    if (!fixedExpense) {
      return res.status(404).json({ message: 'Gasto fijo no encontrado' });
    }

    const payments = await FixedExpensePayment.findAll({
      where: { fixedExpenseId },
      attributes: [
        'idPayment',
        'amount',
        'paymentDate',
        'paymentMethod',
        'notes',
        'receiptUrl',      // ✅ Incluir URL del comprobante
        'receiptPublicId', // ✅ Incluir ID de Cloudinary
        'createdAt'
      ],
      include: [
        {
          model: Expense,
          as: 'generatedExpense',
          attributes: ['idExpense', 'date', 'amount', 'typeExpense', 'paymentMethod', 'notes']
        },
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    const totalAmount = parseFloat(fixedExpense.totalAmount);
    const paidAmount = parseFloat(fixedExpense.paidAmount || 0);

    res.json({
      fixedExpense: {
        id: fixedExpense.idFixedExpense,
        name: fixedExpense.name,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        remainingAmount: (totalAmount - paidAmount).toFixed(2),
        paymentStatus: fixedExpense.paymentStatus
      },
      payments,
      summary: {
        totalPayments: payments.length,
        totalPaid: paidAmount.toFixed(2),
        remaining: (totalAmount - paidAmount).toFixed(2),
        percentagePaid: ((paidAmount / totalAmount) * 100).toFixed(2)
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener historial de pagos:', error);
    res.status(500).json({ 
      message: 'Error al obtener el historial',
      error: error.message 
    });
  }
};

/**
 * 🗑️ Eliminar un pago parcial (rollback)
 * DELETE /api/fixed-expense-payments/:paymentId
 */
const deletePartialPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await FixedExpensePayment.findByPk(paymentId, {
      include: [
        {
          model: FixedExpense,
          as: 'fixedExpense'
        },
        {
          model: Expense,
          as: 'generatedExpense'
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const fixedExpense = payment.fixedExpense;
    const paymentAmount = parseFloat(payment.amount);
    const currentPaidAmount = parseFloat(fixedExpense.paidAmount || 0);
    const newPaidAmount = Math.max(0, currentPaidAmount - paymentAmount); // No permitir negativos

    // Eliminar el Expense asociado
    if (payment.expenseId) {
      // Eliminar Receipt asociado al Expense si existe
      try {
        await Receipt.destroy({ 
          where: { 
            relatedModel: 'Expense',
            relatedId: payment.expenseId 
          } 
        });
        console.log('✅ Receipt eliminado del Expense');
      } catch (receiptError) {
        console.error('⚠️ Error al eliminar Receipt:', receiptError);
        // Continuar aunque falle
      }
      
      // Eliminar el Expense
      await Expense.destroy({ where: { idExpense: payment.expenseId } });
      console.log('✅ Expense eliminado:', payment.expenseId);
    }

    // Eliminar comprobante de Cloudinary si existe
    if (payment.receiptPublicId) {
      await deleteFromCloudinary(payment.receiptPublicId);
      console.log('✅ Comprobante eliminado de Cloudinary');
    }

    // 🏦 ROLLBACK DE TRANSACCIONES BANCARIAS
    let revertedBankTransaction = null;
    if (payment.expenseId && payment.paymentMethod) {
      try {
        const { BankAccount, BankTransaction } = require('../data');
        const { isBankAccount, getAccountName } = require('../utils/bankTransactionHelper');
        
        // Solo si es un método de pago bancario
        if (isBankAccount(payment.paymentMethod)) {
          // Buscar la transacción bancaria relacionada con este expense
          const bankTransaction = await BankTransaction.findOne({
            where: {
              relatedExpenseId: payment.expenseId,
              transactionType: 'withdrawal',
              amount: paymentAmount
            }
          });

          if (bankTransaction) {
            // Buscar la cuenta bancaria
            const bankAccount = await BankAccount.findByPk(bankTransaction.bankAccountId);

            if (bankAccount) {
              // Restaurar el balance (devolver el dinero a la cuenta)
              const newBalance = parseFloat(bankAccount.currentBalance) + paymentAmount;
              await bankAccount.update({ currentBalance: newBalance });

              // Eliminar la transacción bancaria
              await bankTransaction.destroy();

              revertedBankTransaction = {
                accountName: bankAccount.accountName,
                amount: paymentAmount,
                previousBalance: parseFloat(bankAccount.currentBalance),
                newBalance: newBalance
              };

              console.log(`✅ [BANK ROLLBACK] ${bankAccount.accountName} +$${paymentAmount} → Balance: $${newBalance.toFixed(2)}`);
            }
          } else {
            console.log(`ℹ️ [BANK] No se encontró transacción bancaria para el expense ${payment.expenseId}`);
          }
        }
      } catch (bankError) {
        console.error('❌ [BANK ROLLBACK] Error revirtiendo transacción bancaria:', bankError.message);
        // Continuar con la eliminación aunque falle el rollback bancario
      }
    }

    // Actualizar el gasto fijo
    const totalAmount = parseFloat(fixedExpense.totalAmount);
    const newStatus = newPaidAmount >= totalAmount ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'unpaid');
    
    await fixedExpense.update({
      paidAmount: newPaidAmount,
      paymentStatus: newStatus,
      paidDate: newPaidAmount <= 0 ? null : fixedExpense.paidDate
    });
    
    console.log(`✅ FixedExpense actualizado después del rollback:`, {
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      totalAmount: totalAmount
    });

    // Eliminar el pago
    await payment.destroy();

    res.json({
      message: 'Pago eliminado exitosamente',
      deletedPayment: {
        id: paymentId,
        amount: paymentAmount.toFixed(2)
      },
      fixedExpense: {
        idFixedExpense: fixedExpense.idFixedExpense,
        paidAmount: newPaidAmount.toFixed(2),
        paymentStatus: newPaymentStatus
      },
      updatedBalance: {
        totalAmount: fixedExpense.totalAmount,
        paidAmount: newPaidAmount.toFixed(2),
        remainingAmount: (parseFloat(fixedExpense.totalAmount) - newPaidAmount).toFixed(2),
        paymentStatus: newPaymentStatus
      },
      rollback: {
        expenseDeleted: payment.expenseId ? true : false,
        bankTransactionReverted: revertedBankTransaction !== null,
        bankAccountUpdated: revertedBankTransaction ? {
          accountName: revertedBankTransaction.accountName,
          restoredAmount: revertedBankTransaction.amount.toFixed(2),
          newBalance: revertedBankTransaction.newBalance.toFixed(2)
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar pago:', error);
    res.status(500).json({ 
      message: 'Error al eliminar el pago',
      error: error.message 
    });
  }
};

module.exports = {
  addPartialPayment,
  getPaymentHistory,
  deletePartialPayment
};
