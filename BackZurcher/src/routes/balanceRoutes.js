const express = require('express');
const router = express.Router();
const { getIncomesAndExpensesByWorkId, getBalanceByWorkId, getGeneralBalance } = require('../controllers/balanceController');

router.get('/work/:workId', getIncomesAndExpensesByWorkId);
router.get('/balance/:workId', getBalanceByWorkId);
router.get('/generalBalance', getGeneralBalance);

module.exports = router;