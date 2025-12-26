/**
 * 📸 Sistema de Cola de Subida de Imágenes
 * 
 * Características:
 * - Compresión automática antes de guardar
 * - Cola persistente en AsyncStorage
 * - Procesamiento en background cuando hay conexión
 * - Reintentos automáticos
 * - Limpieza de archivos temporales después de upload
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from './axios';
import Toast from 'react-native-toast-message';

const QUEUE_KEY = 'image_upload_queue';
const MAX_RETRIES = 3;

/**
 * 📸 Agregar imagen a la cola de subida
 */
export const queueImageUpload = async (visitId, imageUri, fieldName) => {
  try {
    console.log('📸 Comprimiendo y agregando a cola:', fieldName);
    
    // Comprimir imagen (1280px ancho, 60% calidad)
    const compressed = await manipulateAsync(
      imageUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.6, format: SaveFormat.JPEG }
    );
    
    const queue = await getQueue();
    
    const queueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      visitId,
      uri: compressed.uri,
      fieldName,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending' // pending, uploading, completed, failed
    };
    
    queue.push(queueItem);
    await saveQueue(queue);
    
    console.log('✅ Imagen agregada a cola:', queueItem.id);
    
    return {
      success: true,
      uri: compressed.uri,
      queueItem
    };
  } catch (error) {
    console.error('❌ Error agregando a cola:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🔄 Procesar cola de subida
 */
export const processQueue = async (onProgress = null) => {
  const queue = await getQueue();
  const pendingItems = queue.filter(item => 
    item.status === 'pending' || 
    (item.status === 'failed' && item.retries < MAX_RETRIES)
  );
  
  if (pendingItems.length === 0) {
    console.log('✅ Cola vacía, nada que procesar');
    return { success: true, processed: 0 };
  }
  
  console.log(`📤 Procesando ${pendingItems.length} imágenes en cola...`);
  
  let processed = 0;
  let failed = 0;
  
  for (const item of pendingItems) {
    try {
      // Actualizar estado
      await updateQueueItemStatus(item.id, 'uploading');
      
      if (onProgress) {
        onProgress({
          current: processed + failed + 1,
          total: pendingItems.length,
          item
        });
      }
      
      // Crear FormData
      const formData = new FormData();
      
      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(item.uri);
      if (!fileInfo.exists) {
        console.warn('⚠️ Archivo no existe, eliminando de cola:', item.uri);
        await removeFromQueue(item.id);
        failed++;
        continue;
      }
      
      formData.append('maintenanceFiles', {
        uri: item.uri,
        type: 'image/jpeg',
        name: `${item.fieldName}_${Date.now()}.jpg`
      });
      formData.append('fieldName', item.fieldName);
      
      // Subir al servidor
      console.log('⬆️ Subiendo imagen:', item.id);
      const response = await axios.post(
        `/maintenance/${item.visitId}/upload-image`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000 // 60 segundos
        }
      );
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Imagen subida exitosamente:', item.id);
        
        // Eliminar de cola
        await removeFromQueue(item.id);
        
        // Eliminar archivo temporal
        try {
          await FileSystem.deleteAsync(item.uri, { idempotent: true });
          console.log('🗑️ Archivo temporal eliminado:', item.uri);
        } catch (deleteError) {
          console.warn('⚠️ No se pudo eliminar archivo temporal:', deleteError);
        }
        
        processed++;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      
      // Incrementar contador de reintentos
      const newRetries = item.retries + 1;
      
      if (newRetries >= MAX_RETRIES) {
        console.error('❌ Máximo de reintentos alcanzado, marcando como fallido');
        await updateQueueItemStatus(item.id, 'failed', newRetries);
        failed++;
      } else {
        console.log(`🔄 Reintentando... (${newRetries}/${MAX_RETRIES})`);
        await updateQueueItemStatus(item.id, 'pending', newRetries);
      }
    }
  }
  
  // 🚫 TOAST ELIMINADO: Causaba problemas de UI fijo
  // El usuario ya ve confirmación con "✓ Foto agregada" al tomar cada foto
  
  if (failed > 0) {
    Toast.show({
      type: 'error',
      text1: '⚠️ Error subiendo imágenes',
      text2: `${failed} imagen(es) fallaron`,
      position: 'bottom',
      visibilityTime: 3000,
      autoHide: true
    });
  }
  
  return {
    success: true,
    processed,
    failed,
    total: pendingItems.length
  };
};

/**
 * 📊 Obtener estado de la cola
 */
export const getQueueStatus = async () => {
  const queue = await getQueue();
  
  const status = {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    uploading: queue.filter(item => item.status === 'uploading').length,
    completed: queue.filter(item => item.status === 'completed').length,
    failed: queue.filter(item => item.status === 'failed').length
  };
  
  return status;
};

/**
 * 🗑️ Limpiar cola completa
 */
export const clearQueue = async () => {
  try {
    const queue = await getQueue();
    
    // Eliminar archivos temporales
    for (const item of queue) {
      try {
        await FileSystem.deleteAsync(item.uri, { idempotent: true });
      } catch (error) {
        console.warn('⚠️ No se pudo eliminar archivo:', item.uri);
      }
    }
    
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('🗑️ Cola limpiada completamente');
    return { success: true, removed: queue.length };
  } catch (error) {
    console.error('❌ Error limpiando cola:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 📋 Obtener cola completa
 */
const getQueue = async () => {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error obteniendo cola:', error);
    return [];
  }
};

/**
 * 💾 Guardar cola
 */
const saveQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('❌ Error guardando cola:', error);
  }
};

/**
 * 🗑️ Eliminar item de la cola
 */
const removeFromQueue = async (itemId) => {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.id !== itemId);
  await saveQueue(filtered);
};

/**
 * 🔄 Actualizar estado de item en la cola
 */
const updateQueueItemStatus = async (itemId, status, retries = null) => {
  const queue = await getQueue();
  const itemIndex = queue.findIndex(item => item.id === itemId);
  
  if (itemIndex !== -1) {
    queue[itemIndex].status = status;
    if (retries !== null) {
      queue[itemIndex].retries = retries;
    }
    await saveQueue(queue);
  }
};

/**
 * 🔄 Subir imagen individual inmediatamente (sin cola)
 */
export const uploadImageImmediate = async (visitId, imageUri, fieldName, onProgress = null) => {
  try {
    console.log('📸 Subiendo imagen inmediatamente:', fieldName);
    
    // Comprimir imagen
    const compressed = await manipulateAsync(
      imageUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.6, format: SaveFormat.JPEG }
    );
    
    // Crear FormData
    const formData = new FormData();
    formData.append('images', {
      uri: compressed.uri,
      type: 'image/jpeg',
      name: `${fieldName}_${Date.now()}.jpg`
    });
    formData.append('fieldName', fieldName);
    
    // Subir
    const response = await axios.post(
      `/maintenance/${visitId}/upload-image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        }
      }
    );
    
    // Eliminar archivo temporal
    try {
      await FileSystem.deleteAsync(compressed.uri, { idempotent: true });
    } catch (error) {
      console.warn('⚠️ No se pudo eliminar archivo temporal');
    }
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
