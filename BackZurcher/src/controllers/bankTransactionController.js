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

    // Actualizar balance (permitir sobregiros)
    const currentBalance = parseFloat(account.currentBalance);
    const withdrawalAmount = parseFloat(amount);

    // ✅ SOBREGIROS PERMITIDOS - No validar fondos suficientes
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
    // Actualizar balances (permitir sobregiros)
    const transferAmount = parseFloat(amount);
    const fromBalance = parseFloat(fromAccount.currentBalance);

    // ✅ SOBREGIROS PERMITIDOS - No validar fondos suficientes en transferencias

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
          attributes: ['id', 'name', 'email'],
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

/**
 * GET /api/bank-transactions/monthly-report
 * Obtener reporte mensual de transacciones para una cuenta específica
 * Query params: bankAccountId, month (1-12), year (YYYY)
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { bankAccountId, month, year } = req.query;

    // Validaciones
    if (!bankAccountId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'bankAccountId, month y year son obligatorios'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'El mes debe estar entre 1 y 12'
      });
    }

    // Obtener cuenta
    const account = await BankAccount.findByPk(bankAccountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    // Calcular rango de fechas (inicio y fin del mes)
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Formatear fechas en YYYY-MM-DD
    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDay = endDate.getDate();
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    // Obtener transacciones del mes
    const transactions = await BankTransaction.findAll({
      where: {
        bankAccountId,
        date: {
          [Op.gte]: startDateStr,
          [Op.lte]: endDateStr
        }
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Calcular balance inicial (balance antes de este mes)
    const transactionsBeforeMonth = await BankTransaction.findAll({
      where: {
        bankAccountId,
        date: {
          [Op.lt]: startDateStr
        }
      },
      attributes: ['transactionType', 'amount']
    });

    let initialBalance = 0;
    for (const tx of transactionsBeforeMonth) {
      const amount = parseFloat(tx.amount);
      if (tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in') {
        initialBalance += amount;
      } else if (tx.transactionType === 'withdrawal' || tx.transactionType === 'transfer_out') {
        initialBalance -= amount;
      }
    }

    // Calcular totales del mes
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalTransfersIn = 0;
    let totalTransfersOut = 0;

    const transactionsWithBalance = [];
    let runningBalance = initialBalance;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      
      switch (tx.transactionType) {
        case 'deposit':
          totalDeposits += amount;
          runningBalance += amount;
          break;
        case 'withdrawal':
          totalWithdrawals += amount;
          runningBalance -= amount;
          break;
        case 'transfer_in':
          totalTransfersIn += amount;
          runningBalance += amount;
          break;
        case 'transfer_out':
          totalTransfersOut += amount;
          runningBalance -= amount;
          break;
      }

      transactionsWithBalance.push({
        ...tx.toJSON(),
        balanceAfterTransaction: runningBalance
      });
    }

    const finalBalance = runningBalance;

    // Resumen
    const summary = {
      accountName: account.accountName,
      accountType: account.accountType,
      month: monthNum,
      year: yearNum,
      monthName: new Date(yearNum, monthNum - 1, 1).toLocaleString('es-ES', { month: 'long' }),
      initialBalance,
      finalBalance,
      currentBalance: parseFloat(account.currentBalance),
      totalTransactions: transactions.length,
      totalDeposits,
      totalWithdrawals,
      totalTransfersIn,
      totalTransfersOut,
      netChange: finalBalance - initialBalance
    };

    return res.status(200).json({
      success: true,
      data: {
        summary,
        transactions: transactionsWithBalance
      }
    });

  } catch (error) {
    console.error('Error en getMonthlyReport:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte mensual',
      error: error.message
    });
  }
};

/**
 * GET /api/bank-transactions/monthly-report/pdf
 * Descargar reporte mensual en formato PDF
 * Query params: bankAccountId, month (1-12), year (YYYY)
 */
