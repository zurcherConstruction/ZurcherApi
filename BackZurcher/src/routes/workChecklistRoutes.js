const express = require('express');
const router = express.Router();
const {
  getWorkChecklist,
  updateWorkChecklist,
  getChecklistStats,
  getBatchChecklists // 🆕 Nuevo endpoint batch
} = require('../controllers/workChecklistController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// ✅ Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/works/checklists/stats - Estadísticas generales
router.get('/checklists/stats', allowRoles(['admin', 'owner', 'finance', 'recept']), getChecklistStats);

// 🆕 POST /api/works/checklists/batch - Obtener múltiples checklists en 1 query
router.post('/checklists/batch', allowRoles(['admin', 'owner', 'finance', 'recept']), getBatchChecklists);

// GET /api/works/:workId/checklist - Obtener checklist de un work (solo lectura para varios roles)
router.get('/:workId/checklist', allowRoles(['admin', 'owner', 'finance', 'recept']), getWorkChecklist);

// PUT /api/works/:workId/checklist - Actualizar checklist de un work (solo owner puede modificar)
router.put('/:workId/checklist', allowRoles(['owner']), updateWorkChecklist);

module.exports = router;
