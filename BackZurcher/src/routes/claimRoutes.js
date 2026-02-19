const express = require('express');
const router = express.Router();
const multer = require('multer');
const ClaimController = require('../controllers/ClaimController');
const { verifyToken } = require('../middleware/isAuth');

// Multer para imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (allowedTypes.test(extension)) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF)'));
  }
});

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/claims/assigned - Reclamos asignados al staff autenticado (app móvil)
router.get('/assigned', ClaimController.getAssignedClaims);

// GET /api/claims/addresses - Direcciones existentes para vincular
router.get('/addresses', ClaimController.getAddressesForLinking);

// GET /api/claims - Obtener todos los reclamos
router.get('/', ClaimController.getAllClaims);

// POST /api/claims - Crear reclamo
router.post('/', ClaimController.createClaim);

// GET /api/claims/:id - Obtener reclamo por ID
router.get('/:id', ClaimController.getClaimById);

// PUT /api/claims/:id - Actualizar reclamo
router.put('/:id', ClaimController.updateClaim);

// PATCH /api/claims/:id - Actualizar campos
router.patch('/:id', ClaimController.updateClaim);

// DELETE /api/claims/:id - Eliminar reclamo
router.delete('/:id', ClaimController.deleteClaim);

// POST /api/claims/:id/images - Subir imagen (query: type=claim|repair)
router.post('/:id/images', upload.single('image'), ClaimController.uploadImage);

// DELETE /api/claims/:id/images/:imageId - Eliminar imagen
router.delete('/:id/images/:imageId', ClaimController.deleteImage);

module.exports = router;
