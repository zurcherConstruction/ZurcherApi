/**
 * Bank Transaction Controller
 * 
 * Gestiona transacciones bancarias:
 * - Crear depósitos (deposit)
 * - Crear retiros (withdrawal)
 * - Crear transferencias entre cuentas (transfer)
 * - Listar transacciones con filtros
 * - Eliminar transacciones (reversa de balance)
 */

const { BankAccount, BankTransaction, Income, Expense, SupplierInvoice, Staff, sequelize } = require('../data');
const { Op } = require('sequelize');

/**
 * Obtener fecha local en formato YYYY-MM-DD
 */
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * POST /api/bank-transactions/deposit
 * Registrar depósito (entrada de dinero)
 */
const createDeposit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      bankAccountId,
      amount,
      date = getLocalDateString(),
      description,
      category = 'income',
      relatedIncomeId = null,
      notes = null,
      createdByStaffId = null
    } = req.body;

    // Validaciones
    if (!bankAccountId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'bankAccountId y amount son obligatorios'
      });
    }

    if (parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    // Obtener cuenta
    const account = await BankAccount.findByPk(bankAccountId, { transaction });

    if (!account) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    if (!account.isActive) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'La cuenta bancaria no está activa'
      });
    }

    // Actualizar balance
    const newBalance = parseFloat(account.currentBalance) + parseFloat(amount);
    await account.update({ currentBalance: newBalance }, { transaction });

    // Crear Income si la categoría es 'income' y no hay relatedIncomeId
    let incomeId = relatedIncomeId;
    if (category === 'income' && !relatedIncomeId) {
      // Mapear accountName a paymentMethod válido en Income
      const accountToPaymentMethod = {
        'Caja Chica': 'Efectivo',
        'Chase Bank': 'Chase Bank',
        'Proyecto Septic BOFA': 'Proyecto Septic BOFA'
      };
      
      const paymentMethod = accountToPaymentMethod[account.accountName] || 'Otro';
      
      const newIncome = await Income.create({
        amount: parseFloat(amount),
        date,
        description: description || 'Depósito manual',
        paymentMethod,
        typeIncome: 'Comprobante Ingreso',
        notes,
        createdByStaffId
      }, { transaction });
      
      incomeId = newIncome.idIncome;
      console.log(`💰 Income auto-creado: ${newIncome.idIncome}`);
    }

    // Crear transacción
    const bankTransaction = await BankTransaction.create({
      bankAccountId,
      transactionType: 'deposit',
      amount: parseFloat(amount),
      date,
      description: description || 'Depósito',
      category,
      balanceAfter: newBalance,
      relatedIncomeId: incomeId,
      notes,
      createdByStaffId
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Depósito registrado: ${account.accountName} | +$${amount} | Nuevo balance: ${account.getFormattedBalance()}`);

    res.status(201).json({
      success: true,
      message: 'Depósito registrado exitosamente',
      transaction: {
        ...bankTransaction.toJSON(),
        formattedAmount: bankTransaction.getFormattedAmount()
      },
      newBalance: newBalance.toFixed(2),
      formattedBalance: `$${newBalance.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creando depósito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar depósito',
      error: error.message
    });
  }
};

/**
 * POST /api/bank-transactions/withdrawal
 * Registrar retiro (salida de dinero)
 */
const createWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      bankAccountId,
      amount,
      date = getLocalDateString(),
      description,
      category = 'expense',
      relatedExpenseId = null,
      relatedCreditCardPaymentId = null,
      notes = null,
      createdByStaffId = null
    } = req.body;

    // Validaciones
    if (!bankAccountId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'bankAccountId y amount son obligatorios'
      });
    }

    if (parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    // Obtener cuenta
    const account = await BankAccount.findByPk(bankAccountId, { transaction });

    if (!account) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    if (!account.isActive) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'La cuenta bancaria no está activa'
      });
    }

    // Verificar fondos suficientes
    const currentBalance = parseFloat(account.currentBalance);
    const withdrawalAmount = parseFloat(amount);

    if (currentBalance < withdrawalAmount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Fondos insuficientes. Balance actual: $${currentBalance.toFixed(2)}, retiro solicitado: $${withdrawalAmount.toFixed(2)}`
      });
    }

    // Actualizar balance
    const newBalance = currentBalance - withdrawalAmount;
    await account.update({ currentBalance: newBalance }, { transaction });

    // Crear transacción
    const bankTransaction = await BankTransaction.create({
      bankAccountId,
      transactionType: 'withdrawal',
      amount: withdrawalAmount,
      date,
      description: description || 'Retiro',
      category,
      balanceAfter: newBalance,
      relatedExpenseId,
      relatedCreditCardPaymentId,
      notes,
      createdByStaffId
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Retiro registrado: ${account.accountName} | -$${amount} | Nuevo balance: $${newBalance.toFixed(2)}`);

    res.status(201).json({
      success: true,
      message: 'Retiro registrado exitosamente',
      transaction: {
        ...bankTransaction.toJSON(),
        formattedAmount: bankTransaction.getFormattedAmount()
      },
      newBalance: newBalance.toFixed(2),
      formattedBalance: `$${newBalance.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creando retiro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar retiro',
      error: error.message
    });
  }
};

/**
 * POST /api/bank-transactions/transfer
 * Transferir dinero entre cuentas
 */
const createTransfer = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      date = getLocalDateString(),
      description,
      notes = null,
      createdByStaffId = null
    } = req.body;

    // Validaciones
    if (!fromAccountId || !toAccountId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'fromAccountId, toAccountId y amount son obligatorios'
      });
    }

    if (fromAccountId === toAccountId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No se puede transferir a la misma cuenta'
      });
    }

    if (parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    // Obtener cuentas
    const [fromAccount, toAccount] = await Promise.all([
      BankAccount.findByPk(fromAccountId, { transaction }),
      BankAccount.findByPk(toAccountId, { transaction })
    ]);

    if (!fromAccount) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cuenta de origen no encontrada'
      });
    }

    if (!toAccount) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cuenta de destino no encontrada'
      });
    }

    if (!fromAccount.isActive || !toAccount.isActive) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Una o ambas cuentas no están activas'
      });
    }

    // Verificar fondos
    const transferAmount = parseFloat(amount);
    const fromBalance = parseFloat(fromAccount.currentBalance);

    if (fromBalance < transferAmount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Fondos insuficientes en ${fromAccount.accountName}. Balance: $${fromBalance.toFixed(2)}, transferencia: $${transferAmount.toFixed(2)}`
      });
    }

    // Actualizar balances
    const newFromBalance = fromBalance - transferAmount;
    const newToBalance = parseFloat(toAccount.currentBalance) + transferAmount;

    await fromAccount.update({ currentBalance: newFromBalance }, { transaction });
    await toAccount.update({ currentBalance: newToBalance }, { transaction });

    // Crear transacción de salida
    const transferOut = await BankTransaction.create({
      bankAccountId: fromAccountId,
      transactionType: 'transfer_out',
      amount: transferAmount,
      date,
      description: description || `Transferencia a ${toAccount.accountName}`,
      category: 'transfer',
      balanceAfter: newFromBalance,
      transferToAccountId: toAccountId,
      notes,
      createdByStaffId
    }, { transaction });

    // Crear transacción de entrada
    const transferIn = await BankTransaction.create({
      bankAccountId: toAccountId,
      transactionType: 'transfer_in',
      amount: transferAmount,
      date,
      description: description || `Transferencia desde ${fromAccount.accountName}`,
      category: 'transfer',
      balanceAfter: newToBalance,
      transferFromAccountId: fromAccountId,
      relatedTransferId: transferOut.idTransaction,
      notes,
      createdByStaffId
    }, { transaction });

    // Vincular transferencias
    await transferOut.update({ relatedTransferId: transferIn.idTransaction }, { transaction });

    await transaction.commit();

    console.log(`✅ Transferencia completada: ${fromAccount.accountName} → ${toAccount.accountName} | $${amount}`);
    console.log(`   ${fromAccount.accountName}: $${fromBalance.toFixed(2)} → $${newFromBalance.toFixed(2)}`);
    console.log(`   ${toAccount.accountName}: $${parseFloat(toAccount.currentBalance).toFixed(2)} → $${newToBalance.toFixed(2)}`);

    res.status(201).json({
      success: true,
      message: 'Transferencia completada exitosamente',
      transfer: {
        from: {
          account: fromAccount.accountName,
          transaction: transferOut.toJSON(),
          oldBalance: fromBalance.toFixed(2),
          newBalance: newFromBalance.toFixed(2)
        },
        to: {
          account: toAccount.accountName,
          transaction: transferIn.toJSON(),
          oldBalance: (newToBalance - transferAmount).toFixed(2),
          newBalance: newToBalance.toFixed(2)
        },
        amount: transferAmount.toFixed(2),
        date
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creando transferencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al realizar transferencia',
      error: error.message
    });
  }
};

/**
 * GET /api/bank-transactions
 * Obtener lista de transacciones con filtros
 */
const getTransactions = async (req, res) => {
  try {
    const {
      bankAccountId,
      transactionType,
      category,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      orderBy = 'date',
      orderDirection = 'DESC'
    } = req.query;

    const whereClause = {};

    if (bankAccountId) whereClause.bankAccountId = bankAccountId;
    if (transactionType) whereClause.transactionType = transactionType;
    if (category) whereClause.category = category;

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const { count, rows: transactions } = await BankTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: BankAccount,
          as: 'account',
          attributes: ['idBankAccount', 'accountName', 'accountType']
        },
        {
          model: Income,
          as: 'relatedIncome',
          required: false
        },
        {
          model: Expense,
          as: 'relatedExpense',
          required: false
        },
        {
          model: SupplierInvoice,
          as: 'relatedCreditCardPayment',
          required: false
        },
        {
          model: Staff,
          as: 'createdBy',
          required: false
        }
      ],
      order: [[orderBy, orderDirection]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      transactions: transactions.map(t => {
        const json = t.toJSON();
        
        // ✅ Convertir fecha a string YYYY-MM-DD si es Date object
        let formattedDate = json.date;
        if (json.date) {
          if (typeof json.date === 'object' && json.date instanceof Date) {
            // Es un objeto Date, convertir a local
            const year = json.date.getFullYear();
            const month = String(json.date.getMonth() + 1).padStart(2, '0');
            const day = String(json.date.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          } else if (typeof json.date === 'string') {
            // Ya es string, pero puede ser ISO, extraer solo YYYY-MM-DD
            formattedDate = json.date.substring(0, 10);
          }
        }
        
        return {
          ...json,
          date: formattedDate,
          formattedAmount: t.getFormattedAmount()
        };
      })
    });

  } catch (error) {
    console.error('❌ Error obteniendo transacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones',
      error: error.message
    });
  }
};

