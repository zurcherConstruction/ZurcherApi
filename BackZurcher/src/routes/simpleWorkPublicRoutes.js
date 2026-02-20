const express = require('express');
const router = express.Router();
const SimpleWorkController = require('../controllers/SimpleWorkController');

/**
 * Rutas PÚBLICAS para SimpleWork (sin autenticación)
 * Montadas ANTES del middleware global verifyToken en index.js
 */

// ✅ POST /api/simple-works/approve/:token - Aprobación por cliente via email (PÚBLICO)
router.post('/approve/:token', SimpleWorkController.approveSimpleWorkByToken);

module.exports = router;
