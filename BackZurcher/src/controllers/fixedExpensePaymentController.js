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
const { validateNoDuplicatePeriod, validatePaymentPeriod } = require('../utils/paymentPeriodValidator');
const { calculateNextDueDate: calculateNextDueDateFromExpenseController } = require('./fixedExpenseController');

/**
 * 🔴 CRITICAL: Helper para normalizar fechas sin perder un día por timezone
 * NUNCA usa new Date(string) porque interpreta en zona local
 */
function normalizeDateString(dateString) {
  // Si es undefined o null, retornar null (sin error)
  if (dateString === undefined || dateString === null) {
    return null;
  }
  
  // Si ya es string en formato YYYY-MM-DD, retornar como-está
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Si es Date object, convertir a string ISO (UTC)
  if (dateString instanceof Date) {
    return dateString.toISOString().split('T')[0];
  }
  
  // Si es string pero con hora (ISO format), extraer solo la fecha
  if (typeof dateString === 'string' && dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  // Si es string en otro formato, intentar parsearlo
  if (typeof dateString === 'string') {
    // Intentar validar que al menos tenga números
    const parts = dateString.split('-');
    if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
      return dateString;
    }
  }
  
  throw new Error(`Fecha inválida o formato no soportado: ${dateString}`);
}

/**
 * 🔧 Helper para obtener el último día de un mes sin problemas de timezone
 */
function getLastDayOfMonth(year, month) {
  // Validar inputs
  if (isNaN(year) || isNaN(month)) {
    throw new Error(`getLastDayOfMonth: parámetros inválidos (year=${year}, month=${month})`);
  }
  
  // month es 0-indexed (0 = enero, 11 = diciembre)
  const firstDayNextMonth = new Date(Date.UTC(year, month + 1, 1));
  
  // Validar que la fecha sea válida
  if (isNaN(firstDayNextMonth.getTime())) {
    throw new Error(`getLastDayOfMonth: fecha UTC inválida (year=${year}, month=${month})`);
  }
  
  const lastDay = new Date(Date.UTC(firstDayNextMonth.getUTCFullYear(), firstDayNextMonth.getUTCMonth(), firstDayNextMonth.getUTCDate() - 1));
  
  const result = lastDay.toISOString().split('T')[0];
  
  if (!result || !result.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error(`getLastDayOfMonth: resultado inválido (${result}) para year=${year}, month=${month}`);
  }
  
  return result;
}

