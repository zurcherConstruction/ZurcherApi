/**
 * 💾 Sistema de Almacenamiento Offline para Formularios de Mantenimiento
 * 
 * Permite a los trabajadores completar formularios sin conexión a internet
 * y sincronizar automáticamente cuando la conexión se restablezca.
 * 
 * Características:
 * - IndexedDB para almacenar datos y archivos (imágenes/videos)
 * - Compresión de imágenes antes de guardar
 * - Cola de sincronización automática
 * - Manejo de errores y reintentos
 */

const DB_NAME = 'ZurcherMaintenanceDB';
const DB_VERSION = 1;
const STORES = {
  FORMS: 'maintenance_forms',
  QUEUE: 'sync_queue',
  FILES: 'maintenance_files'
};

/**
 * Inicializar IndexedDB
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Error abriendo IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('✅ IndexedDB inicializado correctamente');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('🔄 Actualizando estructura de IndexedDB...');

      // Store para formularios (datos del form)
      if (!db.objectStoreNames.contains(STORES.FORMS)) {
        const formStore = db.createObjectStore(STORES.FORMS, { keyPath: 'visitId' });
        formStore.createIndex('timestamp', 'timestamp', { unique: false });
        formStore.createIndex('status', 'status', { unique: false });
        console.log('✅ Store de formularios creado');
      }

      // Store para cola de sincronización
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('visitId', 'visitId', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
        console.log('✅ Store de cola creado');
      }

      // Store para archivos (imágenes/videos comprimidos)
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        const fileStore = db.createObjectStore(STORES.FILES, { keyPath: 'id', autoIncrement: true });
        fileStore.createIndex('visitId', 'visitId', { unique: false });
        fileStore.createIndex('fieldName', 'fieldName', { unique: false });
        console.log('✅ Store de archivos creado');
      }
    };
  });
};

/**
 * 🖼️ Comprimir imagen antes de almacenar
 * Reduce el tamaño para optimizar almacenamiento local
 */
const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // Si no es imagen, devolver el archivo original
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir canvas a blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }

            // Crear nuevo File con el blob comprimido
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            const originalSize = (file.size / 1024 / 1024).toFixed(2);
            const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
            const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1);

            console.log(`🗜️ Imagen comprimida: ${originalSize}MB -> ${compressedSize}MB (${reduction}% reducción)`);
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (error) => {
        console.error('❌ Error cargando imagen:', error);
        reject(error);
      };
    };

    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      reject(error);
    };
  });
};

/**
 * 💾 Guardar formulario en IndexedDB (modo offline)
 */
