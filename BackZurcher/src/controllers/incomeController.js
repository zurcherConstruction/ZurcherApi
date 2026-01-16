const { Income, Staff, Receipt, Work, sequelize } = require('../data');
const { Op } = require('sequelize');
const { sendNotifications } = require('../utils/notifications/notificationManager');
const { createDepositTransaction } = require('../utils/bankTransactionHelper');

// 🔧 Helper: Normalizar fecha de ISO a YYYY-MM-DD (acepta ambos formatos)
const normalizeDateToLocal = (dateInput) => {
  if (!dateInput) return null;
  
  // Si ya es formato YYYY-MM-DD (10 caracteres), devolverlo tal cual
  if (typeof dateInput === 'string' && dateInput.length === 10 && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateInput;
  }
  
  // Si es formato ISO completo (ej: 2025-10-22T12:34:56.789Z), convertir a fecha local
  try {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Error normalizando fecha:', dateInput, e);
    return dateInput; // Devolver el original si falla
  }
};

// Crear un nuevo ingreso
const createIncome = async (req, res) => {
  let { date, amount, typeIncome, notes, workId, staffId, paymentMethod, paymentDetails, verified, simpleWorkId } = req.body;
  
  // ✅ Normalizar fecha (acepta ISO completo o YYYY-MM-DD)
  date = normalizeDateToLocal(date);
  
  // Iniciar transacción de base de datos
  const transaction = await sequelize.transaction();
  
  try {
    // ✅ VALIDACIÓN: paymentMethod es OBLIGATORIO
    if (!paymentMethod) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'El método de pago es obligatorio',
        message: 'Debe seleccionar un método de pago para registrar el ingreso'
      });
    }

    const newIncome = await Income.create({ 
      date, 
      amount, 
      typeIncome, 
      notes, 
      workId, 
      staffId, 
      paymentMethod, 
      paymentDetails,
      verified: verified || false 
    }, { transaction });

    // 🆕 CREAR SIMPLEWORKPAYMENT SI ES UN PAGO DE SIMPLEWORK
    if (simpleWorkId && typeIncome === 'Factura SimpleWork') {
      try {
        const { SimpleWork, SimpleWorkPayment } = require('../data');
        
        // Verificar que el SimpleWork existe
        const simpleWork = await SimpleWork.findByPk(simpleWorkId, { transaction });
        if (simpleWork) {
          // Crear SimpleWorkPayment
          await SimpleWorkPayment.create({
            simpleWorkId: simpleWorkId,
            amount: amount,
            paymentMethod: paymentMethod,
            paymentDate: date,
            description: notes,
            createdAt: new Date()
          }, { transaction });

          // Actualizar totalPaid en SimpleWork
          const totalPaid = await SimpleWorkPayment.sum('amount', {
            where: { simpleWorkId: simpleWorkId },
            transaction
          });

          await simpleWork.update({ 
            totalPaid: totalPaid || 0 
          }, { transaction });

          console.log(`✅ [SIMPLEWORK] Pago registrado: ${simpleWork.workNumber} +$${amount} → Total: $${totalPaid || 0}`);
        }
      } catch (simpleWorkError) {
        console.error('⚠️ Error procesando SimpleWork payment (no crítico):', simpleWorkError.message);
        // No hacer rollback, mantener el Income
      }
    }
    
    // 🏦 AUTO-CREAR BANK TRANSACTION SI EL PAGO ES A CUENTA BANCARIA
    try {
      await createDepositTransaction({
        paymentMethod,
        amount,
        date,
        description: `Ingreso: ${typeIncome}${workId ? ` (Work #${workId.slice(0, 8)})` : ''}`,
        relatedIncomeId: newIncome.idIncome,
        notes,
        createdByStaffId: staffId,
        transaction
      });
    } catch (bankError) {
      console.error('❌ Error creando transacción bancaria:', bankError.message);
      // No hacer rollback si es solo warning de cuenta no encontrada
      if (bankError.message.includes('Fondos insuficientes') || 
          bankError.message.includes('no encontrada')) {
        // Es un error crítico, hacer rollback
        throw bankError;
      }
    }
    
    // Commit de la transacción
    await transaction.commit();
    
    // Enviar notificaciones al equipo de finanzas
    try {
      // Obtener información adicional para la notificación
      const incomeWithDetails = await Income.findByPk(newIncome.idIncome, {
        include: [
          { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
          { model: Work, as: 'Work', attributes: ['idWork', 'propertyAddress'] }
        ]
      });

      // Preparar datos para la notificación
      const notificationData = {
        ...incomeWithDetails.toJSON(),
        propertyAddress: incomeWithDetails.work?.propertyAddress || null
      };

      // Enviar notificación
      await sendNotifications('incomeRegistered', notificationData);
      console.log(`✅ Notificación de ingreso enviada: $${amount} - ${typeIncome}`);
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de ingreso:', notificationError.message);
    }
    
    res.status(201).json(newIncome);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error al crear el ingreso', error: error.message });
  }
};

