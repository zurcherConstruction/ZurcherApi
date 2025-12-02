const express = require('express');
const router = express.Router();
const ChangeOrderController = require('../controllers/changeOrderController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol')


router.post('/:idWork/change-orders', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), ChangeOrderController.recordOrUpdateChangeOrderDetails);

router.put('/:changeOrderId', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), ChangeOrderController.recordOrUpdateChangeOrderDetails);

router.post(
  '/:changeOrderId/send-to-client',verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), ChangeOrderController.sendChangeOrderToClient
);
router.get('/:changeOrderId/preview-pdf', verifyToken, allowRoles(['admin', 'recept', 'owner','worker', 'finance', 'finance-viewer']), ChangeOrderController.previewChangeOrderPDF);

// 🆕 Ruta para aprobación manual de Change Order
router.post('/:changeOrderId/manual-approval', verifyToken, allowRoles(['admin', 'recept', 'owner']), ChangeOrderController.approveChangeOrderManually);

router.get('/respond', ChangeOrderController.handleClientChangeOrderResponse);

router.delete('/:changeOrderId', verifyToken, allowRoles(['admin', 'recept', 'owner','worker']), ChangeOrderController.deleteChangeOrder);

module.exports = router;