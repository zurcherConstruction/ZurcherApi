/**
 * Helper para crear BankTransaction desde controladores
 * 
 * Centraliza la lógica de auto-creación de transacciones bancarias
 * para evitar duplicación de código
 */

const { BankAccount, BankTransaction } = require('../data');

/**
 * Mapeo de paymentMethod a accountName
 */
const PAYMENT_METHOD_TO_ACCOUNT = {
  'Proyecto Septic BOFA': 'Proyecto Septic BOFA',
  'Chase Bank': 'Chase Bank',
  'Efectivo': 'Caja Chica'
};

/**
 * Verifica si un paymentMethod es una cuenta bancaria
 */
const isBankAccount = (paymentMethod) => {
  return Object.keys(PAYMENT_METHOD_TO_ACCOUNT).includes(paymentMethod);
};

/**
 * Obtiene el nombre de la cuenta bancaria desde el paymentMethod
 */
const getAccountName = (paymentMethod) => {
  return PAYMENT_METHOD_TO_ACCOUNT[paymentMethod] || null;
};

/**
 * Obtener fecha local en formato YYYY-MM-DD
 * Si recibe una fecha ya en formato YYYY-MM-DD, la devuelve sin modificar
 */
const getLocalDateString = (date = null) => {
  // Si ya es formato YYYY-MM-DD, devolverlo sin cambios
  if (date && typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date;
  }
  
  // Si es una fecha ISO o Date object, convertir a local
  const now = date ? new Date(date) : new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Crear transacción bancaria de depósito (Income)
 * 
 * @param {Object} params
 * @param {string} params.paymentMethod - Método de pago del Income
 * @param {number} params.amount - Monto del depósito
 * @param {string} params.date - Fecha en formato YYYY-MM-DD
 * @param {string} params.description - Descripción de la transacción
 * @param {string} params.relatedIncomeId - UUID del Income relacionado
 * @param {string} params.notes - Notas adicionales (opcional)
 * @param {string} params.createdByStaffId - UUID del Staff que creó (opcional)
 * @param {Object} params.transaction - Transacción de Sequelize (opcional)
 * 
 * @returns {Object|null} BankTransaction creado o null si no es cuenta bancaria
 */
const createDepositTransaction = async ({
  paymentMethod,
  amount,
  date,
  description,
  relatedIncomeId,
  notes = null,
  createdByStaffId = null,
  transaction = null
}) => {
  if (!isBankAccount(paymentMethod)) {
    return null; // No es cuenta bancaria
  }

  try {
    const accountName = getAccountName(paymentMethod);
    
    // Buscar cuenta bancaria
    const bankAccount = await BankAccount.findOne({
      where: { 
        accountName,
        isActive: true 
      },
      transaction
    });

    if (!bankAccount) {
      console.warn(`⚠️ Cuenta bancaria no encontrada: ${accountName}`);
      return null;
    }

    // Actualizar balance
    const newBalance = parseFloat(bankAccount.currentBalance) + parseFloat(amount);
    await bankAccount.update({ currentBalance: newBalance }, { transaction });

    // Crear transacción bancaria
    const bankTransaction = await BankTransaction.create({
      bankAccountId: bankAccount.idBankAccount,
      transactionType: 'deposit',
      amount: parseFloat(amount),
      date: date || getLocalDateString(),
      description,
      category: 'income',
      balanceAfter: newBalance,
      relatedIncomeId,
      notes,
      createdByStaffId
    }, { transaction });

    console.log(`💰 Depósito auto-creado: ${bankAccount.accountName} +$${amount} → Balance: $${newBalance.toFixed(2)}`);

    return bankTransaction;
  } catch (error) {
    console.error('❌ Error creando transacción de depósito:', error.message);
    throw error; // Propagar error para que se haga rollback
  }
};

/**
 * Crear transacción bancaria de retiro (Expense)
 * 
 * @param {Object} params
 * @param {string} params.paymentMethod - Método de pago del Expense
 * @param {number} params.amount - Monto del retiro
 * @param {string} params.date - Fecha en formato YYYY-MM-DD
 * @param {string} params.description - Descripción de la transacción
 * @param {string} params.relatedExpenseId - UUID del Expense relacionado (opcional)
 * @param {string} params.relatedCreditCardPaymentId - UUID del SupplierInvoice relacionado (opcional)
 * @param {string} params.notes - Notas adicionales (opcional)
 * @param {string} params.createdByStaffId - UUID del Staff que creó (opcional)
 * @param {Object} params.transaction - Transacción de Sequelize (opcional)
 * @param {boolean} params.skipBalanceCheck - Saltar verificación de fondos (default: false)
 * 
 * @returns {Object|null} BankTransaction creado o null si no es cuenta bancaria
 */
const createWithdrawalTransaction = async ({
  paymentMethod,
  amount,
  date,
  description,
  relatedExpenseId = null,
  relatedCreditCardPaymentId = null,
  notes = null,
  createdByStaffId = null,
  transaction = null,
  skipBalanceCheck = false
}) => {
  if (!isBankAccount(paymentMethod)) {
    return null; // No es cuenta bancaria
  }

  try {
    const accountName = getAccountName(paymentMethod);
    
    // Buscar cuenta bancaria
    const bankAccount = await BankAccount.findOne({
      where: { 
        accountName,
        isActive: true 
      },
      transaction
    });

    if (!bankAccount) {
      console.warn(`⚠️ Cuenta bancaria no encontrada: ${accountName}`);
      return null;
    }

    // Verificar fondos suficientes (a menos que se indique lo contrario)
    const currentBalance = parseFloat(bankAccount.currentBalance);
    const withdrawalAmount = parseFloat(amount);

    if (!skipBalanceCheck && currentBalance < withdrawalAmount) {
      throw new Error(
        `Fondos insuficientes en ${bankAccount.accountName}. ` +
        `Balance: $${currentBalance.toFixed(2)}, ` +
        `Retiro: $${withdrawalAmount.toFixed(2)}`
      );
    }

    // Actualizar balance
    const newBalance = currentBalance - withdrawalAmount;
    await bankAccount.update({ currentBalance: newBalance }, { transaction });

    // Determinar categoría
    let category = 'expense';
    if (relatedCreditCardPaymentId) {
      category = 'credit_card_payment';
    }

    // Crear transacción bancaria
    const bankTransaction = await BankTransaction.create({
      bankAccountId: bankAccount.idBankAccount,
      transactionType: 'withdrawal',
      amount: withdrawalAmount,
      date: date || getLocalDateString(),
      description,
      category,
      balanceAfter: newBalance,
      relatedExpenseId,
      relatedCreditCardPaymentId,
      notes,
      createdByStaffId
    }, { transaction });

    console.log(`💸 Retiro auto-creado: ${bankAccount.accountName} -$${amount} → Balance: $${newBalance.toFixed(2)}`);

    return bankTransaction;
  } catch (error) {
    console.error('❌ Error creando transacción de retiro:', error.message);
    throw error; // Propagar error para que se haga rollback
  }
};

/**
 * Crear transacción de pago de tarjeta de crédito desde cuenta bancaria
 * 
 * @param {Object} params
 * @param {string} params.fromAccount - Cuenta bancaria de origen (ej: 'Chase Bank')
 * @param {string} params.creditCardName - Nombre de la tarjeta (ej: 'Chase Credit Card', 'AMEX')
 * @param {number} params.amount - Monto del pago
 * @param {string} params.date - Fecha en formato YYYY-MM-DD
 * @param {string} params.supplierInvoiceId - UUID del SupplierInvoice relacionado
 * @param {string} params.notes - Notas adicionales (opcional)
 * @param {string} params.createdByStaffId - UUID del Staff que creó (opcional)
 * @param {Object} params.transaction - Transacción de Sequelize (opcional)
 * 
 * @returns {Object|null} BankTransaction creado o null
 */
const createCreditCardPaymentTransaction = async ({
  fromAccount,
  creditCardName,
  amount,
  date,
  supplierInvoiceId,
  notes = null,
  createdByStaffId = null,
  transaction = null
}) => {
  return await createWithdrawalTransaction({
    paymentMethod: fromAccount,
    amount,
    date,
    description: `Pago de ${creditCardName} - Invoice #${supplierInvoiceId.slice(0, 8)}`,
    relatedCreditCardPaymentId: supplierInvoiceId,
    notes,
    createdByStaffId,
    transaction
  });
};

module.exports = {
  isBankAccount,
  getAccountName,
  getLocalDateString,
  createDepositTransaction,
  createWithdrawalTransaction,
  createCreditCardPaymentTransaction,
  PAYMENT_METHOD_TO_ACCOUNT
};
