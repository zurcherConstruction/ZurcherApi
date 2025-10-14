/**
 * 🎯 STRIPE WEBHOOK ROUTES
 * Rutas para recibir notificaciones de Stripe sobre pagos
 */

const express = require('express');
const router = express.Router();
const stripeWebhookController = require('../controllers/stripeWebhookController');

/**
 * ⚠️ IMPORTANTE: El webhook de Stripe requiere el body RAW (sin parsear como JSON)
 * Esta ruta debe estar registrada ANTES del middleware express.json() en app.js
 * O usar express.raw() específicamente para esta ruta
 */

// 🔔 Endpoint principal del webhook - Stripe enviará eventos aquí
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Necesario para verificar la firma de Stripe
  stripeWebhookController.handleStripeWebhook
);

// 🧪 Endpoint de prueba para verificar que el webhook está accesible
router.get('/test', stripeWebhookController.testWebhook);

module.exports = router;