// Obtener todos los ingresos CON relaciones
const getAllIncomes = async (req, res) => {
  try {
    // Obtener ingresos con Staff
    const incomes = await Income.findAll({
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['date', 'DESC']]
    });

    // Obtener receipts por separado
    const incomeIds = incomes.map(income => income.idIncome);
    const receipts = await Receipt.findAll({
      where: {
        relatedModel: 'Income',
        relatedId: {
          [Op.in]: incomeIds.map(id => id.toString())
        }
      },
      attributes: ['idReceipt', 'relatedId', 'fileUrl', 'mimeType', 'originalName', 'notes']
    });

    // Asociar receipts manualmente
    const incomesWithReceipts = incomes.map(income => {
      const incomeReceipts = receipts.filter(receipt => 
        receipt.relatedId === income.idIncome.toString()
      );
      return {
        ...income.toJSON(),
        Receipts: incomeReceipts
      };
    });

    res.status(200).json(incomesWithReceipts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los ingresos', error: error.message });
  }
};

// Obtener un ingreso por ID CON relaciones
const getIncomeById = async (req, res) => {
  const { id } = req.params;
  try {
    const income = await Income.findByPk(id, {
      include: [
        {
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: Receipt,
          as: 'Receipts',
          required: false,
          on: {
            [Op.and]: [
              literal(`"Receipts"."relatedModel" = 'Income'`),
              literal(`"Income"."idIncome" = CAST("Receipts"."relatedId" AS UUID)`)
            ]
          },
          attributes: ['idReceipt', 'fileUrl', 'mimeType', 'originalName', 'notes'],
        }
      ]
    });
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });
    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el ingreso', error: error.message });
  }
};

