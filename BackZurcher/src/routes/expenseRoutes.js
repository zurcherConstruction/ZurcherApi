const express = require('express');
const router = express.Router();
const { createExpense, getAllExpenses, getExpenseById, updateExpense, deleteExpense, getExpenseTypes } = require('../controllers/expenseController');
const { upload } = require('../middleware/multer');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// Ruta para obtener tipos de gasto (debe ir antes de /:id)
router.get('/types', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), getExpenseTypes);

router.post('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), upload.single('file'), createExpense);
router.get('/', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), getAllExpenses);
router.get('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), getExpenseById);
router.put('/:id', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), updateExpense);
router.delete('/:id', verifyToken, allowRoles(['admin', 'owner']), deleteExpense);

module.exports = router;