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
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUploader');

/**
 * 💰 Registrar un pago parcial
 * POST /api/fixed-expenses/:id/payments
 */
const addPartialPayment = async (req, res) => {
  try {
    const { id: fixedExpenseId } = req.params;
    const { amount, paymentDate, paymentMethod, notes, staffId } = req.body;

    console.log('📥 Datos recibidos:', { amount, paymentDate, paymentMethod, notes, staffId });
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

    // Validar que no se pague más del saldo restante
    if (paymentAmount > remainingAmount + 0.01) { // Tolerancia para decimales
      return res.status(400).json({ 
        message: `El pago de $${paymentAmount} excede el saldo restante de $${remainingAmount.toFixed(2)}`,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        remainingAmount: remainingAmount.toFixed(2)
      });
    }

    // Subir comprobante a Cloudinary si existe
    let receiptUrl = null;
    let receiptPublicId = null;
    
    console.log('📋 req.file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
    
    if (req.file) {
      try {
        console.log('📤 Subiendo comprobante a Cloudinary...');
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
          folder: 'fixed_expense_receipts',
          resource_type: 'auto' // Permite PDF e imágenes
        });
        receiptUrl = uploadResult.secure_url;
        receiptPublicId = uploadResult.public_id;
        console.log('✅ Comprobante subido:', receiptUrl);
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

    console.log('✅ Expense creado:', expense.idExpense);

    // 1.5️⃣ Crear el Receipt si hay comprobante
    if (receiptUrl && receiptPublicId) {
      try {
        await Receipt.create({
          relatedModel: 'Expense',
          relatedId: expense.idExpense,
          type: 'Gasto Fijo',
          notes: notes || `Comprobante de pago parcial: ${fixedExpense.name}`,
          fileUrl: receiptUrl,
          publicId: receiptPublicId,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname
        });
        console.log('✅ Receipt creado para Expense:', expense.idExpense);
      } catch (receiptError) {
        console.error('❌ Error al crear Receipt:', receiptError);
        // Continuar aunque falle el Receipt
      }
    }

    // 2️⃣ Registrar el pago parcial
    const payment = await FixedExpensePayment.create({
      fixedExpenseId,
      amount: paymentAmount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || fixedExpense.paymentMethod || 'Otro',
      receiptUrl,
      receiptPublicId,
      notes,
      expenseId: expense.idExpense,
      createdByStaffId: staffId || fixedExpense.createdByStaffId
    });

    console.log('✅ Payment creado:', payment.idPayment);

    // 3️⃣ Actualizar el monto pagado y estado del gasto fijo
    const newPaidAmount = paidAmount + paymentAmount;
    const newRemainingAmount = totalAmount - newPaidAmount;
    
    let newPaymentStatus = 'partial';
    if (newRemainingAmount <= 0.01) { // Tolerancia para decimales
      newPaymentStatus = 'paid';
    }

    await fixedExpense.update({
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      paidDate: newPaymentStatus === 'paid' ? (paymentDate || new Date()) : fixedExpense.paidDate
    });

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

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      payment: paymentWithDetails,
      expenseCreated: expense,
      fixedExpense: {
        idFixedExpense: fixedExpense.idFixedExpense,
        name: fixedExpense.name,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: newPaidAmount.toFixed(2),
        remainingAmount: newRemainingAmount.toFixed(2),
        paymentStatus: newPaymentStatus
      },
      fixedExpenseBalance: {
        totalAmount: totalAmount.toFixed(2),
        paidAmount: newPaidAmount.toFixed(2),
        remainingAmount: newRemainingAmount.toFixed(2),
        paymentStatus: newPaymentStatus,
        isFullyPaid: newPaymentStatus === 'paid'
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
    const currentPaidAmount = parseFloat(fixedExpense.paidAmount);
    const newPaidAmount = currentPaidAmount - paymentAmount;

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

    // Actualizar el gasto fijo
    await fixedExpense.update({
      paidAmount: newPaidAmount,
      paymentStatus: newPaidAmount > 0 ? 'partial' : 'unpaid',
      paidDate: newPaidAmount <= 0 ? null : fixedExpense.paidDate
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
        paymentStatus: newPaidAmount > 0 ? 'partial' : 'unpaid'
      },
      updatedBalance: {
        totalAmount: fixedExpense.totalAmount,
        paidAmount: newPaidAmount.toFixed(2),
        remainingAmount: (parseFloat(fixedExpense.totalAmount) - newPaidAmount).toFixed(2),
        paymentStatus: newPaidAmount > 0 ? 'partial' : 'unpaid'
      },
      expenseDeleted: payment.expenseId ? true : false
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
