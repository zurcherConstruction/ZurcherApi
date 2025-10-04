const express = require('express');
const router = express.Router();
const AccountsReceivableController = require('../controllers/AccountsReceivableController');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");

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

module.exports = router;
