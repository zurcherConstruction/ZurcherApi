const express = require('express');
const router = express.Router();
const { createIncome, getAllIncomes, getIncomeById, updateIncome, deleteIncome, getIncomeTypes } = require('../controllers/incomeController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// Ruta para obtener tipos de ingreso (debe ir antes de /:id)
router.get('/types', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), getIncomeTypes);

router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), createIncome);
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), getAllIncomes);
router.get('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), getIncomeById);
router.put('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), updateIncome);
router.delete('/:id', verifyToken, allowRoles(['admin', 'owner', 'finance']), deleteIncome);

module.exports = router;