// Actualizar un ingreso
const updateIncome = async (req, res) => {
  const { id } = req.params;
  let { date, amount, typeIncome, notes, workId, staffId, paymentMethod, paymentDetails, verified } = req.body; // Agregar paymentDetails
  
  // ✅ Normalizar fecha si se proporciona
  if (date) {
    date = normalizeDateToLocal(date);
  }
  
  try {
    const income = await Income.findByPk(id);
    if (!income) return res.status(404).json({ message: 'Ingreso no encontrado' });

    // Actualizar el ingreso
    await income.update({ date, amount, typeIncome, notes, workId, staffId, paymentMethod, paymentDetails, verified }); // Incluir paymentDetails
    
    // Enviar notificación de actualización (opcional - solo para cambios importantes)
    try {
      // Solo notificar si es un cambio significativo en el monto
      const originalAmount = parseFloat(income._previousDataValues?.amount || 0);
      const newAmount = parseFloat(amount || 0);
      const amountChanged = Math.abs(originalAmount - newAmount) > 0.01; // Cambio mayor a 1 centavo
      
      if (amountChanged) {
        // Obtener información actualizada para la notificación
        const incomeWithDetails = await Income.findByPk(id, {
          include: [
            { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
            { model: Work, as: 'work', attributes: ['idWork', 'propertyAddress'] } // ✅ Cambio de 'Work' a 'work'
          ]
        });

        // Preparar datos para la notificación
        const notificationData = {
          ...incomeWithDetails.toJSON(),
          propertyAddress: incomeWithDetails.work?.propertyAddress || 'Obra no especificada', // ✅ Cambio de Work a work
          // Agregar información del cambio
          previousAmount: originalAmount,
          newAmount: newAmount
        };

        // Usar el mismo tipo de notificación que para registros nuevos
        await sendNotifications('incomeRegistered', notificationData);
        console.log(`✅ Notificación de actualización de ingreso enviada: $${originalAmount} → $${newAmount}`);
      }
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de actualización de ingreso:', notificationError.message);
    }
    
    res.status(200).json(income);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el ingreso', error: error.message });
  }
};

// Eliminar un ingreso
const deleteIncome = async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  
  try {
    const income = await Income.findByPk(id, { transaction });
    if (!income) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Ingreso no encontrado' });
    }

    // 🏦 REVERTIR TRANSACCIÓN BANCARIA si existe
    let revertedBankTransaction = null;
    const { isBankAccount } = require('../utils/bankTransactionHelper');
    
    if (isBankAccount(income.paymentMethod)) {
      try {
        const { BankAccount, BankTransaction } = require('../data');
        
        // Buscar la transacción bancaria relacionada (deposit)
        const bankTransaction = await BankTransaction.findOne({
          where: {
            relatedIncomeId: income.idIncome,
            transactionType: 'deposit'
          },
          transaction
        });

        if (bankTransaction) {
          // Buscar la cuenta bancaria
          const bankAccount = await BankAccount.findByPk(bankTransaction.bankAccountId, { transaction });

          if (bankAccount) {
            // Restar el monto del balance (revertir el depósito)
            const transactionAmount = parseFloat(bankTransaction.amount);
            const newBalance = parseFloat(bankAccount.currentBalance) - transactionAmount;
            
            // Validar que no quede negativo
            if (newBalance < 0) {
              await transaction.rollback();
              return res.status(400).json({
                message: 'No se puede eliminar el ingreso: el balance de la cuenta quedaría negativo',
                accountName: bankAccount.accountName,
                currentBalance: parseFloat(bankAccount.currentBalance),
                incomeAmount: transactionAmount
              });
            }
            
            await bankAccount.update({ currentBalance: newBalance }, { transaction });

            // Eliminar la transacción bancaria
            await bankTransaction.destroy({ transaction });

            revertedBankTransaction = {
              accountName: bankAccount.accountName,
              amount: transactionAmount,
              newBalance: newBalance
            };

            console.log(`✅ [BANK] Transacción revertida al eliminar income: ${bankAccount.accountName} -$${transactionAmount} → Balance: $${newBalance.toFixed(2)}`);
          }
        }
      } catch (bankError) {
        console.error('❌ [BANK] Error revirtiendo transacción bancaria:', bankError.message);
        await transaction.rollback();
        return res.status(500).json({
          message: 'Error al revertir transacción bancaria',
          error: bankError.message
        });
      }
    }

    // Eliminar el income
    await income.destroy({ transaction });
    
    // 🆕 REVERTIR PAGO DE SIMPLEWORK SI EXISTE
    if (income.typeIncome === 'Factura SimpleWork') {
      try {
        const { SimpleWork, SimpleWorkPayment } = require('../data');
        
        // Buscar el SimpleWorkPayment correspondiente
        const simpleWorkPayment = await SimpleWorkPayment.findOne({
          where: {
            amount: income.amount,
            paymentDate: income.date,
            paymentMethod: income.paymentMethod
          },
          transaction
        });

        if (simpleWorkPayment) {
          const simpleWork = await SimpleWork.findByPk(simpleWorkPayment.simpleWorkId, { transaction });
          
          if (simpleWork) {
            // Eliminar el SimpleWorkPayment
            await simpleWorkPayment.destroy({ transaction });

            // Recalcular totalPaid
            const newTotalPaid = await SimpleWorkPayment.sum('amount', {
              where: { simpleWorkId: simpleWork.id },
              transaction
            }) || 0;

            await simpleWork.update({ 
              totalPaid: newTotalPaid 
            }, { transaction });

            console.log(`🔄 [SIMPLEWORK] Pago eliminado: ${simpleWork.workNumber} -$${income.amount} → Total: $${newTotalPaid.toFixed(2)}`);
          }
        }
      } catch (simpleWorkError) {
        console.error('⚠️ [SIMPLEWORK] Error revirtiendo pago (no crítico):', simpleWorkError.message);
      }
    }

    // Legacy: Revertir usando simpleWorkId directo (para compatibilidad con datos viejos)
    if (income.simpleWorkId) {
      try {
        const { SimpleWork } = require('../data');
        const simpleWork = await SimpleWork.findByPk(income.simpleWorkId, { transaction });
        
        if (simpleWork) {
          const currentTotalPaid = parseFloat(simpleWork.totalPaid || 0);
          const incomeAmount = parseFloat(income.amount || 0);
          const newTotalPaid = Math.max(0, currentTotalPaid - incomeAmount);
          
          await simpleWork.update({ 
            totalPaid: newTotalPaid,
            // También actualizar el status si es necesario
            status: newTotalPaid === 0 ? 'sent' : 'invoiced'
          }, { transaction });
          
          console.log(`🔄 [SIMPLEWORK] Pago legacy revertido: ${simpleWork.workNumber} -$${incomeAmount.toFixed(2)} → Total: $${newTotalPaid.toFixed(2)}`);
        }
      } catch (simpleWorkError) {
        console.error('⚠️ [SIMPLEWORK] Error revirtiendo pago legacy (no crítico):', simpleWorkError.message);
      }
    }
    
    await transaction.commit();

    res.status(200).json({
      message: 'Ingreso eliminado correctamente',
      revertedBankTransaction: revertedBankTransaction
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error al eliminar el ingreso', error: error.message });
  }
};

// Obtener tipos de ingreso disponibles (desde el modelo ENUM)
const getIncomeTypes = async (req, res) => {
  try {
    // Los tipos vienen del ENUM definido en el modelo Income
    const types = [
      'Factura Pago Inicial Budget',
      'Factura Pago Final Budget',
      'DiseñoDif',
      'Comprobante Ingreso'
    ];
    
    res.status(200).json({ types });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tipos de ingreso', error: error.message });
  }
};

module.exports = {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
  getIncomeTypes,
};