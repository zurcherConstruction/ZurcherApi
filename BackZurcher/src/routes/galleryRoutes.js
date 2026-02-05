// routes/galleryRoutes.js
const express = require('express');
const router = express.Router();
const { getGalleryResources, getAllMediaResources } = require('../controllers/galleryController');

// Obtener recursos de una carpeta (solo imágenes o solo videos)
router.get('/:folderName', getGalleryResources);

// Obtener todos los recursos (imágenes + videos) de una carpeta
router.get('/:folderName/all', getAllMediaResources);

module.exports = router;