/**
 * GET /api/bank-transactions/:id
 * Obtener detalle de transacción específica
 */
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await BankTransaction.findByPk(id, {
      include: [
        {
          model: BankAccount,
          as: 'account',
          attributes: ['idBankAccount', 'accountName', 'accountType', 'currentBalance']
        },
        {
          model: Income,
          as: 'relatedIncome',
          required: false
        },
        {
          model: Expense,
          as: 'relatedExpense',
          required: false
        },
        {
          model: SupplierInvoice,
          as: 'relatedCreditCardPayment',
          required: false
        },
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['idStaff', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: BankAccount,
          as: 'transferFromAccount',
          attributes: ['idBankAccount', 'accountName'],
          required: false
        },
        {
          model: BankAccount,
          as: 'transferToAccount',
          attributes: ['idBankAccount', 'accountName'],
          required: false
        },
        {
          model: BankTransaction,
          as: 'relatedTransfer',
          attributes: ['idTransaction', 'transactionType', 'amount', 'date'],
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      transaction: {
        ...transaction.toJSON(),
        formattedAmount: transaction.getFormattedAmount()
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener transacción',
      error: error.message
    });
  }
};

/**
 * DELETE /api/bank-transactions/:id
 * Eliminar transacción y reversar balance
 */
const deleteTransaction = async (req, res) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const transaction = await BankTransaction.findByPk(id, {
      include: [
        {
          model: BankAccount,
          as: 'bankAccount'
        }
      ],
      transaction: dbTransaction
    });

    if (!transaction) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    const account = transaction.bankAccount;
    const currentBalance = parseFloat(account.currentBalance);
    const transactionAmount = parseFloat(transaction.amount);

    let newBalance;

    // Reversar según tipo de transacción
    if (transaction.transactionType === 'deposit' || transaction.transactionType === 'transfer_in') {
      // Era entrada, restar
      newBalance = currentBalance - transactionAmount;
    } else if (transaction.transactionType === 'withdrawal' || transaction.transactionType === 'transfer_out') {
      // Era salida, sumar
      newBalance = currentBalance + transactionAmount;
    }

    // Verificar que no quede balance negativo
    if (newBalance < 0) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Balance quedaría negativo: $${newBalance.toFixed(2)}`
      });
    }

    // Si es transferencia, eliminar también la transacción relacionada
    if (transaction.relatedTransferId) {
      const relatedTransaction = await BankTransaction.findByPk(transaction.relatedTransferId, {
        include: [{ model: BankAccount, as: 'bankAccount' }],
        transaction: dbTransaction
      });

      if (relatedTransaction) {
        const relatedAccount = relatedTransaction.bankAccount;
        const relatedCurrentBalance = parseFloat(relatedAccount.currentBalance);
        const relatedAmount = parseFloat(relatedTransaction.amount);

        let relatedNewBalance;
        if (relatedTransaction.transactionType === 'deposit' || relatedTransaction.transactionType === 'transfer_in') {
          relatedNewBalance = relatedCurrentBalance - relatedAmount;
        } else {
          relatedNewBalance = relatedCurrentBalance + relatedAmount;
        }

        if (relatedNewBalance < 0) {
          await dbTransaction.rollback();
          return res.status(400).json({
            success: false,
            message: `No se puede eliminar. Balance de ${relatedAccount.accountName} quedaría negativo`
          });
        }

        await relatedAccount.update({ currentBalance: relatedNewBalance }, { transaction: dbTransaction });
        await relatedTransaction.destroy({ transaction: dbTransaction });
      }
    }

    // Actualizar balance y eliminar
    await account.update({ currentBalance: newBalance }, { transaction: dbTransaction });
    await transaction.destroy({ transaction: dbTransaction });

    await dbTransaction.commit();

    console.log(`✅ Transacción eliminada: ${account.accountName} | Tipo: ${transaction.transactionType} | Balance: $${newBalance.toFixed(2)}`);

    res.status(200).json({
      success: true,
      message: 'Transacción eliminada y balance reversado exitosamente',
      accountName: account.accountName,
      oldBalance: currentBalance.toFixed(2),
      newBalance: newBalance.toFixed(2),
      reversedAmount: transactionAmount.toFixed(2)
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ Error eliminando transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar transacción',
      error: error.message
    });
  }
};

module.exports = {
  createDeposit,
  createWithdrawal,
  createTransfer,
  getTransactions,
  getTransactionById,
  deleteTransaction
};
