const express = require('express');
const router = express.Router();
const signNowController = require('../controllers/signNowController');

// Test de conexión con SignNow
router.get('/test-connection', signNowController.testConnection);

// 📋 Listar todos los documentos de SignNow
router.get('/documents', signNowController.listAllDocuments);

// 🔍 Obtener estado de un documento específico
router.get('/document/:documentId/status', signNowController.getDocumentStatus);

// 📥 Descargar en batch todos los documentos firmados pendientes
router.post('/batch-download-signed', signNowController.batchDownloadSigned);

module.exports = router;