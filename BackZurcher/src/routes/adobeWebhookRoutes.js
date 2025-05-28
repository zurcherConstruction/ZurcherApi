const { Router } = require('express');
const adobeSignController = require('../controllers/adobeSignController');


const router = Router();

// Ruta para que Adobe Sign envíe los eventos del webhook
// Adobe Sign enviará solicitudes POST a esta ruta.
router.post('/event', adobeSignController.handleWebhookEvent);

// Adobe Sign también podría enviar una solicitud GET o POST para la verificación inicial del webhook.
// La lógica en handleWebhookEvent ya cubre la respuesta al desafío de verificación.
router.get('/event', adobeSignController.handleWebhookEvent); // Para cubrir el GET de verificación si Adobe lo usa.



module.exports = router;