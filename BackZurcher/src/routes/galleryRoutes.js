// routes/galleryRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getGalleryResources, getAllMediaResources, uploadGalleryMedia, deleteGalleryMedia } = require('../controllers/galleryController');
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');

// Configurar multer para usar memoria (sin guardar en disco)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB máximo por archivo (videos grandes)
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes y videos
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo imágenes y videos.'), false);
    }
  }
});

// Rutas públicas (GET)
// Obtener recursos de una carpeta (solo imágenes o solo videos)
router.get('/:folderName', getGalleryResources);

// Obtener todos los recursos (imágenes + videos) de una carpeta
router.get('/:folderName/all', getAllMediaResources);

// Rutas protegidas (solo owner)
// Subir archivos multimedia
router.post(
  '/upload',
  verifyToken,
  allowRoles(['owner']),
  upload.array('files', 20), // Máximo 20 archivos a la vez
  uploadGalleryMedia
);

// Eliminar un recurso
router.delete(
  '/:publicId',
  verifyToken,
  allowRoles(['owner']),
  deleteGalleryMedia
);

module.exports = router;
