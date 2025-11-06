const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // Configuración para manejar datos en memoria
const {
  createSupplierInvoice,
  getSupplierInvoices,
  getSupplierInvoiceById,
  registerPayment,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  getAccountsPayable,
  getPaymentHistory,
  uploadInvoicePdf,
  distributeInvoiceToWorks
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
 * @route   POST /api/supplier-invoices/:id/upload-invoice
 * @desc    Subir PDF o imagen del invoice a Cloudinary
 * @body    FormData con file (PDF, JPG, PNG, WEBP)
 * @access  Private
 */
router.post('/:id/upload-invoice', upload.single('file'), uploadInvoicePdf);

/**
 * @route   POST /api/supplier-invoices/:id/distribute
 * @desc    Distribuir invoice entre múltiples trabajos y crear expenses automáticamente
 * @body    FormData con distribution (JSON string), paymentMethod, paymentDate, referenceNumber, receipt (file opcional)
 * @access  Private
 */
router.post('/:id/distribute', upload.single('receipt'), distributeInvoiceToWorks);

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
