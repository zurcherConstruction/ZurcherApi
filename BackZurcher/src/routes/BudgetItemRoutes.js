const express = require('express');
const budgetItemController = require('../controllers/BudgetItemController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol'); // Asumiendo que tienes este middleware

const router = express.Router();

// --- Rutas para BudgetItems ---
// Todas las rutas requieren token y rol de admin/owner para gestionar el catálogo

// POST /api/budget-items - Crear un nuevo item (con imagen opcional)
const { upload } = require('../middleware/multer');
const { uploadImport } = require('../middleware/multerImport');
router.post(
    '/',
    verifyToken,
    allowRoles(['admin', 'owner']),
    upload.single('image'), // Campo 'image' para la imagen opcional
    budgetItemController.createBudgetItem
);

// GET /api/budget-items - Obtener todos los items (activos por defecto)
// Permitir a cualquier usuario autenticado ver los items disponibles para crear presupuestos
router.get(
    '/',
    verifyToken, // Cualquier usuario logueado puede ver la lista de items
    budgetItemController.getBudgetItems
    // Opcional: podrías añadir ?active=false o ?active=all para ver inactivos/todos si tienes rol admin/owner
);

// GET /api/budget-items/categories - Obtener todas las categorías disponibles
router.get(
    '/categories',
    verifyToken, // Cualquier usuario puede ver las categorías
    budgetItemController.getCategories
);

// GET /api/budget-items/category/:category - Obtener items por categoría específica
router.get(
    '/category/:category',
    verifyToken, // Cualquier usuario puede filtrar por categoría
    budgetItemController.getBudgetItemsByCategory
);

// GET /api/budget-items/:id - Obtener un item específico por ID
router.get(
    '/:id',
    verifyToken, // Cualquier usuario logueado puede ver detalles de un item
    budgetItemController.getBudgetItemById
);

// PUT /api/budget-items/:id - Actualizar un item existente
router.put(
    '/:id',
    verifyToken,
    allowRoles(['admin', 'owner']), // Solo admin/owner pueden modificar items
    upload.single('image'), // Agregar esta línea para manejar imágenes en actualizaciones
    budgetItemController.updateBudgetItem
);

// PATCH /api/budget-items/:id/deactivate - Desactivar un item (soft delete)
router.patch(
    '/:id/deactivate',
    verifyToken,
    allowRoles(['admin', 'owner']),
    budgetItemController.deactivateBudgetItem
);

// PATCH /api/budget-items/:id/activate - Reactivar un item
router.patch(
    '/:id/activate',
    verifyToken,
    allowRoles(['admin', 'owner']),
    budgetItemController.activateBudgetItem
);


// DELETE /api/budget-items/:id - Desactivar (soft delete) un item
router.delete(
    '/:id',
    verifyToken,
    allowRoles(['admin', 'owner']), // Solo admin/owner pueden desactivar items
    budgetItemController.deleteBudgetItem
);

// --- RUTAS DE IMPORTACIÓN/EXPORTACIÓN ---

// GET /api/budget-items/export/items - Exportar todos los items a Excel/CSV
router.get(
    '/export/items',
    verifyToken,
    allowRoles(['admin', 'owner']),
    budgetItemController.exportItems
);

// GET /api/budget-items/export/template - Descargar template de importación
router.get(
    '/export/template',
    verifyToken,
    allowRoles(['admin', 'owner']),
    budgetItemController.generateTemplate
);

// POST /api/budget-items/import/items - Importar items desde Excel/CSV
router.post(
    '/import/items',
    verifyToken,
    allowRoles(['admin', 'owner']),
    uploadImport.single('file'), // Campo 'file' para el archivo Excel/CSV
    budgetItemController.importItems
);

module.exports = router;