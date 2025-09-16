const express = require('express');
const router = express.Router();
const { createIncome, getAllIncomes, getIncomeById, updateIncome, deleteIncome } = require('../controllers/incomeController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), createIncome);
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), getAllIncomes);
router.get('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), getIncomeById);
router.put('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), updateIncome);
router.delete('/:id', verifyToken, allowRoles(['admin', 'owner']), deleteIncome);

module.exports = router;