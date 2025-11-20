const express = require('express');
const router = express.Router();
const {
  getWorkChecklist,
  updateWorkChecklist,
  getChecklistStats
} = require('../controllers/workChecklistController');
const { verifyToken } = require('../middleware/isAuth');

// ✅ Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/works/checklists/stats - Estadísticas generales
router.get('/checklists/stats', getChecklistStats);

// GET /api/works/:workId/checklist - Obtener checklist de un work
router.get('/:workId/checklist', getWorkChecklist);

// PUT /api/works/:workId/checklist - Actualizar checklist de un work
router.put('/:workId/checklist', updateWorkChecklist);

module.exports = router;
