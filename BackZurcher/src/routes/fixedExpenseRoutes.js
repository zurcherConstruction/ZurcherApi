const express = require('express');
const router = express.Router();
const {
  createFixedExpense,
  getAllFixedExpenses,
  getFixedExpenseById,
  updateFixedExpense,
  deleteFixedExpense,
  toggleFixedExpenseStatus,
  getUpcomingFixedExpenses,
  generateExpenseFromFixed,
  getUnpaidFixedExpenses,
  getFixedExpensesByPaymentStatus
} = require('../controllers/fixedExpenseController');
const { getCronStatus } = require('../controllers/cronStatusController');

// Middleware de autenticación (ajustar según tu sistema)
// const { isAuth } = require('../middleware/isAuth');

/**
 * @route   POST /api/fixed-expenses
 * @desc    Crear un nuevo gasto fijo
 * @access  Private
 */
router.post('/', createFixedExpense);

/**
 * @route   GET /api/fixed-expenses
 * @desc    Obtener todos los gastos fijos (con filtros opcionales)
 * @query   ?isActive=true&category=Renta&paymentMethod=Chase&search=internet
 * @access  Private
 */
router.get('/', getAllFixedExpenses);

/**
 * 🆕 @route   GET /api/fixed-expenses/cron-status
 * @desc    Verificar estado del CRON de auto-generación
 * @access  Private
 */
router.get('/cron-status', getCronStatus);

/**
 * @route   GET /api/fixed-expenses/upcoming
 * @desc    Obtener gastos fijos próximos a vencer
 * @query   ?days=30
 * @access  Private
 */
router.get('/upcoming', getUpcomingFixedExpenses);

/**
 * 🆕 @route   GET /api/fixed-expenses/unpaid
 * @desc    Obtener gastos fijos no pagados (para vincular con invoices)
 * @query   ?vendor=&category=
 * @access  Private
 */
router.get('/unpaid', getUnpaidFixedExpenses);

/**
 * 🆕 @route   GET /api/fixed-expenses/by-status/:status
 * @desc    Obtener gastos fijos por estado de pago
 * @param   status - unpaid | paid | paid_via_invoice
 * @query   ?category=&vendor=
 * @access  Private
 */
router.get('/by-status/:status', getFixedExpensesByPaymentStatus);

/**
 * @route   GET /api/fixed-expenses/:id
 * @desc    Obtener un gasto fijo por ID
 * @access  Private
 */
router.get('/:id', getFixedExpenseById);

/**
 * @route   PATCH /api/fixed-expenses/:id
 * @desc    Actualizar un gasto fijo
 * @access  Private
 */
router.patch('/:id', updateFixedExpense);

/**
 * @route   DELETE /api/fixed-expenses/:id
 * @desc    Eliminar un gasto fijo
 * @access  Private
 */
router.delete('/:id', deleteFixedExpense);

/**
 * @route   PATCH /api/fixed-expenses/:id/toggle-status
 * @desc    Activar/Desactivar un gasto fijo
 * @access  Private
 */
router.patch('/:id/toggle-status', toggleFixedExpenseStatus);

/**
 * @route   POST /api/fixed-expenses/:id/generate-expense
 * @desc    Generar un Expense a partir de un Fixed Expense
 * @body    { paymentDate: '2025-10-09', notes: 'Opcional' }
 * @access  Private
 */
router.post('/:id/generate-expense', generateExpenseFromFixed);

module.exports = router;
