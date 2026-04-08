

const cloudinaryConfig = {
  cloudName: 'dt4ah1jmy',
  uploadPreset: 'Zurcher',
};

export const openCloudinaryWidget = (callback) => {
  const cloudinaryWidget = window.cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      multiple: true,
      folder: 'packs',
    },
    (error, result) => {
      if (result.event === 'success') {
        callback(result.info.secure_url);  
      }
    }
  );
  cloudinaryWidget.open();
};

// 📄 Widget específico para documentos de Knowledge Base (PDFs, imágenes, etc.)
export const openDocumentUploadWidget = (callback, onAllUploadsComplete) => {
  const uploadedFiles = [];
  
  const cloudinaryWidget = window.cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      multiple: true,
      folder: 'knowledge-base-documents',
      resourceType: 'auto', // Permite imágenes, PDFs, y otros tipos
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
      maxFileSize: 10000000, // 10MB
      maxFiles: 10,
      sources: ['local', 'url', 'camera'],
      showAdvancedOptions: false,
      cropping: false,
      styles: {
        palette: {
          window: "#FFFFFF",
          windowBorder: "#3B82F6",
          tabIcon: "#3B82F6",
          menuIcons: "#5A5A5A",
          textDark: "#000000",
          textLight: "#FFFFFF",
          link: "#3B82F6",
          action: "#3B82F6",
          inactiveTabIcon: "#9CA3AF",
          error: "#EF4444",
          inProgress: "#3B82F6",
          complete: "#10B981",
          sourceBg: "#F9FAFB"
        }
      }
    },
    (error, result) => {
      if (error) {
        console.error('Error uploading to Cloudinary:', error);
        return;
      }

      // Archivo individual subido exitosamente
      if (result.event === 'success') {
        const fileInfo = {
          url: result.info.secure_url,
          publicId: result.info.public_id,
          format: result.info.format,
          resourceType: result.info.resource_type,
          size: result.info.bytes,
          originalFilename: result.info.original_filename,
          createdAt: result.info.created_at
        };
        
        uploadedFiles.push(fileInfo);
        
        // Callback por cada archivo subido
        if (callback) {
          callback(fileInfo);
        }
      }

      // Todos los archivos terminaron de subirse
      if (result.event === 'queues-end') {
        if (onAllUploadsComplete) {
          onAllUploadsComplete(uploadedFiles);
        }
      }
    }
  );
  
  cloudinaryWidget.open();
};




