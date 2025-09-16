const { Router } = require('express');
const FinalInvoiceController = require('../controllers/FinalInvoiceController');
const upload = require('../middleware/multer'); // Si necesitas subir archivos para PDF o pagos
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

const router = Router();

// Crear factura final para una obra
router.post('/work/:workId/final-invoice', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.createFinalInvoice);

// Obtener factura final por ID de obra
router.get('/work/:workId/final-invoice', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.getFinalInvoiceByWorkId);

// Añadir item extra a una factura final
router.post('/:finalInvoiceId/items', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.addExtraItem);

// Actualizar item extra (Pendiente)
router.put('/items/:itemId', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.updateExtraItem);

// Eliminar item extra (Pendiente)
router.delete('/items/:itemId', verifyToken, allowRoles(['admin', 'owner']), FinalInvoiceController.removeExtraItem);

// Actualizar estado de la factura final (Pendiente)
router.patch('/:finalInvoiceId/status', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.updateFinalInvoiceStatus);

// Generar/Obtener PDF de la factura final (Pendiente)
router.get('/:finalInvoiceId/pdf', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.generateFinalInvoicePDF);

router.get('/:finalInvoiceId/pdf/view', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.viewFinalInvoicePDF); // NUEVO
router.get('/:finalInvoiceId/preview-pdf', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.previewFinalInvoicePDF); // NUEVO

// Descargar PDF
router.get('/:finalInvoiceId/pdf/download', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.downloadFinalInvoicePDF); // NUEVO

// --- Ruta Email ---
router.post('/:finalInvoiceId/email', verifyToken, allowRoles(['admin', 'recept', 'owner', 'finance']), FinalInvoiceController.emailFinalInvoicePDF); // NUEVO


module.exports = router;