const { Receipt } = require('../data');
const { cloudinary } = require('../utils/cloudinaryConfig'); // Asegúrate de importar la configuración de Cloudinary


const createReceipt = async (req, res) => {
  console.log('-----------------------------------------'); // Separador
  console.log('[ReceiptController] createReceipt iniciado.');
  console.log('[ReceiptController] req.body:', req.body);
  // Loguear solo info relevante del archivo, no el buffer entero
  console.log('[ReceiptController] req.file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
  } : 'No file received');

  if (!req.file) {
    console.error('[ReceiptController] Error: No se recibió ningún archivo.');
    return res.status(400).json({ error: true, message: 'No se subió ningún archivo.' });
  }

  const { relatedModel, relatedId, type, notes } = req.body;
  if (!relatedModel || !relatedId || !type) {
    console.error('[ReceiptController] Error: Faltan datos requeridos en el body:', req.body);
    return res.status(400).json({ error: true, message: 'Faltan datos requeridos (relatedModel, relatedId, type).' });
  }

  try {
    console.log('[ReceiptController] Preparando stream para Cloudinary...');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'zurcher_receipts',
        resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'auto',
        access_mode: 'public'
      },
      // --- INICIO CALLBACK CLOUDINARY ---
      async (error, result) => {
        if (error) {
          // Error durante la subida a Cloudinary
          console.error('[ReceiptController] Error subiendo a Cloudinary:', error);
          return res.status(500).json({ error: true, message: 'Error al subir comprobante a Cloudinary.', details: error.message });
        }

        // Cloudinary subió el archivo con éxito
        console.log('[ReceiptController] Cloudinary subió el archivo con éxito. Resultado:', {
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type,
            format: result.format
        });

        // --- Intentar guardar en Base de Datos ---
        try {
          console.log('[ReceiptController] Intentando guardar Receipt en la base de datos...');
          const newReceiptData = {
            relatedModel,
            relatedId,
            type,
            notes,
            fileUrl: result.secure_url,
            publicId: result.public_id,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
          };
          console.log('[ReceiptController] Datos para Receipt.create:', newReceiptData);

          const newReceipt = await Receipt.create(newReceiptData);

          console.log("[ReceiptController] Receipt creado exitosamente en BD:", newReceipt.toJSON()); // Usar toJSON para mejor log
          res.status(201).json(newReceipt); // Enviar respuesta al frontend

        } catch (dbError) {
          // Error al guardar en la base de datos DESPUÉS de subir a Cloudinary
          console.error("[ReceiptController] Error guardando Receipt en BD:", dbError);
          console.log(`[ReceiptController] Intentando borrar archivo huérfano de Cloudinary con public_id: ${result.public_id}`);
          cloudinary.uploader.destroy(result.public_id, (destroyError, destroyResult) => {
            if (destroyError) console.error("[ReceiptController] Error al borrar archivo huérfano de Cloudinary:", destroyError);
            else console.log("[ReceiptController] Archivo huérfano de Cloudinary borrado:", destroyResult);
          });
          res.status(500).json({
            error: true,
            message: 'Error interno al guardar el comprobante en la base de datos.',
            details: dbError.message,
          });
        }
        // --- Fin Guardar en Base de Datos ---
      }
      // --- FIN CALLBACK CLOUDINARY ---
    );

    // Enviar el buffer a Cloudinary
    console.log('[ReceiptController] Enviando buffer a Cloudinary...');
    uploadStream.end(req.file.buffer);
    console.log('[ReceiptController] Buffer enviado a Cloudinary (la subida es asíncrona).');

  } catch (generalError) {
    console.error("[ReceiptController] Error general (antes de stream):", generalError);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor al procesar la solicitud.',
      details: generalError.message,
    });
  }
};
  const getReceiptsByRelated = async (req, res) => {
    try {
      const { relatedModel, relatedId } = req.params;
      const receipts = await Receipt.findAll({ where: { relatedModel, relatedId } });
      res.status(200).json(receipts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const deleteReceipt = async (req, res) => {
    const { idReceipt } = req.params;
    try {
      // 1. Buscar el recibo para obtener el publicId de Cloudinary
      const receipt = await Receipt.findByPk(idReceipt);
      if (!receipt) {
        return res.status(404).json({ error: true, message: 'Comprobante no encontrado.' });
      }
  
      const publicId = receipt.publicId; // Obtener el ID de Cloudinary
  
      // 2. Borrar de la Base de Datos
      await Receipt.destroy({ where: { idReceipt } });
  
      // 3. Borrar de Cloudinary (si existe el publicId)
      if (publicId) {
        console.log(`Intentando borrar archivo de Cloudinary con public_id: ${publicId}`);
        cloudinary.uploader.destroy(publicId, (destroyError, destroyResult) => {
          if (destroyError) {
            // Loggear el error pero no necesariamente fallar la solicitud, ya que la BD se borró
            console.error("Error al borrar archivo de Cloudinary durante la eliminación:", destroyError);
          } else {
            console.log("Archivo de Cloudinary borrado:", destroyResult);
          }
        });
      } else {
          console.warn(`El recibo ${idReceipt} no tenía publicId para borrar de Cloudinary.`);
      }
  
      res.status(204).send(); // Éxito (Sin contenido)
  
    } catch (error) {
      console.error(`Error al borrar Receipt ${idReceipt}:`, error);
      res.status(500).json({ error: true, message: error.message });
    }
  };
  
  
  module.exports = {
    createReceipt,
    getReceiptsByRelated,
    deleteReceipt,
  };