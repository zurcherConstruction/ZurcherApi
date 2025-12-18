/**
 * 💾 Sistema de Autoguardado Progresivo para Móvil
 * 
 * Características:
 * - Autoguardado cada 30 segundos (datos del formulario)
 * - Detección de conexión con NetInfo
 * - Sincronización no bloqueante
 * - Fallback offline automático
 * - Toast notifications nativas
 */

import axios from './axios';
import { saveFormOffline, clearOfflineData } from './offlineStorageMobile';
import Toast from 'react-native-toast-message';

/**
 * 🔄 Estado global de autoguardado
 */
let autosaveTimer = null;
let lastSavedData = null;
let isSaving = false;

/**
 * 🌐 Verificar conexión (fallback si NetInfo no está disponible)
 */
const isOnline = async () => {
  try {
    // Intentar importar NetInfo dinámicamente
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    return state.isConnected;
  } catch (error) {
    // Si NetInfo no está disponible, asumir online
    console.warn('⚠️ NetInfo no disponible, asumiendo online');
    return true;
  }
};

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

    // Verificar conexión
    const online = await isOnline();
    
    if (!online) {
      // Sin conexión → guardar offline
      await saveFormOffline(visitId, formData);
      if (!silent) {
        Toast.show({
          type: 'info',
          text1: '📡 Sin conexión',
          text2: 'Los cambios se guardarán cuando vuelvas online',
          position: 'bottom',
          visibilityTime: 2000
        });
      }
      lastSavedData = { ...formData };
      return { success: true, offline: true };
    }

    // Guardar en servidor (convertir SI/NO a boolean)
    const response = await axios.put(`/maintenance/${visitId}`, {
      actualVisitDate: formData.actualVisitDate,
      notes: formData.notes,
      
      // Niveles de tanque
      tank_inlet_level: formData.tank_inlet_level,
      tank_inlet_notes: formData.tank_inlet_notes,
      tank_outlet_level: formData.tank_outlet_level,
      tank_outlet_notes: formData.tank_outlet_notes,
      
      // Inspección General (convertir a boolean si es necesario)
      strong_odors: formData.strong_odors === true || formData.strong_odors === 'true' ? true : 
                    formData.strong_odors === false || formData.strong_odors === 'false' ? false : null,
      strong_odors_notes: formData.strong_odors_notes,
      water_level_ok: formData.water_level_ok === true || formData.water_level_ok === 'true' ? true :
                      formData.water_level_ok === false || formData.water_level_ok === 'false' ? false : null,
      water_level_notes: formData.water_level_notes,
      visible_leaks: formData.visible_leaks === true || formData.visible_leaks === 'true' ? true :
                     formData.visible_leaks === false || formData.visible_leaks === 'false' ? false : null,
      visible_leaks_notes: formData.visible_leaks_notes,
      area_around_dry: formData.area_around_dry === true || formData.area_around_dry === 'true' ? true :
                       formData.area_around_dry === false || formData.area_around_dry === 'false' ? false : null,
      area_around_notes: formData.area_around_notes,
      needs_pumping: formData.needs_pumping === true || formData.needs_pumping === 'true' ? true :
                     formData.needs_pumping === false || formData.needs_pumping === 'false' ? false : null,
      needs_pumping_notes: formData.needs_pumping_notes,
      
      // Sistema ATU
      alarm_test: formData.alarm_test === true || formData.alarm_test === 'true' ? true :
                  formData.alarm_test === false || formData.alarm_test === 'false' ? false : null,
      alarm_test_notes: formData.alarm_test_notes,
      blower_working: formData.blower_working === true || formData.blower_working === 'true' ? true :
                      formData.blower_working === false || formData.blower_working === 'false' ? false : null,
      blower_working_notes: formData.blower_working_notes,
      blower_filter_clean: formData.blower_filter_clean === true || formData.blower_filter_clean === 'true' ? true :
                          formData.blower_filter_clean === false || formData.blower_filter_clean === 'false' ? false : null,
      blower_filter_notes: formData.blower_filter_notes,
      diffusers_bubbling: formData.diffusers_bubbling === true || formData.diffusers_bubbling === 'true' ? true :
                         formData.diffusers_bubbling === false || formData.diffusers_bubbling === 'false' ? false : null,
      diffusers_bubbling_notes: formData.diffusers_bubbling_notes,
      clarified_water_outlet: formData.clarified_water_outlet === true || formData.clarified_water_outlet === 'true' ? true :
                             formData.clarified_water_outlet === false || formData.clarified_water_outlet === 'false' ? false : null,
      clarified_water_notes: formData.clarified_water_notes,
      discharge_pump_ok: formData.discharge_pump_ok === true || formData.discharge_pump_ok === 'true' ? true :
                        formData.discharge_pump_ok === false || formData.discharge_pump_ok === 'false' ? false : null,
      discharge_pump_notes: formData.discharge_pump_notes,
      cap_green_inspected: formData.cap_green_inspected === true || formData.cap_green_inspected === 'true' ? true :
                          formData.cap_green_inspected === false || formData.cap_green_inspected === 'false' ? false : null,
      cap_green_notes: formData.cap_green_notes,
      
      // Lift Station
      pump_running: formData.pump_running === true || formData.pump_running === 'true' ? true :
                   formData.pump_running === false || formData.pump_running === 'false' ? false : null,
      pump_running_notes: formData.pump_running_notes,
      float_switches: formData.float_switches === true || formData.float_switches === 'true' ? true :
                     formData.float_switches === false || formData.float_switches === 'false' ? false : null,
      float_switches_notes: formData.float_switches_notes,
      alarm_working: formData.alarm_working === true || formData.alarm_working === 'true' ? true :
                    formData.alarm_working === false || formData.alarm_working === 'false' ? false : null,
      alarm_working_notes: formData.alarm_working_notes,
      pump_condition: formData.pump_condition === true || formData.pump_condition === 'true' ? true :
                     formData.pump_condition === false || formData.pump_condition === 'false' ? false : null,
      pump_condition_notes: formData.pump_condition_notes,
      
      // PBTS
      well_points_quantity: formData.well_points_quantity,
      well_sample_1_observations: formData.well_sample_1_observations,
      well_sample_2_observations: formData.well_sample_2_observations,
      well_sample_3_observations: formData.well_sample_3_observations,
      
      // Acceso Septic
      septic_access_clear: formData.septic_access_clear === true || formData.septic_access_clear === 'true' ? true :
                          formData.septic_access_clear === false || formData.septic_access_clear === 'false' ? false : null,
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
      await saveFormOffline(visitId, formData);
      if (!silent) {
        Toast.show({
          type: 'warning',
          text1: '⚠️ Error al guardar online',
          text2: 'Guardado offline automáticamente',
          position: 'bottom',
          visibilityTime: 3000
        });
      }
      lastSavedData = { ...formData };
      return { success: true, offline: true, fallback: true };
    } catch (offlineError) {
      console.error('❌ Error en fallback offline:', offlineError);
      if (!silent) {
        Toast.show({
          type: 'error',
          text1: '❌ Error al guardar',
          text2: 'No se pudo guardar el progreso',
          position: 'bottom',
          visibilityTime: 5000
        });
      }
      return { success: false, error: error.message };
    }
  } finally {
    isSaving = false;
  }
};

/**
 * ⏰ Iniciar autoguardado periódico
 */
export const startAutosave = (visitId, getFormDataFn, intervalMs = 30000) => {
  console.log('🚀 Autoguardado iniciado (cada 30s)');
  
  autosaveTimer = setInterval(async () => {
    try {
      const formData = getFormDataFn();
      
      if (!formData) {
        console.log('⏸️ No hay datos para guardar');
        return;
      }
      
      const result = await saveProgress(visitId, formData, { silent: true });
      
      // Ya no mostramos Toast - el guardado es silencioso en segundo plano
      if (result.success && !result.offline) {
        console.log('✅ Autoguardado exitoso (silencioso)');
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
 * 💾 Forzar guardado inmediato
 */
export const forceSave = async (visitId, formData) => {
  return await saveProgress(visitId, formData, { silent: false, force: true });
};
