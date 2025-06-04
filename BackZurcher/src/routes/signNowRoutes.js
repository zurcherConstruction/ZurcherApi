const express = require('express');
const router = express.Router();
const signNowController = require('../controllers/signNowController');

// Test de conexión con SignNow
router.get('/test-connection', signNowController.testConnection);

module.exports = router;
// Este archivo define las rutas para la integración con SignNow.