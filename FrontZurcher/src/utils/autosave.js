/**
 * 💾 Sistema de Autoguardado Progresivo
 * 
 * Características:
 * - Autoguardado cada 30 segundos (datos del formulario)
 * - Subida automática de imágenes en background
 * - Sincronización no bloqueante (usuario puede seguir trabajando)
 * - Fallback offline si falla la conexión
 * - Indicadores visuales discretos
 */

import api from './axios';
import { isOnline } from './syncManager';
import { saveFormOffline, clearOfflineData } from './offlineStorage';
import { toast } from 'react-toastify';

/**
 * 🔄 Estado global de autoguardado
 */
let autosaveTimer = null;
let lastSavedData = null;
let isSaving = false;
let pendingImages = new Map(); // { fieldName: File }
let uploadQueue = [];

/**
 * 📝 Guardar progreso del formulario (solo datos, sin imágenes)
 */
export const saveProgress = async (visitId, formData, options = {}) => {
  const { silent = false, force = false } = options;

  // Evitar guardados concurrentes
  if (isSaving && !force) {
    console.log('⏸️ Guardado ya en progreso, omitiendo...');
    return { success: false, reason: 'already_saving' };
  }

  // Verificar si hay cambios reales
  if (!force && JSON.stringify(formData) === JSON.stringify(lastSavedData)) {
    console.log('⏸️ Sin cambios desde último guardado, omitiendo...');
    return { success: false, reason: 'no_changes' };
  }

  try {
    isSaving = true;
    
    if (!silent) {
      console.log('💾 Guardando progreso...');
    }

    // Si no hay conexión, guardar offline
    if (!isOnline()) {
      await saveFormOffline(visitId, formData, {});
      if (!silent) {
        toast.info('💾 Sin conexión - Guardado offline', { autoClose: 2000 });
      }
      lastSavedData = { ...formData };
      return { success: true, offline: true };
    }

    // Guardar en servidor (solo datos, sin archivos)
    const response = await api.put(`/maintenance/${visitId}`, {
      actualVisitDate: formData.actualVisitDate,
      notes: formData.notes,
      
      // Niveles de tanque
      tank_inlet_level: formData.tank_inlet_level,
      tank_inlet_notes: formData.tank_inlet_notes,
      tank_outlet_level: formData.tank_outlet_level,
      tank_outlet_notes: formData.tank_outlet_notes,
      
      // Inspección General (convertir SI/NO a boolean)
      strong_odors: formData.strong_odors === 'SI' ? true : formData.strong_odors === 'NO' ? false : null,
      strong_odors_notes: formData.strong_odors_notes,
      water_level_ok: formData.water_level_ok === 'SI' ? true : formData.water_level_ok === 'NO' ? false : null,
      water_level_notes: formData.water_level_notes,
      visible_leaks: formData.visible_leaks === 'SI' ? true : formData.visible_leaks === 'NO' ? false : null,
      visible_leaks_notes: formData.visible_leaks_notes,
      area_around_dry: formData.area_around_dry === 'SI' ? true : formData.area_around_dry === 'NO' ? false : null,
      area_around_notes: formData.area_around_notes,
      needs_pumping: formData.needs_pumping === 'SI' ? true : formData.needs_pumping === 'NO' ? false : null,
      needs_pumping_notes: formData.needs_pumping_notes,
      
      // Sistema ATU
      alarm_test: formData.alarm_test === 'SI' ? true : formData.alarm_test === 'NO' ? false : null,
      alarm_test_notes: formData.alarm_test_notes,
      pump_running: formData.pump_running === 'SI' ? true : formData.pump_running === 'NO' ? false : null,
      pump_running_notes: formData.pump_running_notes,
      float_switches: formData.float_switches === 'SI' ? true : formData.float_switches === 'NO' ? false : null,
      float_switches_notes: formData.float_switches_notes,
      alarm_working: formData.alarm_working === 'SI' ? true : formData.alarm_working === 'NO' ? false : null,
      alarm_working_notes: formData.alarm_working_notes,
      
      // Sistema PBTS
      air_pump_working: formData.air_pump_working === 'SI' ? true : formData.air_pump_working === 'NO' ? false : null,
      air_pump_notes: formData.air_pump_notes,
      air_lines_clear: formData.air_lines_clear === 'SI' ? true : formData.air_lines_clear === 'NO' ? false : null,
      air_lines_notes: formData.air_lines_notes,
      filter_clean: formData.filter_clean === 'SI' ? true : formData.filter_clean === 'NO' ? false : null,
      filter_notes: formData.filter_notes,
      chlorine_level: formData.chlorine_level,
      chlorine_notes: formData.chlorine_notes,
      
      // Acceso Septic
      septic_access_clear: formData.septic_access_clear === 'SI' ? true : formData.septic_access_clear === 'NO' ? false : null,
      septic_access_notes: formData.septic_access_notes,
      
      // Notas Generales
      general_notes: formData.general_notes
    }, {
      timeout: 30000 // 30 segundos timeout
    });

    lastSavedData = { ...formData };
    
    // 🧹 Limpiar datos offline una vez guardado exitosamente online
    try {
      await clearOfflineData(visitId);
      console.log('🧹 Datos offline limpiados (ya sincronizados)');
    } catch (cleanupError) {
      console.warn('⚠️ Error limpiando datos offline:', cleanupError);
    }
    
    if (!silent) {
      console.log('✅ Progreso guardado en servidor');
    }

    return { success: true, offline: false, data: response.data };
  } catch (error) {
    console.error('❌ Error guardando progreso:', error);
    
    // Fallback: guardar offline si falla
    try {
      await saveFormOffline(visitId, formData, {});
      if (!silent) {
        toast.warning('⚠️ Error al guardar online, guardado offline', { autoClose: 3000 });
      }
      lastSavedData = { ...formData };
      return { success: true, offline: true, fallback: true };
    } catch (offlineError) {
      console.error('❌ Error en fallback offline:', offlineError);
      if (!silent) {
        toast.error('Error al guardar progreso', { autoClose: 5000 });
      }
      return { success: false, error: error.message };
    }
  } finally {
    isSaving = false;
  }
};

