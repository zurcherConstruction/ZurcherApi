/**
 * Bank Account Routes
 * 
 * Rutas para gestión de cuentas bancarias
 */

const express = require('express');
const router = express.Router();
const {
  getAllAccounts,
  getAccountById,
  getAccountBalance,
  createAccount,
  updateAccount,
  getDashboardSummary
} = require('../controllers/bankAccountController');

const { getTransactions } = require('../controllers/bankTransactionController');

// GET /api/bank-accounts - Obtener todas las cuentas
router.get('/', getAllAccounts);

// GET /api/bank-accounts/summary/dashboard - Resumen para dashboard
router.get('/summary/dashboard', getDashboardSummary);

// GET /api/bank-accounts/:id - Detalle de cuenta específica
router.get('/:id', getAccountById);

// GET /api/bank-accounts/:id/balance - Balance actual de cuenta
router.get('/:id/balance', getAccountBalance);

// GET /api/bank-accounts/:id/transactions - Transacciones de cuenta específica
router.get('/:id/transactions', (req, res) => {
  // Agregar el filtro de bankAccountId desde los params
  req.query.bankAccountId = req.params.id;
  return getTransactions(req, res);
});

// POST /api/bank-accounts - Crear nueva cuenta
router.post('/', createAccount);

// PUT /api/bank-accounts/:id - Actualizar cuenta existente
router.put('/:id', updateAccount);

module.exports = router;
