const express = require('express');
const router = express.Router();
const AccountsReceivableController = require('../controllers/AccountsReceivableController');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");
const multer = require('multer');

// Configurar Multer para archivos de comprobantes de comisiones
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG, PNG o PDF'));
    }
  }
});

/**
 * Rutas para Cuentas por Cobrar (Accounts Receivable)
 * Requiere autenticación y roles: admin, owner, finance
 */

// Obtener resumen completo de cuentas por cobrar
router.get(
  '/summary',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  AccountsReceivableController.getAccountsReceivableSummary
);

// Obtener detalle de cuenta por cobrar de una obra específica
router.get(
  '/work/:workId',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  AccountsReceivableController.getWorkReceivableDetail
);

// Obtener comisiones pendientes de pago a vendedores
router.get(
  '/pending-commissions',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  AccountsReceivableController.getPendingCommissions
);

// 🆕 Obtener invoices activos (budgets aprobados) con tracking de pagos
router.get(
  '/active-invoices',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  AccountsReceivableController.getActiveInvoices
);

// 🆕 Obtener todos los ingresos recibidos (Income)
router.get(
  '/income',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  AccountsReceivableController.getIncome
);

// Marcar comisión como pagada o no pagada (con soporte para archivo de comprobante)
router.put(
  '/:budgetId/commission-paid',
  verifyToken,
  allowRoles(['admin', 'owner', 'finance']),
  upload.single('file'), // 🆕 Soportar archivo opcional de comprobante
  AccountsReceivableController.markCommissionAsPaid
);

module.exports = router;
