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

/**
 * Subir archivos multimedia (imágenes o videos) a Cloudinary
 * @route POST /api/gallery/upload
 */
const uploadGalleryMedia = async (req, res) => {
  try {
    const { folder = 'work_gallery' } = req.body;

    // Verificar que hay archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se enviaron archivos'
      });
    }

    console.log(`📤 Subiendo ${req.files.length} archivos a carpeta: ${folder}`);

    const uploadPromises = req.files.map(async (file) => {
      try {
        // Determinar tipo de recurso basado en mimetype
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';

        // Configurar opciones de upload
        const uploadOptions = {
          folder: folder,
          resource_type: resourceType,
        };

        // Aplicar transformaciones según el tipo
        if (resourceType === 'image') {
          uploadOptions.quality = 'auto:good';
          uploadOptions.fetch_format = 'auto';
        } else if (resourceType === 'video') {
          // Videos: procesamiento asíncrono para archivos grandes
          uploadOptions.resource_type = 'video';
          uploadOptions.eager_async = true; // Procesar de forma asíncrona
          uploadOptions.eager = [
            { width: 1280, height: 720, crop: 'limit', quality: 'auto:low', format: 'mp4' }
          ];
          uploadOptions.quality = 'auto:low';
        }

        // Subir a Cloudinary usando buffer
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });

        return {
          success: true,
          public_id: result.public_id,
          url: result.secure_url,
          format: result.format,
          resource_type: result.resource_type,
          width: result.width,
          height: result.height,
          size: result.bytes,
          created_at: result.created_at
        };
      } catch (error) {
        console.error(`❌ Error subiendo archivo ${file.originalname}:`, error);
        return {
          success: false,
          filename: file.originalname,
          error: error.message
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.status(200).json({
      success: true,
      message: `${successful.length} archivos subidos correctamente`,
      uploaded: successful,
      failed: failed.length > 0 ? failed : undefined,
      total: req.files.length
    });

  } catch (error) {
    console.error('❌ Error en uploadGalleryMedia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivos',
      error: error.message
    });
  }
};

/**
 * Eliminar un recurso de Cloudinary
 * @route DELETE /api/gallery/:publicId
 */
const deleteGalleryMedia = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resource_type = 'image' } = req.query;

    console.log(`🗑️ Eliminando recurso: ${publicId}`);

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resource_type
    });

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'Recurso eliminado correctamente',
        public_id: publicId
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Recurso no encontrado',
        result: result.result
      });
    }

  } catch (error) {
    console.error('❌ Error eliminando recurso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar recurso',
      error: error.message
    });
  }
};

module.exports = {
  getGalleryResources,
  getAllMediaResources,
  uploadGalleryMedia,
  deleteGalleryMedia
};
