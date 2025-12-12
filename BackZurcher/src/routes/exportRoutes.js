const express = require('express');
const router = express.Router();
const { exportWorksToExcel } = require('../controllers/exportController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// Exportar works a Excel
// Query params: status, applicantEmail
router.get(
  '/works',
  verifyToken,
  allowRoles(['admin', 'owner', 'worker', 'finance', 'finance-viewer']),
  exportWorksToExcel
);

module.exports = router;
