const express = require('express');
const router = express.Router();
const {
  createSupplierInvoice,
  getSupplierInvoices,
  getSupplierInvoiceById,
  registerPayment,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  getAccountsPayable,
  getPaymentHistory
} = require('../controllers/supplierInvoiceController');

// Middleware de autenticación (ajusta según tu implementación)
// const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/supplier-invoices/accounts-payable
 * @desc    Obtener todas las cuentas por pagar (invoices pendientes)
 * @access  Private
 */
router.get('/accounts-payable', getAccountsPayable);

/**
 * @route   GET /api/supplier-invoices/payment-history
 * @desc    Obtener historial de pagos realizados
 * @query   startDate, endDate, vendor
 * @access  Private
 */
router.get('/payment-history', getPaymentHistory);

/**
 * @route   POST /api/supplier-invoices
 * @desc    Crear un nuevo invoice de proveedor
 * @body    { invoiceNumber, vendor, issueDate, dueDate, items, notes }
 * @access  Private
 */
router.post('/', createSupplierInvoice);

/**
 * @route   GET /api/supplier-invoices
 * @desc    Obtener todos los invoices con filtros opcionales
 * @query   status, vendor, startDate, endDate, includeItems
 * @access  Private
 */
router.get('/', getSupplierInvoices);

/**
 * @route   GET /api/supplier-invoices/:id
 * @desc    Obtener un invoice específico por ID con todos sus detalles
 * @access  Private
 */
router.get('/:id', getSupplierInvoiceById);

/**
 * @route   PATCH /api/supplier-invoices/:id/pay
 * @desc    Registrar un pago para un invoice
 * @body    { paymentMethod, paymentDate, paidAmount, paymentDetails }
 * @access  Private
 */
router.patch('/:id/pay', registerPayment);

/**
 * @route   PUT /api/supplier-invoices/:id
 * @desc    Actualizar un invoice existente
 * @access  Private
 */
router.put('/:id', updateSupplierInvoice);

/**
 * @route   DELETE /api/supplier-invoices/:id
 * @desc    Eliminar un invoice (solo si no está pagado)
 * @access  Private
 */
router.delete('/:id', deleteSupplierInvoice);

module.exports = router;
