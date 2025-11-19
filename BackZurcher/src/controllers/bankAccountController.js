/**
 * Bank Account Controller
 * 
 * Gestiona cuentas bancarias del sistema:
 * - Listar todas las cuentas
 * - Ver detalle de cuenta
 * - Obtener balance actual
 * - Crear nueva cuenta
 * - Actualizar cuenta existente
 */

const { BankAccount, BankTransaction, Staff, sequelize } = require('../data');
const { Op } = require('sequelize');

/**
 * GET /api/bank-accounts
 * Obtener todas las cuentas bancarias
 */
const getAllAccounts = async (req, res) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const whereClause = includeInactive === 'true' ? {} : { isActive: true };

    const accounts = await BankAccount.findAll({
      where: whereClause,
      attributes: [
        'idBankAccount',
        'accountName',
        'accountType',
        'currentBalance',
        'currency',
        'isActive',
        'bankName',
        'accountNumber',
        'notes',
        'createdAt',
        'updatedAt'
      ],
      order: [['accountName', 'ASC']]
    });

    // Calcular totales
    const activeAccounts = accounts.filter(acc => acc.isActive);
    const totalBalance = activeAccounts.reduce((sum, acc) => sum + parseFloat(acc.currentBalance), 0);

    res.status(200).json({
      success: true,
      count: accounts.length,
      activeCount: activeAccounts.length,
      totalBalance: totalBalance.toFixed(2),
      accounts: accounts.map(acc => ({
        ...acc.toJSON(),
        formattedBalance: acc.getFormattedBalance()
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo cuentas bancarias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cuentas bancarias',
      error: error.message
    });
  }
};

/**
 * GET /api/bank-accounts/:id
 * Obtener detalle de una cuenta específica
 */
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await BankAccount.findByPk(id, {
      include: [
        {
          model: BankTransaction,
          as: 'transactions',
          limit: 10,
          order: [['date', 'DESC'], ['createdAt', 'DESC']],
          attributes: [
            'idTransaction',
            'transactionType',
            'amount',
            'date',
            'description',
            'category',
            'balanceAfter',
            'notes',
            'createdAt',
            'createdByStaffId',
            'relatedIncomeId',
            'relatedExpenseId'
          ],
          include: [
            {
              model: Staff,
              as: 'createdBy',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ]
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    // Obtener estadísticas de transacciones
    const stats = await BankTransaction.findAll({
      where: { bankAccountId: id },
      attributes: [
        'transactionType',
        [sequelize.fn('COUNT', sequelize.col('idTransaction')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['transactionType'],
      raw: true
    });

    const statistics = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      depositCount: 0,
      withdrawalCount: 0,
      transfersIn: 0,
      transfersOut: 0
    };

    stats.forEach(stat => {
      const total = parseFloat(stat.total) || 0;
      const count = parseInt(stat.count) || 0;

      if (stat.transactionType === 'deposit') {
        statistics.totalDeposits = total;
        statistics.depositCount = count;
      } else if (stat.transactionType === 'withdrawal') {
        statistics.totalWithdrawals = total;
        statistics.withdrawalCount = count;
      } else if (stat.transactionType === 'transfer_in') {
        statistics.transfersIn = total;
      } else if (stat.transactionType === 'transfer_out') {
        statistics.transfersOut = total;
      }
    });

    res.status(200).json({
      success: true,
      account: {
        ...account.toJSON(),
        formattedBalance: account.getFormattedBalance()
      },
      statistics
    });

  } catch (error) {
    console.error('❌ Error obteniendo detalle de cuenta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle de cuenta',
      error: error.message
    });
  }
};

/**
 * GET /api/bank-accounts/:id/balance
 * Obtener balance actual y estadísticas de una cuenta
 */
const getAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await BankAccount.findByPk(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    // Contar transacciones
    const transactionCount = await BankTransaction.count({
      where: { bankAccountId: id }
    });

    // Última transacción
    const lastTransaction = await BankTransaction.findOne({
      where: { bankAccountId: id },
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      attributes: ['idTransaction', 'transactionType', 'amount', 'date', 'description', 'balanceAfter']
    });

    res.status(200).json({
      success: true,
      accountId: account.idBankAccount,
      accountName: account.accountName,
      currentBalance: parseFloat(account.currentBalance),
      formattedBalance: account.getFormattedBalance(),
      currency: account.currency,
      isActive: account.isActive,
      transactionCount,
      lastTransaction: lastTransaction || null,
      lastUpdated: account.updatedAt
    });

  } catch (error) {
    console.error('❌ Error obteniendo balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener balance de cuenta',
      error: error.message
    });
  }
};

/**
 * POST /api/bank-accounts
 * Crear nueva cuenta bancaria
 */
const createAccount = async (req, res) => {
  try {
    const {
      accountName,
      accountType = 'checking',
      initialBalance = 0,
      currency = 'USD',
      bankName,
      accountNumber,
      notes
    } = req.body;

    // Validaciones
    if (!accountName) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la cuenta es obligatorio'
      });
    }

    // Verificar si ya existe
    const existing = await BankAccount.findOne({
      where: { accountName }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una cuenta con el nombre "${accountName}"`
      });
    }

    // Crear cuenta
    const account = await BankAccount.create({
      accountName,
      accountType,
      currentBalance: initialBalance,
      currency,
      isActive: true,
      bankName,
      accountNumber,
      notes
    });

    console.log(`✅ Cuenta bancaria creada: ${account.accountName} | Balance: ${account.getFormattedBalance()}`);

    res.status(201).json({
      success: true,
      message: 'Cuenta bancaria creada exitosamente',
      account: {
        ...account.toJSON(),
        formattedBalance: account.getFormattedBalance()
      }
    });

  } catch (error) {
    console.error('❌ Error creando cuenta bancaria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear cuenta bancaria',
      error: error.message
    });
  }
};

/**
 * PUT /api/bank-accounts/:id
 * Actualizar cuenta bancaria existente
 */
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      accountName,
      accountType,
      isActive,
      bankName,
      accountNumber,
      notes
    } = req.body;

    const account = await BankAccount.findByPk(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Cuenta bancaria no encontrada'
      });
    }

    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (accountName && accountName !== account.accountName) {
      const existing = await BankAccount.findOne({
        where: {
          accountName,
          idBankAccount: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otra cuenta con el nombre "${accountName}"`
        });
      }
    }

    // Actualizar solo los campos permitidos
    const updateData = {};
    if (accountName !== undefined) updateData.accountName = accountName;
    if (accountType !== undefined) updateData.accountType = accountType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (notes !== undefined) updateData.notes = notes;

    await account.update(updateData);

    console.log(`✅ Cuenta bancaria actualizada: ${account.accountName}`);

    res.status(200).json({
      success: true,
      message: 'Cuenta bancaria actualizada exitosamente',
      account: {
        ...account.toJSON(),
        formattedBalance: account.getFormattedBalance()
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando cuenta bancaria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cuenta bancaria',
      error: error.message
    });
  }
};

