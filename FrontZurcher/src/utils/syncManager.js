/**
 * 🔄 Sistema de Sincronización Automática para Formularios Offline
 * 
 * Detecta conexión a internet y sincroniza automáticamente
 * los formularios guardados en modo offline.
 */

import api from './axios';
import {
  getPendingForms,
  getOfflineFiles,
  updateFormStatus,
  clearOfflineData
} from './offlineStorage';

/**
 * 🌐 Verificar si hay conexión a internet
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * 🔄 Sincronizar un formulario específico con el servidor
 */
export const syncFormToServer = async (visitId, formData, files) => {
  try {
    console.log(`🔄 Sincronizando formulario ${visitId}...`);
    console.log(`📋 FormData completo:`, formData);
    console.log(`📁 Archivos a sincronizar:`, files.length);
    
    // Actualizar estado a "syncing"
    await updateFormStatus(visitId, 'syncing');

    // Crear FormData para enviar
    const submitFormData = new FormData();

    // Agregar datos del formulario
    Object.keys(formData).forEach(key => {
      let value = formData[key];
      
      // Convertir SI/NO a true/false
      if (value === 'SI') {
        value = 'true';
      } else if (value === 'NO') {
        value = 'false';
      }
      
      // Enviar todos los campos, incluso vacíos (para que el backend los procese)
      if (value !== null && value !== undefined) {
        submitFormData.append(key, value);
        console.log(`  ✓ ${key}: ${value}`);
      }
    });

    // Agregar archivos organizados por campo
    const fileFieldMapping = {};
    
    files.forEach(({ fieldName, file }, index) => {
      console.log(`  📎 Archivo ${index + 1}: ${file.name} -> campo: ${fieldName}`);
      
      // ✅ Identificar archivos especiales y enviarlos con el nombre correcto
      if (fieldName === 'system_video_url' || fieldName.includes('video')) {
        submitFormData.append('systemVideo', file);
        console.log(`  🎬 Video del sistema: ${file.name}`);
      } else if (fieldName === 'final_system_image_url' || fieldName.includes('final_system')) {
        submitFormData.append('finalSystemImage', file);
        console.log(`  📸 Imagen final del sistema: ${file.name}`);
      } else if (fieldName === 'well_sample_1_url' || fieldName.includes('sample_1')) {
        submitFormData.append('wellSample1', file);
        console.log(`  🔬 Muestra 1: ${file.name}`);
      } else if (fieldName === 'well_sample_2_url' || fieldName.includes('sample_2')) {
        submitFormData.append('wellSample2', file);
        console.log(`  🔬 Muestra 2: ${file.name}`);
      } else if (fieldName === 'well_sample_3_url' || fieldName.includes('sample_3')) {
        submitFormData.append('wellSample3', file);
        console.log(`  🔬 Muestra 3: ${file.name}`);
      } else {
        // Archivos normales (imágenes de campos de inspección)
        submitFormData.append('maintenanceFiles', file);
        fileFieldMapping[file.name] = fieldName;
        console.log(`  📷 Imagen normal: ${file.name} -> ${fieldName}`);
      }
    });

    console.log(`📸 FileFieldMapping (solo imágenes normales):`, fileFieldMapping);
    submitFormData.append('fileFieldMapping', JSON.stringify(fileFieldMapping));

    // Enviar al servidor
    const response = await api.post(`/maintenance/${visitId}/complete`, submitFormData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000 // 2 minutos de timeout
    });

    console.log('✅ Formulario sincronizado exitosamente:', response.data);

    // Actualizar estado y limpiar datos offline
    await updateFormStatus(visitId, 'synced');
    await clearOfflineData(visitId);

    return {
      success: true,
      message: 'Formulario sincronizado correctamente',
      data: response.data
    };

  } catch (error) {
    console.error(`❌ Error sincronizando formulario ${visitId}:`, error);
    
    // Actualizar estado a error
    await updateFormStatus(visitId, 'error');

    throw {
      success: false,
      message: error.response?.data?.message || error.message,
      error
    };
  }
};

/**
 * 🔄 Sincronizar todos los formularios pendientes
 */