export const saveFormOffline = async (visitId, formData, files = {}) => {
  try {
    // Validaciones iniciales
    if (!visitId) {
      throw new Error('visitId es requerido');
    }
    
    if (!formData || typeof formData !== 'object') {
      throw new Error('formData debe ser un objeto');
    }

    console.log(`💾 Guardando formulario offline para visita ${visitId}...`);
    console.log(`📋 Datos a guardar:`, {
      visitId,
      formDataKeys: Object.keys(formData).length,
      filesKeys: Object.keys(files).length
    });

    const db = await initDB();

    // Guardar datos del formulario
    const formRecord = {
      visitId,
      formData,
      timestamp: Date.now(),
      status: 'pending', // pending, syncing, synced, error
      lastModified: new Date().toISOString()
    };

    const formTransaction = db.transaction([STORES.FORMS], 'readwrite');
    const formStore = formTransaction.objectStore(STORES.FORMS);
    
    // Convertir IDBRequest a Promise
    await new Promise((resolve, reject) => {
      const request = formStore.put(formRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('✅ Datos del formulario guardados');

    // Guardar archivos comprimidos - PRIMERO comprimir todo, LUEGO guardar
    let savedFilesCount = 0;
    const compressedFiles = []; // Array para almacenar archivos ya comprimidos

    // Fase 1: Comprimir todas las imágenes (operaciones async fuera de transacción)
    console.log('🗜️ Fase 1: Comprimiendo imágenes...');
    
    for (const [fieldName, fieldFiles] of Object.entries(files)) {
      if (!fieldFiles || !Array.isArray(fieldFiles) || fieldFiles.length === 0) {
        console.log(`⏭️ Campo ${fieldName}: sin archivos o formato inválido`);
        continue;
      }

      console.log(`📁 Procesando campo ${fieldName}: ${fieldFiles.length} archivos`);

      for (let i = 0; i < fieldFiles.length; i++) {
        const fileObj = fieldFiles[i];
        
        if (!fileObj || typeof fileObj !== 'object') {
          console.warn(`⚠️ Archivo ${i} en ${fieldName} tiene formato inválido`);
          continue;
        }

        if (!fileObj.file || fileObj.isExisting) {
          console.log(`⏭️ Omitiendo archivo ${i} en ${fieldName} (existente o sin file)`);
          continue;
        }

        try {
          console.log(`🖼️ Comprimiendo archivo ${i} en ${fieldName}...`);
          
          const processedFile = await compressImage(fileObj.file);
          const arrayBuffer = await processedFile.arrayBuffer();

          // Crear nombre único para el archivo: fieldName + timestamp + nombre original
          const timestamp = Date.now();
          const originalName = processedFile.name;
          const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
          const uniqueFileName = `${fieldName}_${timestamp}_${i}${fileExtension}`;

          compressedFiles.push({
            visitId,
            fieldName,
            fileName: uniqueFileName, // Nombre único
            originalFileName: originalName, // Nombre original preservado
            fileType: processedFile.type,
            fileData: arrayBuffer,
            originalSize: fileObj.file.size,
            compressedSize: processedFile.size,
            timestamp: timestamp
          });

          console.log(`✅ Archivo ${i} comprimido: ${originalName} -> ${uniqueFileName}`);
        } catch (fileError) {
          console.error(`❌ Error procesando archivo ${i} en ${fieldName}:`, fileError);
          continue;
        }
      }
    }

    // Fase 2: Guardar TODOS los archivos en UNA SOLA transacción
    if (compressedFiles.length > 0) {
      console.log(`💾 Fase 2: Guardando ${compressedFiles.length} archivos en IndexedDB...`);
      
      const fileTransaction = db.transaction([STORES.FILES], 'readwrite');
      const fileStore = fileTransaction.objectStore(STORES.FILES);

      // Guardar todos los archivos usando la misma transacción
      const savePromises = compressedFiles.map(fileRecord => {
        return new Promise((resolve, reject) => {
          const request = fileStore.add(fileRecord);
          request.onsuccess = () => {
            console.log(`✅ Guardado: ${fileRecord.fileName}`);
            resolve(request.result);
          };
          request.onerror = () => {
            console.error(`❌ Error guardando: ${fileRecord.fileName}`, request.error);
            reject(request.error);
          };
        });
      });

      // Esperar que TODOS los archivos se guarden
      await Promise.all(savePromises);
      savedFilesCount = compressedFiles.length;
      
      console.log(`✅ ${savedFilesCount} archivos guardados exitosamente`);
    } else {
      console.log('ℹ️ No hay archivos nuevos para guardar');
    }

    // Agregar a cola de sincronización
    const queueTransaction = db.transaction([STORES.QUEUE], 'readwrite');
    const queueStore = queueTransaction.objectStore(STORES.QUEUE);
    
    const queueItem = {
      visitId,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      maxRetries: 3
    };

    await new Promise((resolve, reject) => {
      const request = queueStore.add(queueItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('✅ Agregado a cola de sincronización');

    return {
      success: true,
      message: 'Formulario guardado offline correctamente',
      savedFiles: savedFilesCount
    };

  } catch (error) {
    console.error('❌ Error guardando formulario offline:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      visitId,
      filesCount: Object.keys(files).length
    });
    
    // Re-lanzar el error para que se maneje arriba
    throw new Error(`Error en saveFormOffline: ${error.message || error.name}`);
  }
};

/**
 * 📤 Recuperar formulario guardado offline
 */
export const getOfflineForm = async (visitId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.FORMS], 'readonly');
    const store = transaction.objectStore(STORES.FORMS);
    
    return new Promise((resolve, reject) => {
      const request = store.get(visitId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error recuperando formulario offline:', error);
    throw error;
  }
};

/**
 * 📤 Recuperar archivos guardados offline para una visita
 */
export const getOfflineFiles = async (visitId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.FILES], 'readonly');
    const store = transaction.objectStore(STORES.FILES);
    const index = store.index('visitId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(visitId);
      
      request.onsuccess = () => {
        // Convertir ArrayBuffers a Files con nombres únicos preservados
        const files = request.result.map(record => {
          // Usar fileName (único) para el mapeo, pero mantener info del campo
          const fileToUpload = new File(
            [record.fileData], 
            record.fileName, // Usar el nombre único
            { type: record.fileType }
          );
          
          return {
            fieldName: record.fieldName,
            file: fileToUpload,
            originalFileName: record.originalFileName || record.fileName
          };
        });
        
        console.log(`📁 Recuperados ${files.length} archivos para visitId ${visitId}`);
        files.forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.file.name} -> campo: ${f.fieldName}`);
        });
        
        resolve(files);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error recuperando archivos offline:', error);
    throw error;
  }
};

/**
 * 📋 Listar todos los formularios pendientes de sincronizar
 */
export const getPendingForms = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.FORMS], 'readonly');
    const store = transaction.objectStore(STORES.FORMS);
    const index = store.index('status');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error listando formularios pendientes:', error);
    return [];
  }
};

/**
 * 🗑️ Eliminar formulario y archivos después de sincronizar
 */
export const clearOfflineData = async (visitId) => {
  try {
    console.log(`🗑️ Limpiando datos offline para visita ${visitId}...`);
    const db = await initDB();

    // Eliminar formulario
    const formTransaction = db.transaction([STORES.FORMS], 'readwrite');
    const formStore = formTransaction.objectStore(STORES.FORMS);
    await formStore.delete(visitId);

    // Eliminar archivos
    const fileTransaction = db.transaction([STORES.FILES], 'readwrite');
    const fileStore = fileTransaction.objectStore(STORES.FILES);
    const fileIndex = fileStore.index('visitId');
    
    const files = await new Promise((resolve) => {
      const request = fileIndex.getAll(visitId);
      request.onsuccess = () => resolve(request.result);
    });

    for (const file of files) {
      await fileStore.delete(file.id);
    }

    // Eliminar de cola
    const queueTransaction = db.transaction([STORES.QUEUE], 'readwrite');
    const queueStore = queueTransaction.objectStore(STORES.QUEUE);
    const queueIndex = queueStore.index('visitId');
    
    const queueItems = await new Promise((resolve) => {
      const request = queueIndex.getAll(visitId);
      request.onsuccess = () => resolve(request.result);
    });

    for (const item of queueItems) {
      await queueStore.delete(item.id);
    }

    console.log('✅ Datos offline eliminados correctamente');
  } catch (error) {
    console.error('❌ Error limpiando datos offline:', error);
  }
};

/**
 * 🔄 Actualizar estado del formulario
 */
export const updateFormStatus = async (visitId, status) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORES.FORMS], 'readwrite');
    const store = transaction.objectStore(STORES.FORMS);
    
    const form = await new Promise((resolve) => {
      const request = store.get(visitId);
      request.onsuccess = () => resolve(request.result);
    });

    if (form) {
      form.status = status;
      form.lastModified = new Date().toISOString();
      await store.put(form);
      console.log(`✅ Estado actualizado: ${visitId} -> ${status}`);
    }
  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
  }
};

/**
 * 📊 Obtener estadísticas de almacenamiento
 */
export const getStorageStats = async () => {
  try {
    const db = await initDB();
    
    // Contar formularios
    const formTransaction = db.transaction([STORES.FORMS], 'readonly');
    const formStore = formTransaction.objectStore(STORES.FORMS);
    const formCount = await new Promise((resolve) => {
      const request = formStore.count();
      request.onsuccess = () => resolve(request.result);
    });

    // Contar archivos y calcular tamaño
    const fileTransaction = db.transaction([STORES.FILES], 'readonly');
    const fileStore = fileTransaction.objectStore(STORES.FILES);
    const files = await new Promise((resolve) => {
      const request = fileStore.getAll();
      request.onsuccess = () => resolve(request.result);
    });

    const totalSize = files.reduce((sum, file) => sum + file.compressedSize, 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

    return {
      formsCount: formCount,
      filesCount: files.length,
      totalSizeMB: parseFloat(totalSizeMB)
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return { formsCount: 0, filesCount: 0, totalSizeMB: 0 };
  }
};

export default {
  saveFormOffline,
  getOfflineForm,
  getOfflineFiles,
  getPendingForms,
  clearOfflineData,
  updateFormStatus,
  getStorageStats
};
