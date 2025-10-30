const express = require('express');
const router = express.Router();
const {
  deletePartialPayment
} = require('../controllers/fixedExpensePaymentController');

/**
 * 🗑️ @route   DELETE /api/fixed-expense-payments/:paymentId
 * @desc    Eliminar un pago parcial (rollback de Expense y montos)
 * @access  Private
 */
router.delete('/:paymentId', deletePartialPayment);

module.exports = router;
