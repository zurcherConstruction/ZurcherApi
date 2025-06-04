const express = require('express');
const router = express.Router();
const SignNowController = require('../controllers/signNowController');

// Test de conexión con SignNow
router.get('/test-connection', SignNowController.testConnection);

module.exports = router;