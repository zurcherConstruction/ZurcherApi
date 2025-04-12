const express = require('express');
const router = express.Router();
const { createIncome, getAllIncomes, getIncomeById, updateIncome, deleteIncome } = require('../controllers/incomeController');

router.post('/', createIncome);
router.get('/', getAllIncomes);
router.get('/:id', getIncomeById);
router.put('/:id', updateIncome);
router.delete('/:id', deleteIncome);

module.exports = router;