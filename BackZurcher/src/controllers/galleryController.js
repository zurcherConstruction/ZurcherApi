// controllers/galleryController.js
const { cloudinary } = require('../utils/cloudinaryConfig');

/**
 * Obtener todos los recursos (imágenes y videos) de una carpeta específica en Cloudinary
 * @route GET /api/gallery/:folderName
 */
const getGalleryResources = async (req, res) => {
  try {
    const { folderName } = req.params;
    const maxResults = parseInt(req.query.max_results) || 100; // Default 100
    const resourceType = req.query.type || 'image'; // 'image', 'video', o 'auto'

    console.log(`📸 Obteniendo recursos de carpeta: ${folderName}, tipo: ${resourceType}`);

    // Buscar recursos en la carpeta
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderName, // Carpeta en Cloudinary
      max_results: maxResults,
      resource_type: resourceType,
    });

    // Formatear respuesta
    const resources = result.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      created_at: resource.created_at,
      resource_type: resource.resource_type,
      // Generar thumbnail optimizado
      thumbnail: cloudinary.url(resource.public_id, {
        width: 400,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      })
    }));

    res.status(200).json({
      success: true,
      folder: folderName,
      count: resources.length,
      resources
    });

  } catch (error) {
    console.error('❌ Error obteniendo recursos de Cloudinary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recursos de la galería',
      error: error.message
    });
  }
};

/**
 * Obtener recursos combinados (imágenes + videos) de una carpeta
 * @route GET /api/gallery/:folderName/all
 */
const getAllMediaResources = async (req, res) => {
  try {
    const { folderName } = req.params;
    const maxResults = parseInt(req.query.max_results) || 50;

    console.log(`🎬 Obteniendo imágenes y videos de: ${folderName}`);

    // Obtener imágenes
    const imagesResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderName,
      max_results: maxResults,
      resource_type: 'image',
    });

    // Obtener videos
    const videosResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderName,
      max_results: maxResults,
      resource_type: 'video',
    });

    // Formatear y combinar
    const images = imagesResult.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      created_at: resource.created_at,
      type: 'image',
      thumbnail: cloudinary.url(resource.public_id, {
        width: 400,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      })
    }));

    const videos = videosResult.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      duration: resource.duration,
      created_at: resource.created_at,
      type: 'video',
      thumbnail: cloudinary.url(resource.public_id, {
        width: 400,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        resource_type: 'video',
        format: 'jpg'
      })
    }));

    // Combinar y ordenar por fecha (más recientes primero)
    const allResources = [...images, ...videos].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    res.status(200).json({
      success: true,
      folder: folderName,
      total: allResources.length,
      images: images.length,
      videos: videos.length,
      resources: allResources
    });

  } catch (error) {
    console.error('❌ Error obteniendo media de Cloudinary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recursos multimedia',
      error: error.message
    });
  }
};

module.exports = {
  getGalleryResources,
  getAllMediaResources
};
