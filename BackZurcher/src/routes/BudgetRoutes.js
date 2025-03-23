const express = require('express');
const BudgetController = require('../controllers/BudgetController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario

const router = express.Router();

// Rutas con validación de token y roles
router.post('/',  allowRoles(['admin', 'recept', 'owner']), BudgetController.createBudget); // Solo administradores pueden crear presupuestos
router.get('/', verifyToken, isStaff, BudgetController.getBudgets); // Personal del hotel puede ver presupuestos
router.get('/:idBudget', verifyToken, isStaff, BudgetController.getBudgetById); // Personal del hotel puede ver un presupuesto específico
router.put('/:idBudget', verifyToken, isAdmin, BudgetController.updateBudget); // Solo administradores pueden actualizar presupuestos
router.delete('/:idBudget', verifyToken, isOwner, BudgetController.deleteBudget); // Solo el dueño puede eliminar presupuestos

module.exports = router;
