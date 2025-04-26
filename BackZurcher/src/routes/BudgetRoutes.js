const express = require('express');
const BudgetController = require('../controllers/BudgetController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles, isOwner, isAdmin, isRecept, isStaff } = require('../middleware/byRol'); // Ajusta el nombre del archivo si es necesario
const { upload } = require('../middleware/multer'); // Asegúrate de que la ruta sea correcta    
const router = express.Router();



// Rutas con validación de token y roles
router.post('/',  allowRoles(['admin', 'recept', 'owner']), BudgetController.createBudget); // Solo administradores pueden crear presupuestos
router.get('/all', verifyToken, isStaff, BudgetController.getBudgets); // Personal del hotel puede ver presupuestos


router.post(
    '/:idBudget/upload',
    verifyToken,
    allowRoles(['admin', 'recept', 'owner']),
    upload.single('file'), // Middleware correcto
    BudgetController.uploadInvoice
  );
  router.post(
    '/:idBudget/upload-pdf',
    verifyToken,
    allowRoles(['admin', 'recept', 'owner']), // Roles permitidos
    upload.single('file'), // Middleware para manejar el archivo
    BudgetController.uploadBudgetPDF // Controlador para manejar la lógica
);

  

  router.put('/:idBudget', verifyToken, BudgetController.updateBudget); // Solo administradores pueden actualizar presupuestos
  router.get('/:idBudget', verifyToken, isStaff, BudgetController.getBudgetById); // Personal del hotel puede ver un presupuesto específico

router.delete('/:idBudget', verifyToken, isOwner, BudgetController.deleteBudget); // Solo el dueño puede eliminar presupuestos
module.exports = router;
