import { useState, useCallback, useRef } from 'react';

/**
 * Hook personalizado para manejar la carga de datos con retry y error handling
 * @param {Function} loadFn - Función asíncrona que carga los datos
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Estado y funciones de control
 */
export const useDataLoader = (loadFn, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    cacheTimeout = 30000, // 30 segundos por defecto
    onError = null
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const abortControllerRef = useRef(null);

  /**
   * Carga datos con retry automático
   */
  const loadWithRetry = useCallback(async (forceRefresh = false) => {
    // Verificar cache
    const now = Date.now();
    if (
      !forceRefresh &&
      cacheRef.current.data &&
      now - cacheRef.current.timestamp < cacheTimeout
    ) {
      return cacheRef.current.data;
    }

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        const data = await loadFn({ signal: abortControllerRef.current.signal });
        
        // Actualizar cache
        cacheRef.current = {
          data,
          timestamp: Date.now()
        };

        setLoading(false);
        setRetryCount(0);
        return data;

      } catch (err) {
        // Si es cancelación, salir silenciosamente
        if (err.name === 'AbortError') {
          setLoading(false);
          return null;
        }

        attempt++;

        if (attempt > maxRetries) {
          // Último intento falló
          const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
          setError(errorMessage);
          setLoading(false);
          setRetryCount(attempt);
          
          if (onError) {
            onError(err);
          }
          
          throw err;
        }

        // Esperar antes de reintentar (backoff exponencial)
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [loadFn, maxRetries, retryDelay, cacheTimeout, onError]);

  /**
   * Reintenta la carga manualmente
   */
  const retry = useCallback(() => {
    return loadWithRetry(true); // Force refresh
  }, [loadWithRetry]);

  /**
   * Cancela la petición en curso
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  /**
   * Limpia el cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 };
  }, []);

  return {
    loading,
    error,
    retryCount,
    load: loadWithRetry,
    retry,
    cancel,
    clearCache
  };
};

export default useDataLoader;