export const syncAllPendingForms = async (onProgress = null) => {
  try {
    console.log('🔄 Iniciando sincronización de formularios pendientes...');

    if (!isOnline()) {
      console.log('⚠️ Sin conexión a internet, sincronización cancelada');
      return {
        success: false,
        message: 'Sin conexión a internet',
        synced: 0,
        failed: 0,
        total: 0
      };
    }

    // Obtener todos los formularios pendientes
    const pendingForms = await getPendingForms();
    
    if (pendingForms.length === 0) {
      console.log('✅ No hay formularios pendientes para sincronizar');
      return {
        success: true,
        message: 'No hay formularios pendientes',
        synced: 0,
        failed: 0,
        total: 0
      };
    }

    console.log(`📋 ${pendingForms.length} formularios pendientes encontrados`);

    let syncedCount = 0;
    let failedCount = 0;
    const results = [];

    // Sincronizar cada formulario
    for (let i = 0; i < pendingForms.length; i++) {
      const form = pendingForms[i];
      
      try {
        // Notificar progreso
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: pendingForms.length,
            visitId: form.visitId,
            status: 'syncing'
          });
        }

        // Obtener archivos asociados
        const files = await getOfflineFiles(form.visitId);

        // Sincronizar con el servidor
        const result = await syncFormToServer(form.visitId, form.formData, files);
        
        syncedCount++;
        results.push({
          visitId: form.visitId,
          success: true,
          message: 'Sincronizado'
        });

        // Notificar éxito
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: pendingForms.length,
            visitId: form.visitId,
            status: 'success'
          });
        }

      } catch (error) {
        console.error(`❌ Error sincronizando ${form.visitId}:`, error);
        failedCount++;
        results.push({
          visitId: form.visitId,
          success: false,
          message: error.message || 'Error desconocido'
        });

        // Notificar error
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: pendingForms.length,
            visitId: form.visitId,
            status: 'error',
            error: error.message
          });
        }
      }

      // Pequeña pausa entre sincronizaciones para no saturar el servidor
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Sincronización completada: ${syncedCount} éxitos, ${failedCount} fallos`);

    return {
      success: failedCount === 0,
      message: `${syncedCount} de ${pendingForms.length} formularios sincronizados`,
      synced: syncedCount,
      failed: failedCount,
      total: pendingForms.length,
      results
    };

  } catch (error) {
    console.error('❌ Error en sincronización masiva:', error);
    return {
      success: false,
      message: error.message,
      synced: 0,
      failed: 0,
      total: 0
    };
  }
};

/**
 * 📡 Listener de cambios en la conexión
 */
let connectionListeners = [];
let isListening = false;

export const onConnectionChange = (callback) => {
  connectionListeners.push(callback);

  // Iniciar listeners la primera vez
  if (!isListening) {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    isListening = true;
    console.log('👂 Listeners de conexión iniciados');
  }

  // Retornar función para remover el listener
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
};

const handleOnline = () => {
  console.log('🌐 Conexión a internet detectada');
  connectionListeners.forEach(callback => callback(true));
  
  // Intentar sincronizar automáticamente después de 2 segundos
  setTimeout(async () => {
    const result = await syncAllPendingForms((progress) => {
      console.log('🔄 Progreso de sincronización automática:', progress);
    });
    
    // Si se sincronizó exitosamente al menos 1 formulario, recargar la página
    if (result.synced > 0) {
      console.log('✅ Sincronización completada, recargando página...');
      // Esperar 1 segundo para que el usuario vea el mensaje de éxito
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, 2000);
};

const handleOffline = () => {
  console.log('📡 Sin conexión a internet');
  connectionListeners.forEach(callback => callback(false));
};

/**
 * 🧪 Verificar conectividad real con el servidor
 * (navigator.onLine puede dar falsos positivos)
 */
export const checkServerConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    console.warn('⚠️ No se pudo conectar al servidor:', error.message);
    return false;
  }
};

/**
 * 🔄 Auto-sincronización periódica (cada 5 minutos si hay conexión)
 */
let autoSyncInterval = null;

export const startAutoSync = (intervalMinutes = 5) => {
  if (autoSyncInterval) {
    console.log('⚠️ Auto-sincronización ya está activa');
    return;
  }

  console.log(`🔄 Iniciando auto-sincronización cada ${intervalMinutes} minutos`);

  autoSyncInterval = setInterval(async () => {
    if (isOnline()) {
      const hasConnection = await checkServerConnection();
      if (hasConnection) {
        console.log('🔄 Ejecutando sincronización automática...');
        await syncAllPendingForms();
      }
    }
  }, intervalMinutes * 60 * 1000);
};

export const stopAutoSync = () => {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    console.log('🛑 Auto-sincronización detenida');
  }
};

export default {
  isOnline,
  syncFormToServer,
  syncAllPendingForms,
  onConnectionChange,
  checkServerConnection,
  startAutoSync,
  stopAutoSync
};
