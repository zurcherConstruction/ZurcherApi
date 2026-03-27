const express = require('express');
const router = express.Router();
const SalesLeadController = require('../controllers/SalesLeadController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// Roles autorizados para gestionar leads: admin, owner, recept, sales_rep, follow-up
const authorizedRoles = ['admin', 'owner', 'recept', 'sales_rep', 'follow-up'];

// 📊 Dashboard de estadísticas (debe ir antes de /:id para no confundir)
router.get('/dashboard/stats', verifyToken, allowRoles(authorizedRoles), SalesLeadController.getDashboardStats);

// 🔍 Verificar si ya existe un lead con esa dirección
router.get('/check-by-address', verifyToken, allowRoles(authorizedRoles), SalesLeadController.checkLeadByAddress);

// 📝 Crear un nuevo lead
router.post('/', verifyToken, allowRoles(authorizedRoles), SalesLeadController.createLead);

// 📋 Listar leads con filtros y paginación
// GET /sales-leads?page=1&pageSize=20&status=new&priority=high&search=john&tags=urgent&source=website
router.get('/', verifyToken, allowRoles(authorizedRoles), SalesLeadController.getLeads);

// 🔍 Obtener un lead por ID
router.get('/:id', verifyToken, allowRoles(authorizedRoles), SalesLeadController.getLeadById);

// ✏️ Actualizar un lead
router.put('/:id', verifyToken, allowRoles(authorizedRoles), SalesLeadController.updateLead);

// 🗑️ Archivar un lead
router.patch('/:id/archive', verifyToken, allowRoles(authorizedRoles), SalesLeadController.archiveLead);

// ❌ Eliminar permanentemente un lead (solo admin/owner)
router.delete('/:id', verifyToken, allowRoles(['admin', 'owner']), SalesLeadController.deleteLead);

// 🔄 Convertir lead a presupuesto
router.post('/:id/convert-to-budget', verifyToken, allowRoles(authorizedRoles), SalesLeadController.convertToBudget);

module.exports = router;
