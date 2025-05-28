const { Budget } = require('../data'); // Asumiendo que tienes un modelo Budget
// Aquí importarías el SDK de Adobe Sign o las funciones para interactuar con su API si necesitas descargar el PDF, etc.
// const adobeSignService = require('../services/adobeSignService'); 

const adobeSignController = {
    /**
     * Maneja los eventos entrantes del webhook de Adobe Sign.
     */
    handleWebhookEvent: async (req, res) => {
        console.log('Received Adobe Sign Webhook Event:');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));

        // 1. Verificación del Webhook (Desafío HTTP para la configuración inicial)
        // Adobe Sign envía un encabezado 'x-adobesign-clientid' en la solicitud de verificación.
        // Debes responder con el mismo valor en el encabezado 'X-AdobeSign-ClientId'.
        const adobeSignClientId = req.headers['x-adobesign-clientid'];
        if (adobeSignClientId) {
            console.log(`Responding to Adobe Sign webhook verification challenge with Client ID: ${adobeSignClientId}`);
            res.setHeader('X-AdobeSign-ClientId', adobeSignClientId);
            return res.status(200).send('Webhook verification successful.');
        }

        // 2. Procesar el evento real (después de la verificación)
        // Aquí es donde procesarías la notificación del evento, como 'AGREEMENT_SIGNED'.
        const { agreement, event } = req.body; // La estructura del payload puede variar

        if (!agreement || !agreement.id || !event) {
            console.warn('Webhook payload malformed or missing essential data.');
            return res.status(400).send('Malformed payload.');
        }

        const agreementId = agreement.id;
        const eventType = event; // O la ruta al tipo de evento en el payload

        console.log(`Processing event: ${eventType} for agreement ID: ${agreementId}`);

        try {
            if (eventType === 'AGREEMENT_WORKFLOW_COMPLETED' || eventType === 'AGREEMENT_SIGNED') {
                // Encuentra el presupuesto asociado con este agreementId
                const budget = await Budget.findOne({ where: { adobeAgreementId: agreementId } });

                if (budget) {
                    console.log(`Budget ${budget.idBudget} found for agreement ${agreementId}.`);
                    // Actualizar el estado del presupuesto a 'signed' o 'approved_by_client'
                    budget.status = 'signed'; // O el estado que uses
                    // Opcionalmente: Descargar el PDF firmado desde Adobe Sign y guardarlo
                    // const signedPdfPath = await adobeSignService.downloadSignedDocument(agreementId);
                    // budget.signedPdfPath = signedPdfPath; // Guarda la ruta al PDF firmado
                    await budget.save();
                    console.log(`Budget ${budget.idBudget} status updated to signed.`);
                } else {
                    console.warn(`No budget found for agreement ID: ${agreementId}`);
                }
            }
            // Puedes manejar otros tipos de eventos aquí (AGREEMENT_REJECTED, etc.)

            res.status(200).send('Event received and processed.');
        } catch (error) {
            console.error('Error processing Adobe Sign webhook event:', error);
            res.status(500).send('Internal server error processing webhook.');
        }
    },
};

module.exports = adobeSignController;