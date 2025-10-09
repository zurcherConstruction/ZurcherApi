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
  generateExpenseFromFixed
} = require('../controllers/fixedExpenseController');

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
 * @route   GET /api/fixed-expenses/upcoming
 * @desc    Obtener gastos fijos próximos a vencer
 * @query   ?days=30
 * @access  Private
 */
router.get('/upcoming', getUpcomingFixedExpenses);

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
