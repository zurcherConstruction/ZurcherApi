const express = require('express');
const router = express.Router();
const { createExpense, getAllExpenses, getExpenseById, updateExpense, deleteExpense } = require('../controllers/ExpenseController');

router.post('/', createExpense);
router.get('/', getAllExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;