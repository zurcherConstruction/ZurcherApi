/**
 * Middleware de caché en memoria para reducir queries repetitivas
 * 
 * Cachea responses por un tiempo determinado para evitar queries
 * repetitivos en endpoints que no cambian constantemente.
 */

const cache = new Map();

/**
 * Middleware de caché simple
 * @param {number} duration - Duración del caché en segundos
 */
function cacheMiddleware(duration = 30) {
  return (req, res, next) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      const { timestamp, data, status } = cachedResponse;
      const now = Date.now();
      
      // Si el caché no ha expirado
      if (now - timestamp < duration * 1000) {
        return res.status(status).json(data);
      } else {
        // Caché expirado, eliminarlo
        cache.delete(key);
      }
    }

    // Interceptar res.json para guardar en caché
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // Solo cachear respuestas exitosas
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          timestamp: Date.now(),
          data,
          status: res.statusCode,
        });
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidar caché para un patrón específico
 */
function invalidateCache(pattern) {
  let deleted = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      deleted++;
    }
  }
}

/**
 * Limpiar todo el caché
 */
function clearCache() {
  const size = cache.size;
  cache.clear();
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCache,
};
