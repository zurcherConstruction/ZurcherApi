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
const accountsReceivableRoutes = require('./accountsReceivableRoutes'); // 🆕 Cuentas por cobrar
//const adobeWebhookRoutes = require('./adobeWebhookRoutes'); // Asegúrate de que la ruta sea correcta
const adobeRoutes = require('./adobeRoutes'); // Asegúrate de que la ruta sea correcta

const signNowRoutes = require('./signNowRoutes'); // Asegúrate de que la ruta sea correcta
const contactRoutes = require('./contactRoutes'); // Asegúrate de que la ruta sea correcta
const importRoutes = require('./importRoutes'); // Rutas para importar trabajos legacy
const budgetPublicRoutes = require('./BudgetPublicRoutes');

router.use('/auth', authRoutes); // Registro y login no requieren token
router.use('/change-orders',changeOrdersRoutes); // Ruta para change orders (incluye rutas públicas)

//router.use('/webhooks-adobe-sign', adobeWebhookRoutes); 
router.use('/signnow', signNowRoutes);
router.use('/contact', contactRoutes); // Ruta pública para formulario de contacto

// 🆕 RUTAS PÚBLICAS DE BUDGETS (antes del verifyToken)
// Estas rutas permiten a los clientes revisar presupuestos sin autenticación

router.use('/budgets', budgetPublicRoutes); // Rutas públicas de presupuestos

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
router.use('/accounts-receivable', accountsReceivableRoutes); // 🆕 Ruta para cuentas por cobrar
router.use('/import', importRoutes); // Ruta para importar trabajos legacy

module.exports = router;