const downloadMonthlyReportPDF = async (req, res) => {
  try {
    const { bankAccountId, month, year } = req.query;

    // Validaciones
    if (!bankAccountId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'bankAccountId, month y year son obligatorios'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'El mes debe estar entre 1 y 12'
      });
    }

    // Obtener datos del reporte (reutilizar lógica)
    const account = await BankAccount.findByPk(bankAccountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(yearNum, monthNum, 0);
    const endDay = endDate.getDate();
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    const transactions = await BankTransaction.findAll({
      where: {
        bankAccountId,
        date: {
          [Op.gte]: startDateStr,
          [Op.lte]: endDateStr
        }
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Calcular balance inicial
    const transactionsBeforeMonth = await BankTransaction.findAll({
      where: {
        bankAccountId,
        date: { [Op.lt]: startDateStr }
      },
      attributes: ['transactionType', 'amount']
    });

    let initialBalance = 0;
    for (const tx of transactionsBeforeMonth) {
      const amount = parseFloat(tx.amount);
      if (tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in') {
        initialBalance += amount;
      } else {
        initialBalance -= amount;
      }
    }

    // Calcular totales
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let runningBalance = initialBalance;
    const transactionsWithBalance = [];

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      if (tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in') {
        totalDeposits += amount;
        runningBalance += amount;
      } else {
        totalWithdrawals += amount;
        runningBalance -= amount;
      }
      transactionsWithBalance.push({
        ...tx.toJSON(),
        balanceAfterTransaction: runningBalance
      });
    }

    // Generar PDF con PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    // Configurar headers para descarga
    const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleString('es-ES', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const filename = `Reporte_${account.accountName.replace(/\s+/g, '_')}_${capitalizedMonth}_${yearNum}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Función helper para formatear moneda
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    };

    // ========== ENCABEZADO CON FONDO DE COLOR ==========
    doc.save();
    doc.rect(0, 0, doc.page.width, 90).fill('#1e3a8a'); // Azul oscuro - más pequeño
    doc.restore();

    doc.fillColor('#ffffff')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('REPORTE MENSUAL DE TRANSACCIONES', 50, 25, { align: 'center' });
    
    doc.fontSize(12)
      .font('Helvetica')
      .text(`${account.accountName}`, 50, 52, { align: 'center' })
      .text(`${capitalizedMonth} ${yearNum}`, 50, 68, { align: 'center' });

    doc.fillColor('#000000'); // Restaurar color negro
    doc.moveDown(2);

    // ========== RESUMEN CON CAJAS DE COLORES ==========
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('Resumen del Período', 50, doc.y);
    doc.moveDown(0.5);

    const summaryY = doc.y;
    const boxWidth = 150;
    const boxHeight = 50;
    const boxSpacing = 15;

    // Caja 1: Balance Inicial
    doc.save();
    doc.roundedRect(50, summaryY, boxWidth, boxHeight, 5).fillAndStroke('#f0f9ff', '#3b82f6');
    doc.restore();
    doc.fontSize(9).fillColor('#666666').font('Helvetica').text('Balance Inicial', 60, summaryY + 10);
    doc.fontSize(14).fillColor('#1e3a8a').font('Helvetica-Bold').text(formatCurrency(initialBalance), 60, summaryY + 26);

    // Caja 2: Depósitos
    doc.save();
    doc.roundedRect(50 + boxWidth + boxSpacing, summaryY, boxWidth, boxHeight, 5).fillAndStroke('#f0fdf4', '#22c55e');
    doc.restore();
    doc.fontSize(9).fillColor('#666666').font('Helvetica').text('Total Depósitos', 60 + boxWidth + boxSpacing, summaryY + 10);
    doc.fontSize(14).fillColor('#16a34a').font('Helvetica-Bold').text(formatCurrency(totalDeposits), 60 + boxWidth + boxSpacing, summaryY + 26);

    // Caja 3: Retiros
    doc.save();
    doc.roundedRect(50 + (boxWidth + boxSpacing) * 2, summaryY, boxWidth, boxHeight, 5).fillAndStroke('#fef2f2', '#ef4444');
    doc.restore();
    doc.fontSize(9).fillColor('#666666').font('Helvetica').text('Total Retiros', 60 + (boxWidth + boxSpacing) * 2, summaryY + 10);
    doc.fontSize(14).fillColor('#dc2626').font('Helvetica-Bold').text(formatCurrency(totalWithdrawals), 60 + (boxWidth + boxSpacing) * 2, summaryY + 26);

    doc.y = summaryY + boxHeight + 12;

    // Línea adicional de resumen
    const summaryY2 = doc.y;
    
    // Caja 4: Balance Final
    doc.save();
    doc.roundedRect(50, summaryY2, boxWidth, boxHeight, 5).fillAndStroke('#fefce8', '#eab308');
    doc.restore();
    doc.fontSize(9).fillColor('#666666').font('Helvetica').text('Balance Final', 60, summaryY2 + 10);
    doc.fontSize(14).fillColor('#ca8a04').font('Helvetica-Bold').text(formatCurrency(runningBalance), 60, summaryY2 + 26);

    // Caja 5: Cambio Neto
    const netChange = runningBalance - initialBalance;
    const netColor = netChange >= 0 ? '#22c55e' : '#ef4444';
    const netBg = netChange >= 0 ? '#f0fdf4' : '#fef2f2';
    doc.save();
    doc.roundedRect(50 + boxWidth + boxSpacing, summaryY2, boxWidth, boxHeight, 5).fillAndStroke(netBg, netColor);
    doc.restore();
    doc.fontSize(9).fillColor('#666666').font('Helvetica').text('Cambio Neto', 60 + boxWidth + boxSpacing, summaryY2 + 10);
    doc.fontSize(14).fillColor(netChange >= 0 ? '#16a34a' : '#dc2626').font('Helvetica-Bold')
      .text(formatCurrency(netChange), 60 + boxWidth + boxSpacing, summaryY2 + 26);

    // Caja 6: Total Transacciones
    doc.save();
    doc.roundedRect(50 + (boxWidth + boxSpacing) * 2, summaryY2, boxWidth, boxHeight, 5).fillAndStroke('#f5f3ff', '#8b5cf6');
    doc.restore();
    doc.fontSize(9).fillColor('#666666').font('Helvetica').text('Total Transacciones', 60 + (boxWidth + boxSpacing) * 2, summaryY2 + 10);
    doc.fontSize(14).fillColor('#7c3aed').font('Helvetica-Bold').text(transactions.length.toString(), 60 + (boxWidth + boxSpacing) * 2, summaryY2 + 26);

    doc.y = summaryY2 + boxHeight + 15;

    // ========== TABLA DE TRANSACCIONES ==========
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('Detalle de Transacciones', 50, doc.y);
    doc.moveDown(0.5);

    let pageNumber = 1; // Inicializar número de página

    if (transactions.length === 0) {
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('No hay transacciones en este período.');
    } else {
      const tableTop = doc.y;
      const rowHeight = 20; // Reducido de 25 a 20
      const col1 = 50;   // Fecha
      const col2 = 125;  // Tipo
      const col3 = 220;  // Monto
      const col4 = 310;  // Balance
      const col5 = 410;  // Descripción
      const tableWidth = 512; // Ancho total de la tabla

      // Header de la tabla con fondo
      doc.save();
      doc.rect(col1, tableTop, tableWidth, rowHeight).fillAndStroke('#e0e7ff', '#3b82f6');
      doc.restore();

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a8a');
      doc.text('Fecha', col1 + 5, tableTop + 5);
      doc.text('Tipo', col2 + 5, tableTop + 5);
      doc.text('Monto', col3 + 5, tableTop + 5);
      doc.text('Balance', col4 + 5, tableTop + 5);
      doc.text('Descripción', col5 + 5, tableTop + 5);

      let currentY = tableTop + rowHeight;
      let rowIndex = 0;

      const typeLabels = {
        deposit: 'Depósito',
        withdrawal: 'Retiro',
        transfer_in: 'Transf. IN',
        transfer_out: 'Transf. OUT'
      };

      // Filas de datos con alternancia de colores
      for (const tx of transactionsWithBalance) {
        // Verificar si necesitamos nueva página
        if (currentY > 720) {
          doc.addPage();
          pageNumber++;
          currentY = 50;
          
          // Repetir header en nueva página
          doc.save();
          doc.rect(col1, currentY, tableWidth, rowHeight).fillAndStroke('#e0e7ff', '#3b82f6');
          doc.restore();
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a8a');
          doc.text('Fecha', col1 + 5, currentY + 5);
          doc.text('Tipo', col2 + 5, currentY + 5);
          doc.text('Monto', col3 + 5, currentY + 5);
          doc.text('Balance', col4 + 5, currentY + 5);
          doc.text('Descripción', col5 + 5, currentY + 5);
          currentY += rowHeight;
          rowIndex = 0;
        }

        // Fondo alternado para filas
        const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.save();
        doc.rect(col1, currentY, tableWidth, rowHeight).fill(bgColor);
        doc.restore();

        // Bordes de la fila
        doc.save();
        doc.rect(col1, currentY, tableWidth, rowHeight).stroke('#e2e8f0');
        doc.restore();

        const amount = parseFloat(tx.amount);
        const isCredit = tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in';
        
        // Contenido de la fila
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        
        // Fecha
        doc.text(tx.date, col1 + 5, currentY + 6, { width: 70 });
        
        // Tipo
        doc.text(typeLabels[tx.transactionType] || tx.transactionType, col2 + 5, currentY + 6, { width: 85 });
        
        // Monto (verde para depósitos, rojo para retiros)
        doc.fillColor(isCredit ? '#16a34a' : '#dc2626')
          .text((isCredit ? '+' : '-') + formatCurrency(amount), col3 + 5, currentY + 6, { width: 85 });
        
        // Balance
        doc.fillColor('#334155')
          .text(formatCurrency(tx.balanceAfterTransaction), col4 + 5, currentY + 6, { width: 95 });
        
        // Descripción (truncada si es muy larga)
        const description = (tx.description || 'N/A').substring(0, 35);
        doc.text(description, col5 + 5, currentY + 6, { width: 150 });

        currentY += rowHeight;
        rowIndex++;
      }
    }

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error('Error en downloadMonthlyReportPDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Error al generar el PDF',
        error: error.message
      });
    }
  }
};

/**
 * GET /api/bank-transactions/monthly-report/excel
 * Descargar reporte mensual en formato Excel
 * Query params: bankAccountId, month (1-12), year (YYYY)
 */
const downloadMonthlyReportExcel = async (req, res) => {
  try {
    const { bankAccountId, month, year } = req.query;

    // Validaciones
    if (!bankAccountId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'bankAccountId, month y year son obligatorios'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'El mes debe estar entre 1 y 12'
      });
    }

    // Obtener datos del reporte
    const account = await BankAccount.findByPk(bankAccountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(yearNum, monthNum, 0);
    const endDay = endDate.getDate();
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    const transactions = await BankTransaction.findAll({
      where: {
        bankAccountId,
        date: {
          [Op.gte]: startDateStr,
          [Op.lte]: endDateStr
        }
      },
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Calcular balance inicial
    const transactionsBeforeMonth = await BankTransaction.findAll({
      where: {
        bankAccountId,
        date: { [Op.lt]: startDateStr }
      },
      attributes: ['transactionType', 'amount']
    });

    let initialBalance = 0;
    for (const tx of transactionsBeforeMonth) {
      const amount = parseFloat(tx.amount);
      if (tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in') {
        initialBalance += amount;
      } else {
        initialBalance -= amount;
      }
    }

    // Calcular totales
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let runningBalance = initialBalance;
    const transactionsWithBalance = [];

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      if (tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in') {
        totalDeposits += amount;
        runningBalance += amount;
      } else {
        totalWithdrawals += amount;
        runningBalance -= amount;
      }
      transactionsWithBalance.push({
        ...tx.toJSON(),
        balanceAfterTransaction: runningBalance
      });
    }

    // Generar Excel con ExcelJS
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Mensual');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Monto', key: 'amount', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Categoría', key: 'category', width: 15 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Creado Por', key: 'createdBy', width: 20 }
    ];

    // Título
    const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleString('es-ES', { month: 'long' });
    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = `Reporte Mensual - ${account.accountName} - ${monthName} ${yearNum}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Resumen
    worksheet.addRow([]);
    worksheet.addRow(['Balance Inicial:', `$${initialBalance.toFixed(2)}`]);
    worksheet.addRow(['Total Depósitos:', `$${totalDeposits.toFixed(2)}`]);
    worksheet.addRow(['Total Retiros:', `$${totalWithdrawals.toFixed(2)}`]);
    worksheet.addRow(['Balance Final:', `$${runningBalance.toFixed(2)}`]);
    worksheet.addRow(['Cambio Neto:', `$${(runningBalance - initialBalance).toFixed(2)}`]);
    worksheet.addRow(['Total Transacciones:', transactions.length]);
    worksheet.addRow([]);

    // Headers con estilo
    const headerRow = worksheet.addRow([
      'Fecha',
      'Tipo',
      'Monto',
      'Balance',
      'Categoría',
      'Descripción',
      'Creado Por'
    ]);
    
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Datos
    const typeLabels = {
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      transfer_in: 'Transfer IN',
      transfer_out: 'Transfer OUT'
    };

    transactionsWithBalance.forEach(tx => {
      const amount = parseFloat(tx.amount);
      const isCredit = tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in';
      const amountStr = (isCredit ? '+' : '-') + amount.toFixed(2);
      const createdBy = tx.createdBy 
        ? tx.createdBy.name
        : 'N/A';

      worksheet.addRow({
        date: tx.date,
        type: typeLabels[tx.transactionType] || tx.transactionType,
        amount: amountStr,
        balance: tx.balanceAfterTransaction.toFixed(2),
        category: tx.category || 'N/A',
        description: tx.description || '',
        createdBy
      });
    });

    // Configurar respuesta
    const filename = `Reporte_${account.accountName.replace(/\s+/g, '_')}_${monthName}_${yearNum}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Enviar archivo
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error en downloadMonthlyReportExcel:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Error al generar el Excel',
        error: error.message
      });
    }
  }
};

module.exports = {
  createDeposit,
  createWithdrawal,
  createTransfer,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getMonthlyReport,
  downloadMonthlyReportPDF,
  downloadMonthlyReportExcel
};