/**
 * GET /api/bank-accounts/summary/dashboard
 * Obtener resumen para dashboard
 */
const getDashboardSummary = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({
      where: { isActive: true },
      attributes: ['idBankAccount', 'accountName', 'accountType', 'currentBalance', 'isActive']
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.currentBalance), 0);

    const byType = accounts.reduce((acc, account) => {
      const type = account.accountType;
      if (!acc[type]) {
        acc[type] = { count: 0, balance: 0 };
      }
      acc[type].count++;
      acc[type].balance += parseFloat(account.currentBalance);
      return acc;
    }, {});

    // Obtener estadísticas de cada cuenta
    const accountsData = await Promise.all(accounts.map(async (acc) => {
      const stats = await BankTransaction.findAll({
        where: { bankAccountId: acc.idBankAccount },
        attributes: [
          'transactionType',
          [sequelize.fn('COUNT', sequelize.col('idTransaction')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        group: ['transactionType'],
        raw: true
      });

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let transactionCount = 0;

      stats.forEach(stat => {
        const count = parseInt(stat.count) || 0;
        const total = parseFloat(stat.total) || 0;
        transactionCount += count;

        if (stat.transactionType === 'deposit' || stat.transactionType === 'transfer_in') {
          totalDeposits += total;
        } else if (stat.transactionType === 'withdrawal' || stat.transactionType === 'transfer_out') {
          totalWithdrawals += total;
        }
      });

      return {
        id: acc.idBankAccount,
        accountName: acc.accountName,
        accountType: acc.accountType,
        currentBalance: parseFloat(acc.currentBalance),
        formattedBalance: acc.getFormattedBalance(),
        isActive: acc.isActive,
        totalDeposits: parseFloat(totalDeposits.toFixed(2)),
        totalWithdrawals: parseFloat(totalWithdrawals.toFixed(2)),
        transactionCount
      };
    }));

    res.status(200).json({
      success: true,
      accounts: accountsData,
      summary: {
        totalAccounts: accounts.length,
        activeAccounts: accounts.length,
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        formattedTotalBalance: `$${totalBalance.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`,
        byType
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de cuentas',
      error: error.message
    });
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  getAccountBalance,
  createAccount,
  updateAccount,
  getDashboardSummary
};
