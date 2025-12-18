/**
 * 💾 Sistema de Almacenamiento Offline para Móvil
 * 
 * Usa AsyncStorage en lugar de IndexedDB (más simple y confiable)
 * Compatible con iOS y Android
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const FORM_PREFIX = 'maintenance_form_';
const FILES_PREFIX = 'maintenance_files_';
const QUEUE_PREFIX = 'upload_queue_';

/**
 * 📝 Guardar formulario offline
 */
export const saveFormOffline = async (visitId, formData) => {
  try {
    const data = {
      formData,
      timestamp: Date.now(),
      visitId
    };
    
    await AsyncStorage.setItem(
      `${FORM_PREFIX}${visitId}`,
      JSON.stringify(data)
    );
    
    console.log('💾 Formulario guardado offline:', visitId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error guardando offline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 📂 Obtener formulario offline
 */
export const getOfflineForm = async (visitId) => {
  try {
    const data = await AsyncStorage.getItem(`${FORM_PREFIX}${visitId}`);
    
    if (!data) {
      return null;
    }
    
    const parsed = JSON.parse(data);
    console.log('📂 Formulario offline recuperado:', visitId);
    return parsed;
  } catch (error) {
    console.error('❌ Error recuperando offline:', error);
    return null;
  }
};

/**
 * 🗑️ Limpiar datos offline después de sync exitoso
 */
export const clearOfflineData = async (visitId) => {
  try {
    await AsyncStorage.removeItem(`${FORM_PREFIX}${visitId}`);
    await AsyncStorage.removeItem(`${FILES_PREFIX}${visitId}`);
    console.log('🗑️ Datos offline limpiados:', visitId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error limpiando offline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 📸 Guardar referencias de archivos offline
 */
export const saveFilesOffline = async (visitId, files) => {
  try {
    await AsyncStorage.setItem(
      `${FILES_PREFIX}${visitId}`,
      JSON.stringify({
        files,
        timestamp: Date.now()
      })
    );
    
    console.log('📸 Archivos guardados offline:', files.length);
    return { success: true };
  } catch (error) {
    console.error('❌ Error guardando archivos offline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 📂 Obtener archivos offline
 */
export const getOfflineFiles = async (visitId) => {
  try {
    const data = await AsyncStorage.getItem(`${FILES_PREFIX}${visitId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Error recuperando archivos offline:', error);
    return null;
  }
};

/**
 * 📋 Listar todos los formularios offline pendientes
 */
export const getPendingForms = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const formKeys = keys.filter(key => key.startsWith(FORM_PREFIX));
    
    const forms = await AsyncStorage.multiGet(formKeys);
    
    return forms.map(([key, value]) => {
      const data = JSON.parse(value);
      return {
        visitId: key.replace(FORM_PREFIX, ''),
        ...data
      };
    });
  } catch (error) {
    console.error('❌ Error obteniendo formularios pendientes:', error);
    return [];
  }
};

/**
 * 📊 Estadísticas de almacenamiento
 */
export const getStorageStats = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const formKeys = keys.filter(key => key.startsWith(FORM_PREFIX));
    const fileKeys = keys.filter(key => key.startsWith(FILES_PREFIX));
    const queueKeys = keys.filter(key => key.startsWith(QUEUE_PREFIX));
    
    return {
      totalForms: formKeys.length,
      totalFiles: fileKeys.length,
      totalQueued: queueKeys.length,
      keys: {
        forms: formKeys,
        files: fileKeys,
        queue: queueKeys
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return null;
  }
};

/**
 * 🧹 Limpiar todo el almacenamiento offline
 */
export const clearAllOfflineData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const offlineKeys = keys.filter(key => 
      key.startsWith(FORM_PREFIX) || 
      key.startsWith(FILES_PREFIX) ||
      key.startsWith(QUEUE_PREFIX)
    );
    
    await AsyncStorage.multiRemove(offlineKeys);
    console.log('🧹 Todo el almacenamiento offline limpiado');
    return { success: true, removed: offlineKeys.length };
  } catch (error) {
    console.error('❌ Error limpiando todo:', error);
    return { success: false, error: error.message };
  }
};
