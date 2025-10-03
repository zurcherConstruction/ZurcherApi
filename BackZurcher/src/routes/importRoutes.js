const express = require('express');
const ImportWorkController = require('../controllers/ImportWorkController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');
const { upload } = require('../middleware/multer');

const router = express.Router();

// POST /api/import/work - Importar trabajo legacy completo
router.post('/work', 
  verifyToken, 
  allowRoles(['admin', 'owner']), // Solo admin y owner pueden importar
  upload.fields([
    { name: 'signedBudget', maxCount: 1 },   // PDF del presupuesto firmado
    { name: 'permitPdf', maxCount: 1 },      // PDF del permit
    { name: 'optionalDocs', maxCount: 1 }    // Documentos opcionales
  ]), 
  ImportWorkController.importExistingWork
);

module.exports = router;