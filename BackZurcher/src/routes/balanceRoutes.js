const express = require('express');
const router = express.Router();
const { getIncomesAndExpensesByWorkId, getBalanceByWorkId, getGeneralBalance } = require('../controllers/balanceController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

router.get('/work/:workId', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), getIncomesAndExpensesByWorkId);
router.get('/balance/:workId', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance', 'worker']), getBalanceByWorkId);
router.get('/generalBalance', verifyToken, allowRoles(['admin', 'owner', 'finance']), getGeneralBalance);

module.exports = router;