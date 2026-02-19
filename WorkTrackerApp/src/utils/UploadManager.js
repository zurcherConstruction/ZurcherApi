/**
 * 🔄 UPLOAD MANAGER INTELIGENTE
 * Manejo de uploads con retry automático y prevención de duplicados
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

export class UploadManager {
  
  constructor() {
    this.pendingUploads = new Map(); // Prevenir duplicados
    this.uploadHistory = new Set(); // Historial de uploads exitosos
    this.maxRetries = 3;
    this.baseDelay = 2000; // 2 segundos base para retry
  }

  /**
   * 📤 UPLOAD INTELIGENTE CON RETRY
   */
  async uploadWithRetry(uploadConfig) {
    const {
      url,
      formData,
      headers = {},
      fileKey, // Clave única para identificar el archivo
      onProgress,
      onError,
      onSuccess,
      retryAttempts = 0
    } = uploadConfig;

    // 🔍 Verificar si ya está en progreso
    if (this.pendingUploads.has(fileKey)) {
      return { success: false, reason: 'upload_in_progress' };
    }

    // ✅ Verificar si ya se subió exitosamente
    if (this.uploadHistory.has(fileKey)) {
      return { success: true, reason: 'already_uploaded' };
    }

    // 📶 Verificar conexión
    const connectionInfo = await NetInfo.fetch();
    if (!connectionInfo.isConnected) {
      console.log('📡 Sin conexión, guardando para después');
      await this.saveForLater(uploadConfig);
      return { success: false, reason: 'no_connection' };
    }

    // 🔒 Marcar como en progreso
    this.pendingUploads.set(fileKey, Date.now());

    try {
      console.log(`📤 Upload (intento ${retryAttempts + 1})`);

      // ⚠️ NO establecer Content-Type manualmente con FormData
      // React Native necesita auto-generar el boundary para multipart/form-data
      const { 'Content-Type': _ct, ...safeHeaders } = headers;
      
      const response = await axios.post(url, formData, {
        headers: safeHeaders,
        timeout: 120000, // 2 minutos timeout
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          if (onProgress) onProgress(progress);
        }
      });

      // ✅ Upload exitoso
      this.pendingUploads.delete(fileKey);
      this.uploadHistory.add(fileKey);
      
      console.log(`✅ Upload completado (${retryAttempts + 1} intento${retryAttempts > 0 ? 's' : ''})`);
      if (onSuccess) onSuccess(response.data);
      
      return { 
        success: true, 
        data: response.data,
        attempts: retryAttempts + 1 
      };

    } catch (error) {
      console.error(`❌ Error en upload ${fileKey}:`, error.message);
      
      // 🔓 Liberar el lock
      this.pendingUploads.delete(fileKey);
      
      // 🔄 ¿Deberíamos reintentar?
      const shouldRetry = this.shouldRetry(error, retryAttempts);
      
      if (shouldRetry) {
        const delay = this.calculateRetryDelay(retryAttempts);
        console.log(`🔄 Retry en ${delay}ms (intento ${retryAttempts + 2})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.uploadWithRetry({
          ...uploadConfig,
          retryAttempts: retryAttempts + 1
        });
      }
      
      // ❌ No más reintentos
      console.error(`❌ Upload fallido definitivamente: ${fileKey}`);
      if (onError) onError(error);
      
      return { 
        success: false, 
        error: error.message,
        attempts: retryAttempts + 1 
      };
    }
  }

  /**
   * 🤔 ¿DEBERÍAMOS REINTENTAR?
   */
  shouldRetry(error, currentAttempts) {
    if (currentAttempts >= this.maxRetries) return false;
    
    // Errores de red - sí reintentar
    if (error.code === 'NETWORK_ERROR' || 
        error.code === 'ECONNABORTED' || 
        !error.response) {
      return true;
    }
    
    // Errores del servidor (5xx) - sí reintentar
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    // Error 401 (no autorizado) - posible token expirado
    if (error.response && error.response.status === 401) {
      console.log('⚠️ 401 - token expirado');
      return true; // Intentar una vez más
    }
    
    // Error 408 (timeout) - sí reintentar
    if (error.response && error.response.status === 408) {
      return true;
    }
    
    // Otros errores 4xx - no reintentar
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    
    return true; // Por defecto, reintentar
  }

  /**
   * ⏱️ CALCULAR DELAY PARA RETRY (exponential backoff)
   */
  calculateRetryDelay(attemptNumber) {
    // Exponential backoff: 2s, 4s, 8s
    return this.baseDelay * Math.pow(2, attemptNumber);
  }

  /**
   * 💾 GUARDAR PARA SUBIR DESPUÉS
   */
  async saveForLater(uploadConfig) {
    try {
      const pendingUploads = await AsyncStorage.getItem('pending_uploads') || '[]';
      const uploads = JSON.parse(pendingUploads);
      
      uploads.push({
        ...uploadConfig,
        savedAt: Date.now(),
        id: uploadConfig.fileKey
      });
      
      await AsyncStorage.setItem('pending_uploads', JSON.stringify(uploads));
    } catch (error) {
      console.error('❌ Error guardando upload pendiente:', error);
    }
  }

  /**
   * 🔄 PROCESAR UPLOADS PENDIENTES
   */
  async processPendingUploads() {
    try {
      const pendingUploads = await AsyncStorage.getItem('pending_uploads');
      if (!pendingUploads) return;
      
      const uploads = JSON.parse(pendingUploads);
      if (uploads.length > 0) console.log(`📤 ${uploads.length} uploads pendientes`);
      
      const remainingUploads = [];
      
      for (const upload of uploads) {
        const result = await this.uploadWithRetry(upload);
        
        if (!result.success && result.reason !== 'already_uploaded') {
          remainingUploads.push(upload);
        }
        
        // Pausa entre uploads para no saturar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Actualizar lista de pendientes
      await AsyncStorage.setItem('pending_uploads', JSON.stringify(remainingUploads));
    } catch (error) {
      console.error('❌ Error procesando uploads pendientes:', error);
    }
  }

  /**
   * 🧹 LIMPIAR HISTORIAL ANTIGUO
   */
  async cleanUpHistory() {
    try {
      // Mantener solo uploads de los últimos 7 días
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const pendingUploads = await AsyncStorage.getItem('pending_uploads');
      if (pendingUploads) {
        const uploads = JSON.parse(pendingUploads);
        const recentUploads = uploads.filter(upload => 
          upload.savedAt > oneWeekAgo
        );
        
        await AsyncStorage.setItem('pending_uploads', JSON.stringify(recentUploads));
      }
      
    } catch (error) {
      console.error('❌ Error limpiando historial:', error);
    }
  }

  /**
   * 📊 GENERAR ID ÚNICO PARA ARCHIVO
   */
  static generateFileKey(filePath, additionalData = {}) {
    const fileName = filePath.split('/').pop();
    const timestamp = Date.now();
    const additional = JSON.stringify(additionalData);
    
    // Simple hash para crear ID único
    return `${fileName}_${timestamp}_${this.simpleHash(additional)}`;
  }

  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 🎯 INICIALIZAR MONITOREO DE RED
   */
  initNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('📶 Conexión restaurada, procesando pendientes');
        setTimeout(() => {
          this.processPendingUploads();
        }, 2000);
      }
    });
  }
}

export default UploadManager;