/**
 * 🛡️ NOTIFICATION DEDUPLICATOR
 * Previene el envío de correos duplicados al mismo destinatario en un período corto de tiempo
 */

// Cache temporal de notificaciones enviadas
// Estructura: Map<emailHash, Set<timestamp>>
const sentNotifications = new Map();

// Tiempo mínimo entre notificaciones del mismo tipo al mismo usuario (en milisegundos)
const NOTIFICATION_COOLDOWN = 60000; // 1 minuto

/**
 * Genera un hash único para una notificación
 * @param {string} email - Email del destinatario
 * @param {string} status - Tipo de notificación
 * @param {string} entityId - ID de la entidad relacionada (work, budget, etc.)
 * @returns {string}
 */
function getNotificationHash(email, status, entityId = '') {
  return `${email.toLowerCase().trim()}|${status}|${entityId}`;
}

/**
 * Verifica si una notificación ya fue enviada recientemente
 * @param {string} email - Email del destinatario
 * @param {string} status - Tipo de notificación
 * @param {string} entityId - ID de la entidad relacionada
 * @returns {boolean} - true si ya fue enviada recientemente
 */
function wasRecentlySent(email, status, entityId = '') {
  const hash = getNotificationHash(email, status, entityId);
  
  if (!sentNotifications.has(hash)) {
    return false;
  }
  
  const timestamps = sentNotifications.get(hash);
  const now = Date.now();
  
  // Limpiar timestamps antiguos
  const recentTimestamps = Array.from(timestamps).filter(
    ts => (now - ts) < NOTIFICATION_COOLDOWN
  );
  
  if (recentTimestamps.length === 0) {
    sentNotifications.delete(hash);
    return false;
  }
  
  // Actualizar con solo los timestamps recientes
  sentNotifications.set(hash, new Set(recentTimestamps));
  
  return true;
}

/**
 * Marca una notificación como enviada
 * @param {string} email - Email del destinatario
 * @param {string} status - Tipo de notificación
 * @param {string} entityId - ID de la entidad relacionada
 */
function markAsSent(email, status, entityId = '') {
  const hash = getNotificationHash(email, status, entityId);
  
  if (!sentNotifications.has(hash)) {
    sentNotifications.set(hash, new Set());
  }
  
  sentNotifications.get(hash).add(Date.now());
}

/**
 * Filtra una lista de destinatarios para evitar duplicados
 * @param {Array} staffToNotify - Lista de staff a notificar
 * @param {string} status - Tipo de notificación
 * @param {string} entityId - ID de la entidad relacionada
 * @returns {Array} - Lista filtrada sin duplicados recientes
 */
function filterDuplicates(staffToNotify, status, entityId = '') {
  if (!Array.isArray(staffToNotify)) {
    return [];
  }
  
  return staffToNotify.filter(staff => {
    const email = staff.email || staff;
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return false;
    }
    
    // 🛡️ DEDUPLICACIÓN DESHABILITADA
    // if (wasRecentlySent(email, status, entityId)) {
    //   console.log(`⏭️ Saltando notificación duplicada: ${email} - ${status} - ${entityId}`);
    //   return false;
    // }
    
    return true;
  });
}

/**
 * Registra el envío de notificaciones a una lista de destinatarios
 * @param {Array} staffToNotify - Lista de staff notificados
 * @param {string} status - Tipo de notificación
 * @param {string} entityId - ID de la entidad relacionada
 */
function registerSent(staffToNotify, status, entityId = '') {
  if (!Array.isArray(staffToNotify)) {
    return;
  }
  
  staffToNotify.forEach(staff => {
    const email = staff.email || staff;
    if (email && typeof email === 'string' && email.includes('@')) {
      markAsSent(email, status, entityId);
    }
  });
}

/**
 * Limpia el cache de notificaciones enviadas (útil para testing)
 */
function clearCache() {
  sentNotifications.clear();
  console.log('✨ Cache de notificaciones limpiado');
}

/**
 * Obtiene estadísticas del cache
 * @returns {Object}
 */
function getCacheStats() {
  return {
    totalHashes: sentNotifications.size,
    entries: Array.from(sentNotifications.entries()).map(([hash, timestamps]) => ({
      hash,
      count: timestamps.size,
      oldest: Math.min(...Array.from(timestamps)),
      newest: Math.max(...Array.from(timestamps))
    }))
  };
}

// Limpiar cache automáticamente cada 5 minutos
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [hash, timestamps] of sentNotifications.entries()) {
    const recentTimestamps = Array.from(timestamps).filter(
      ts => (now - ts) < NOTIFICATION_COOLDOWN
    );
    
    if (recentTimestamps.length === 0) {
      sentNotifications.delete(hash);
      cleaned++;
    } else {
      sentNotifications.set(hash, new Set(recentTimestamps));
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Limpieza automática: ${cleaned} entradas del cache de notificaciones eliminadas`);
  }
}, 5 * 60 * 1000); // Cada 5 minutos

module.exports = {
  wasRecentlySent,
  markAsSent,
  filterDuplicates,
  registerSent,
  clearCache,
  getCacheStats
};
