const express = require('express');
const router = express.Router();
const PermitController = require('../controllers/PermitController');

// 🆕 RUTA PÚBLICA: Generar enlace de firma on-demand y redirigir a DocuSign (SIN AUTENTICACIÓN)
// Esta ruta permite al cliente firmar el PPI sin necesidad de login
router.get('/:idPermit/sign', PermitController.getPPISigningLinkAndRedirect);

module.exports = router;
