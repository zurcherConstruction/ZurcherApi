/**
 * Bank Transaction Routes
 * 
 * Rutas para gestión de transacciones bancarias
 */

const express = require('express');
const router = express.Router();
const {
  createDeposit,
  createWithdrawal,
  createTransfer,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getMonthlyReport,
  downloadMonthlyReportPDF,
  downloadMonthlyReportExcel
} = require('../controllers/bankTransactionController');

// GET /api/bank-transactions/monthly-report - Obtener reporte mensual (debe ir antes de /:id)
router.get('/monthly-report', getMonthlyReport);

// GET /api/bank-transactions/monthly-report/pdf - Descargar PDF del reporte mensual
router.get('/monthly-report/pdf', downloadMonthlyReportPDF);

// GET /api/bank-transactions/monthly-report/excel - Descargar Excel del reporte mensual
router.get('/monthly-report/excel', downloadMonthlyReportExcel);

// GET /api/bank-transactions - Listar transacciones con filtros
router.get('/', getTransactions);

// GET /api/bank-transactions/:id - Detalle de transacción específica
router.get('/:id', getTransactionById);

// POST /api/bank-transactions/deposit - Registrar depósito
router.post('/deposit', createDeposit);

// POST /api/bank-transactions/withdrawal - Registrar retiro
router.post('/withdrawal', createWithdrawal);

// POST /api/bank-transactions/transfer - Transferir entre cuentas
router.post('/transfer', createTransfer);

// DELETE /api/bank-transactions/:id - Eliminar transacción y reversar balance
router.delete('/:id', deleteTransaction);

module.exports = router;
