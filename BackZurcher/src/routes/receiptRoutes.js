const express = require('express');
const multer = require('multer');
const upload = multer(); // Configuración para manejar datos en memoria
const { createReceipt, getReceiptsByRelated, deleteReceipt } = require('../controllers/ReceiptController');

const router = express.Router();

router.post('/', upload.single('file'), createReceipt); // Procesa el archivo PDF
router.get('/:relatedModel/:relatedId', getReceiptsByRelated);
router.delete('/:idReceipt', deleteReceipt);

module.exports = router;