/**
 * �🔄 Calcular la siguiente fecha de vencimiento
 * IMPORTANTE: Mantiene el día del mes original incluso si no existe en el nuevo mes
 * @param {Date} currentDueDate - Fecha de vencimiento actual
 * @param {string} frequency - Frecuencia del gasto fijo
 * @returns {Date} - Nueva fecha de vencimiento
 *//**
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
      receiptPublicId, // 🆕 Public ID del receipt ya creado
      periodStart, // 🆕 Nuevo campo: inicio del período pagado
      periodEnd,   // 🆕 Nuevo campo: fin del período pagado
      periodDueDate // 🆕 Nuevo campo: fecha de vencimiento del período pagado
    } = req.body;

    console.log('📥 Datos recibidos:', { 
      amount, 
      paymentDate, 
      paymentMethod, 
      notes, 
      staffId, 
      expenseId, 
      skipExpenseCreation,
      periodStart,
      periodEnd,
      periodDueDate,
      hasReceiptUrl: !!receiptUrl 
    });
    console.log('📎 Archivo:', req.file);

    // Validaciones básicas
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }

    if (!paymentDate) {
      return res.status(400).json({ message: 'La fecha de pago es requerida' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'El método de pago es requerido' });
    }

    // Buscar el gasto fijo
    const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
    if (!fixedExpense) {
      return res.status(404).json({ message: 'Gasto fijo no encontrado' });
    }

    // 🆕 VALIDACIÓN: No duplicar pagos del mismo período
    const existingPayments = await FixedExpensePayment.findAll({
      where: { fixedExpenseId }
    });

    // Usar periodDueDate para validación si está disponible, sino usar paymentDate
    const dateForValidation = periodDueDate || paymentDate;
    
    const periodValidation = validateNoDuplicatePeriod(
      existingPayments,
      dateForValidation,
      fixedExpense.frequency
    );

    if (!periodValidation.isValid) {
      console.warn('⚠️ Intento de duplicar pago:', periodValidation.message);
      return res.status(400).json({
        conflictingPayment: periodValidation.conflictingPayment
      });
    }

    // 🆕 VALIDACIÓN: Período pagado válido - Validar que no sean 'Invalid date' o null
    if (periodStart === 'Invalid date' || periodEnd === 'Invalid date' || periodDueDate === 'Invalid date') {
      return res.status(400).json({ message: 'Los campos de período contienen fechas inválidas' });
    }

    if (periodStart && periodEnd) {
      const periodValidationResult = validatePaymentPeriod(periodStart, periodEnd);
      if (!periodValidationResult.isValid) {
        return res.status(400).json({ message: periodValidationResult.message });
      }
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
        date: normalizeDateString(paymentDate || new Date().toISOString().split('T')[0]),
        amount: paymentAmount,
        typeExpense: 'Gasto Fijo',
        paymentMethod: paymentMethod || fixedExpense.paymentMethod || 'Otro',
        notes: notes || `Pago parcial de: ${fixedExpense.name}`,
        paymentStatus: 'paid',
        paidDate: normalizeDateString(paymentDate || new Date().toISOString().split('T')[0]),
        staffId: staffId || fixedExpense.createdByStaffId,
        relatedFixedExpenseId: fixedExpenseId,
        vendor: fixedExpense.vendor,
        // Guardar período pagado como metadato en Expense (opcional)
        periodStart: normalizeDateString(periodStart) || null,
        periodEnd: normalizeDateString(periodEnd) || null,
        periodDueDate: normalizeDateString(periodDueDate) || null
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
    // 🔴 CRÍTICO: Normalizar paymentDate para evitar pérdida de un día por timezone
    const normalizedPaymentDate = normalizeDateString(paymentDate || new Date().toISOString().split('T')[0]);
    
    const payment = await FixedExpensePayment.create({
      fixedExpenseId,
      amount: paymentAmount,
      paymentDate: normalizedPaymentDate,
      paymentMethod: paymentMethod || fixedExpense.paymentMethod || 'Otro',
      receiptUrl: finalReceiptUrl,
      receiptPublicId: finalReceiptPublicId,
      notes,
      expenseId: finalExpenseId,
      createdByStaffId: staffId || fixedExpense.createdByStaffId,
      periodStart: normalizeDateString(periodStart) || null,
      periodEnd: normalizeDateString(periodEnd) || null,
      periodDueDate: normalizeDateString(periodDueDate) || null
    });

    console.log('✅ Payment creado:', payment.idPayment);

    // 3️⃣ Actualizar el gasto fijo con el nuevo pago
    // Para gastos fijos recurrentes: cada pago es para UN período específico, no acumulativo
    // Por eso resetear paidAmount a paymentAmount para ese período, no sumarlo
    const newPaidAmount = paymentAmount; // IMPORTANTE: Reemplazar, NO sumar
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
      paidDate: newPaymentStatus === 'paid' ? normalizeDateString(paymentDate || new Date().toISOString().split('T')[0]) : fixedExpense.paidDate
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
        // 🔧 CRITICAL FIX: Calcular nextDueDate desde el período ACTUAL (nextDueDate), no desde hoy
        // Ejemplo: Si nextDueDate es 30 ene, el siguiente debe ser 28/29 feb (respetando días del mes)
        // ✅ AHORA: Pasar como STRING (ISO format) a la función correcta que retorna STRING
        const baseDateString = fixedExpense.nextDueDate || fixedExpense.startDate;
        const nextDueDateString = calculateNextDueDateFromExpenseController(baseDateString, fixedExpense.frequency);
        
        if (nextDueDateString) {
          // 🆕 Guardar como "paid_pending_next" para indicar que está pagado pero hay próximo período
          // El frontend filtrará esto correctamente
          await fixedExpense.update({
            nextDueDate: nextDueDateString,
            paymentStatus: 'unpaid', // Para el siguiente período
            paidAmount: 0 // Reset SOLO para gastos recurrentes
          });
          console.log('🔄 Siguiente período configurado para gasto recurrente:', {
            currentDueDate: fixedExpense.nextDueDate,
            nextDueDate: nextDueDateString, // ✅ Ya es string
            frequency: fixedExpense.frequency,
            currentDate: new Date().toISOString().split('T')[0],
            isPastDue: new Date(nextDueDateString) <= new Date()
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
    const { page = 1, limit = 20 } = req.query;

    const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
    if (!fixedExpense) {
      return res.status(404).json({ message: 'Gasto fijo no encontrado' });
    }

    // Obtener pagos con paginación
    const { count, rows: payments } = await FixedExpensePayment.findAndCountAll({
      where: { fixedExpenseId },
      attributes: [
        'idPayment',
        'amount',
        'paymentDate',
        'paymentMethod',
        'notes',
        'receiptUrl',
        'receiptPublicId',
        'periodStart',      // 🆕 Incluir período
        'periodEnd',        // 🆕 Incluir período
        'periodDueDate',    // 🆕 Incluir período
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
      order: [['paymentDate', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    const totalAmount = parseFloat(fixedExpense.totalAmount);
    const paidAmount = parseFloat(fixedExpense.paidAmount || 0);

    // 🆕 Obtener todos los receipts para los expenses de los pagos
    const expenseIds = payments.filter(p => p.generatedExpense?.idExpense).map(p => p.generatedExpense.idExpense);
    console.log('🔍 expenseIds para buscar receipts:', expenseIds);
    const receiptsMap = {};
    
    if (expenseIds.length > 0) {
      console.log('🔍 Buscando receipts con expenseIds:', expenseIds.map(id => id.toString()));
      const allReceipts = await Receipt.findAll({
        where: {
          relatedId: {
            [Op.in]: expenseIds.map(id => id.toString()) // Convertir a string para comparar con VARCHAR
          },
          relatedModel: 'Expense'
        }
      });
      
      console.log('📦 Receipts encontrados:', allReceipts.length);
      console.log('📦 Detalles de receipts:', allReceipts.map(r => ({
        idReceipt: r.idReceipt,
        relatedId: r.relatedId,
        relatedModel: r.relatedModel,
        fileUrl: r.fileUrl
      })));
      
      // Agrupar receipts por expenseId
      allReceipts.forEach(receipt => {
        console.log(`  └─ Agrupando receipt ${receipt.idReceipt} para expense ${receipt.relatedId}`);
        if (!receiptsMap[receipt.relatedId]) {
          receiptsMap[receipt.relatedId] = [];
        }
        receiptsMap[receipt.relatedId].push({
          idReceipt: receipt.idReceipt,
          fileUrl: receipt.fileUrl,
          originalName: receipt.originalName,
          mimeType: receipt.mimeType,
          type: receipt.type
        });
      });
      
      console.log('📋 ReceiptsMap final:', Object.keys(receiptsMap));
    }

    res.json({
      fixedExpense: {
        id: fixedExpense.idFixedExpense,
        name: fixedExpense.name,
        frequency: fixedExpense.frequency,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        remainingAmount: (totalAmount - paidAmount).toFixed(2),
        paymentStatus: fixedExpense.paymentStatus,
        nextDueDate: fixedExpense.nextDueDate, // 🆕 Próximo vencimiento
        description: fixedExpense.description,
        category: fixedExpense.category
      },
      payments: payments.map(p => ({
        idPayment: p.idPayment,
        amount: parseFloat(p.amount),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        
        // 🆕 Información del período
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        periodDueDate: p.periodDueDate,
        periodDescription: p.periodStart && p.periodEnd ? (() => {
          // 🔴 CRITICAL: NO usar new Date(dateString) porque interpreta en timezone local
          // Parsear manualmente: YYYY-MM-DD
          const [startYear, startMonth, startDay] = p.periodStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = p.periodEnd.split('-').map(Number);
          
          if (!startYear || !startMonth || !endYear || !endMonth) {
            return 'Sin período especificado';
          }
          
          const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
          const monthName = startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
          
          return `${monthName} (${startDay}-${endDay})`;
        })() :
          'Sin período especificado',
        
        notes: p.notes,
        receiptUrl: p.receiptUrl,
        fileUrl: p.receiptUrl, // 🆕 Alias para compatibilidad con frontend
        receiptPublicId: p.receiptPublicId,
        
        // 🆕 Traer receipts del Expense asociado (obtenidos de forma manual)
        // El relatedId se guarda como string en la BD, así que convertir idExpense a string
        receipts: (() => {
          const expenseIdStr = p.generatedExpense?.idExpense?.toString();
          const foundReceipts = receiptsMap[expenseIdStr] || [];
          console.log(`  📎 Pago ${p.idPayment} -> Expense ${expenseIdStr} -> ${foundReceipts.length} receipts`);
          return foundReceipts;
        })(),
        
        // Expense generado
        generatedExpense: p.generatedExpense ? {
          idExpense: p.generatedExpense.idExpense,
          date: p.generatedExpense.date,
          amount: parseFloat(p.generatedExpense.amount),
          typeExpense: p.generatedExpense.typeExpense
        } : null,
        
        createdBy: p.createdBy,
        createdAt: p.createdAt
      })),
      
      summary: {
        totalPayments: count,
        totalPaid: paidAmount.toFixed(2),
        remaining: (totalAmount - paidAmount).toFixed(2),
        percentagePaid: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(2) : 0
      },
      
      // 🆕 Información de paginación
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
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

// 🆕 Obtener períodos pendientes de pago para un gasto fijo
// 🔧 LÓGICA CORREGIDA: Genera períodos mensuales COMPLETOS desde el mes SIGUIENTE
// 🔴 CRÍTICO: Usa normalizeDateString para evitar problemas de timezone
async function getPendingPaymentPeriods(req, res) {
  try {
    const { fixedExpenseId } = req.params;

    // Obtener el gasto fijo
    const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
    if (!fixedExpense) {
      return res.status(404).json({
        error: 'Gasto fijo no encontrado',
        message: `No existe gasto fijo con ID: ${fixedExpenseId}`
      });
    }
    // 🔴 CRÍTICO: Normalizar la fecha de inicio sin perder un día
    const startDateString = normalizeDateString(fixedExpense.startDate);
    const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allPeriods = [];

    // ✅ Helper: Agregar días a una fecha (YYYY-MM-DD format)
    const addDays = (dateStr, days) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCDate(date.getUTCDate() + days);
      const newYear = date.getUTCFullYear();
      const newMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
      const newDay = String(date.getUTCDate()).padStart(2, '0');
      return `${newYear}-${newMonth}-${newDay}`;
    };

    // ✅ Helper: Agregar meses a una fecha (YYYY-MM-DD format)
    const addMonths = (dateStr, months) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      let newMonth = month + months;
      let newYear = year;
      while (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      while (newMonth < 1) {
        newMonth += 12;
        newYear -= 1;
      }
      
      // Ajustar el día si no existe en el nuevo mes (ej: 31 enero → febrero)
      const lastDay = parseInt(getLastDayOfMonth(newYear, newMonth - 1).split('-')[2]);
      const finalDay = Math.min(day, lastDay);
      
      return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
    };

    // Generar períodos según la frecuencia
    let periodStart = startDateString;
    
    while (true) {
      let periodEnd;
      
      switch (fixedExpense.frequency) {
        case 'weekly':
          // Período de 7 días
          periodEnd = addDays(periodStart, 6); // Incluye 7 días totales (0-6)
          break;
        
        case 'biweekly':
          // Período de 14 días
          periodEnd = addDays(periodStart, 13); // Incluye 14 días totales (0-13)
          break;
        
        case 'monthly':
          // Período mensual (1st del mes actual hasta último del próximo mes)
          const [startYear, startMonth, startDay] = periodStart.split('-').map(Number);
          let endMonth = startMonth + 1;
          let endYear = startYear;
          if (endMonth > 12) {
            endMonth = 1;
            endYear += 1;
          }
          const endMonthIndex = endMonth - 1;
          const lastDayEndMonth = parseInt(getLastDayOfMonth(endYear, endMonthIndex).split('-')[2]);
          
          let endDay;
          if (startDay >= 28) {
            endDay = lastDayEndMonth;
          } else {
            endDay = Math.min(startDay, lastDayEndMonth);
          }
          periodEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
          break;
        
        case 'quarterly':
          // Período de 3 meses
          periodEnd = addMonths(periodStart, 2); // Sumar 2 para completar 3 meses
          break;
        
        case 'semiannual':
          // Período de 6 meses
          periodEnd = addMonths(periodStart, 5); // Sumar 5 para completar 6 meses
          break;
        
        case 'annual':
          // Período de 12 meses (1 año)
          periodEnd = addMonths(periodStart, 11); // Sumar 11 para completar 12 meses
          break;
        
        default:
          // Por defecto, mensual
          periodEnd = addMonths(periodStart, 1);
      }
      
      allPeriods.push({
        periodStart,
        periodEnd,
        dueDate: periodEnd,
        displayDate: new Date(`${periodEnd}T00:00:00Z`).toLocaleDateString('es-ES')
      });
      
      // Verificar si el período termina en el futuro
      if (periodEnd > today.toISOString().split('T')[0]) {
        break;
      }
      
      // Avanzar al siguiente período
      periodStart = addDays(periodEnd, 1); // El siguiente período empieza el día después del anterior
    }

    // Obtener todos los pagos registrados para este gasto
    const payments = await FixedExpensePayment.findAll({
      where: { fixedExpenseId },
      attributes: ['periodStart', 'periodEnd', 'periodDueDate'],
      raw: true
    });

    // Construir map de períodos pagados
    const paidPeriodMap = new Map();
    payments.forEach(payment => {
      if (payment.periodStart && payment.periodEnd) {
        const key = `${payment.periodStart}_${payment.periodEnd}`;
        paidPeriodMap.set(key, true);
      }
    });

    // Filtrar períodos vencidos y no pagados
    const todayString = today.toISOString().split('T')[0];
    const pendingPeriods = allPeriods
      .filter(period => {
        // Solo si ha vencido (dueDate <= hoy)
        if (period.dueDate > todayString) return false;
        
        // Solo si NO está pagado
        const periodKey = `${period.periodStart}_${period.periodEnd}`;
        return !paidPeriodMap.has(periodKey);
      })
      .map(period => ({
        date: period.dueDate,
        displayDate: period.displayDate,
        startDate: period.periodStart,
        endDate: period.periodEnd,
        dueDate: period.dueDate,
        isPaid: false,
        status: 'pendiente',
        isOverdue: period.dueDate < todayString
      }));

    res.json({
      fixedExpenseId,
      fixedExpenseName: fixedExpense.name,
      totalAmount: fixedExpense.totalAmount,
      frequency: fixedExpense.frequency,
      nextDueDate: fixedExpense.nextDueDate,
      paymentStatus: fixedExpense.paymentStatus,
      pendingPeriods: pendingPeriods,
      pendingCount: pendingPeriods.length,
      totalPaidAmount: fixedExpense.paidAmount,
      message: pendingPeriods.length === 0 
        ? 'No hay períodos pendientes de pago' 
        : `${pendingPeriods.length} período(s) pendiente(s) de pago`
    });

  } catch (error) {
    console.error('❌ Error obteniendo períodos pendientes:', error);
    res.status(500).json({
      error: 'Error al obtener períodos pendientes',
      message: error.message
    });
  }
}

module.exports = {
  addPartialPayment,
  getPaymentHistory,
  deletePartialPayment,
  getPendingPaymentPeriods
};
