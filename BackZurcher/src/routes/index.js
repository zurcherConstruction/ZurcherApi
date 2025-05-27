const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const budgetRoutes = require('./BudgetRoutes');
const pdfRoutes = require('./pdfRoutes');
const inspectionRoutes = require('./inspectionRoutes');
const materialRoutes = require('./materialRoutes');
const workRoutes = require('./workRoutes');
const permitRoutes = require('./permitRoutes');
const notificationRoutes = require('./NotificationRoutes'); // Asegúrate de que la ruta sea correcta
const archiveRoutes = require('./archiveRoutes'); // Asegúrate de que la ruta sea correcta
const receiptRoutes = require('./receiptRoutes'); // Asegúrate de que la ruta sea correcta
const incomeRoutes = require('./incomeRoutes'); // Asegúrate de que la ruta sea correcta
const expenseRoutes = require('./expenseRoutes'); // Asegúrate de que la ruta sea correcta
const balanceRoutes = require('./balanceRoutes'); // Asegúrate de que la ruta sea correcta
const systemRoutes = require('./systemRoutes'); // Asegúrate de que la ruta sea correcta
const budgetItemRoutes = require('./BudgetItemRoutes'); // Asegúrate de que la ruta sea correcta
const finalInvoiceRoutes = require('./finalInvoiceRutes'); // Asegúrate de que la ruta sea correcta
const changeOrdersRoutes = require('./changeOrderRoutes'); // Asegúrate de que la ruta sea correcta
const maintenanceRoutes = require('./maintenanceRoutes'); // Asegúrate de que la ruta sea correcta

router.use('/auth', authRoutes); // Registro y login no requieren token
router.use('/change-orders',changeOrdersRoutes); // Ruta para comprobantes
// Rutas protegidas (requieren token)
const { verifyToken } = require('../middleware/isAuth');
router.use(verifyToken); // Middleware global para rutas protegidas
router.use('/admin', adminRoutes);
router.use('/budget', budgetRoutes);
router.use('/budget-item', budgetItemRoutes); // Rutas para BudgetItems
router.use('/pdf', pdfRoutes);
router.use('/inspection', inspectionRoutes);
router.use('/material', materialRoutes);
router.use('/work', workRoutes);
router.use('/permit', permitRoutes);
router.use('/notification', notificationRoutes); // Rutas de notificaciones
router.use('/archive', archiveRoutes); // Ruta para obtener presupuestos archivados
router.use('/receipt', receiptRoutes); // Ruta para comprobantes
router.use('/balance', balanceRoutes)
router.use('/income', incomeRoutes); // Ruta para ingresos
router.use('/expense', expenseRoutes); // Ruta para gastos
router.use('/system', systemRoutes); // Ruta para comprobantes
router.use('/final-invoice', finalInvoiceRoutes); // Ruta para comprobantes
router.use('/maintenance', maintenanceRoutes); // Ruta para visitas de mantenimiento

module.exports = router;