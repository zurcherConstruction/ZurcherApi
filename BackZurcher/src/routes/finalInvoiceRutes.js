const { Router } = require('express');
const FinalInvoiceController = require('../controllers/FinalInvoiceController');
 const upload = require('../middleware/multer'); // Si necesitas subir archivos para PDF o pagos

const router = Router();

// Crear factura final para una obra
router.post('/work/:workId/final-invoice', FinalInvoiceController.createFinalInvoice);

// Obtener factura final por ID de obra
router.get('/work/:workId/final-invoice', FinalInvoiceController.getFinalInvoiceByWorkId);

// Añadir item extra a una factura final
router.post('/:finalInvoiceId/items', FinalInvoiceController.addExtraItem);

// Actualizar item extra (Pendiente)
router.put('/items/:itemId', FinalInvoiceController.updateExtraItem);

// Eliminar item extra (Pendiente)
router.delete('/items/:itemId', FinalInvoiceController.removeExtraItem);

// Actualizar estado de la factura final (Pendiente)
router.patch('/:finalInvoiceId/status', FinalInvoiceController.updateFinalInvoiceStatus);

// Generar/Obtener PDF de la factura final (Pendiente)
router.get('/:finalInvoiceId/pdf', FinalInvoiceController.generateFinalInvoicePDF);

router.get('/:finalInvoiceId/pdf/view', FinalInvoiceController.viewFinalInvoicePDF); // NUEVO
// Descargar PDF
router.get('/:finalInvoiceId/pdf/download', FinalInvoiceController.downloadFinalInvoicePDF); // NUEVO

// --- Ruta Email ---
router.post('/:finalInvoiceId/email', FinalInvoiceController.emailFinalInvoicePDF); // NUEVO


module.exports = router;