/**
 * 📸 Subir imagen individual en background
 */
export const uploadImageInBackground = async (visitId, file, fieldName, options = {}) => {
  const { silent = false, onProgress = null } = options;

  try {
    if (!silent) {
      console.log(`📤 Subiendo imagen: ${file.name} → ${fieldName}`);
    }

    // Si no hay conexión, agregar a cola y guardar offline
    if (!isOnline()) {
      pendingImages.set(`${fieldName}_${file.name}`, { file, fieldName });
      if (!silent) {
        toast.info(`📡 Sin conexión - ${file.name} se subirá después`, { autoClose: 2000 });
      }
      return { success: true, offline: true, queued: true };
    }

    const formData = new FormData();
    formData.append('maintenanceFiles', file);
    formData.append('fileFieldMapping', JSON.stringify({ [file.name]: fieldName }));

    const response = await api.post(`/maintenance/${visitId}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutos por imagen
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (onProgress) {
          onProgress(percentCompleted);
        }
        if (!silent && percentCompleted % 25 === 0) {
          console.log(`📊 ${file.name}: ${percentCompleted}%`);
        }
      }
    });

    if (!silent) {
      console.log(`✅ ${file.name} subida exitosamente`);
    }

    return { success: true, offline: false, data: response.data };
  } catch (error) {
    console.error(`❌ Error subiendo ${file.name}:`, error);
    
    // Agregar a cola para reintentar
    pendingImages.set(`${fieldName}_${file.name}`, { file, fieldName });
    
    if (!silent) {
      toast.warning(`⚠️ ${file.name} se subirá después`, { autoClose: 3000 });
    }

    return { success: false, queued: true, error: error.message };
  }
};

/**
 * 🔄 Iniciar autoguardado automático
 */
export const startAutosave = (visitId, getFormDataFn, intervalMs = 30000) => {
  console.log(`🔄 Autoguardado iniciado (cada ${intervalMs / 1000}s)`);
  
  // Limpiar timer anterior si existe
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
  }

  // Timer de autoguardado
  autosaveTimer = setInterval(async () => {
    try {
      const formData = getFormDataFn();
      const result = await saveProgress(visitId, formData, { silent: true });
      
      if (result.success && !result.offline) {
        // Mostrar icono discreto de "guardado"
        const event = new CustomEvent('autosave-success', { 
          detail: { timestamp: new Date(), offline: result.offline }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error en autoguardado:', error);
    }
  }, intervalMs);

  return () => {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
  };
};

/**
 * 🛑 Detener autoguardado
 */
export const stopAutosave = () => {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
    console.log('🛑 Autoguardado detenido');
  }
};

/**
 * 🔄 Procesar cola de imágenes pendientes
 */
export const processPendingImages = async (visitId) => {
  if (pendingImages.size === 0) {
    return { success: true, count: 0 };
  }

  if (!isOnline()) {
    console.log('📡 Sin conexión - Cola de imágenes en espera');
    return { success: false, reason: 'offline' };
  }

  console.log(`📤 Procesando ${pendingImages.size} imágenes pendientes...`);
  const results = [];
  const toRemove = [];

  for (const [key, { file, fieldName }] of pendingImages.entries()) {
    try {
      const result = await uploadImageInBackground(visitId, file, fieldName, { silent: true });
      if (result.success && !result.queued) {
        toRemove.push(key);
        results.push({ file: file.name, success: true });
      }
    } catch (error) {
      console.error(`Error procesando ${file.name}:`, error);
      results.push({ file: file.name, success: false, error: error.message });
    }
  }

  // Remover imágenes subidas exitosamente
  toRemove.forEach(key => pendingImages.delete(key));

  if (toRemove.length > 0) {
    toast.success(`✅ ${toRemove.length} imagen(es) sincronizada(s)`, { autoClose: 3000 });
  }

  return { success: true, count: toRemove.length, results };
};

/**
 * 📊 Obtener estado del autoguardado
 */
export const getAutosaveStatus = () => {
  return {
    isActive: autosaveTimer !== null,
    isSaving,
    pendingImagesCount: pendingImages.size,
    hasUnsavedChanges: lastSavedData === null
  };
};

export default {
  saveProgress,
  uploadImageInBackground,
  startAutosave,
  stopAutosave,
  processPendingImages,
  getAutosaveStatus
};
