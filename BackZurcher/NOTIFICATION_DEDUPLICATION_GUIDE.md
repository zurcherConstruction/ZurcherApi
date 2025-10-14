# 📧 Guía del Sistema de Deduplicación de Notificaciones

## 🎯 Problema Resuelto

**Antes:** El rol `admin` recibía múltiples correos duplicados para el mismo evento porque:
1. Múltiples llamadas a `sendNotifications` en diferentes partes del código
2. Roles superpuestos (`admin`, `owner`, `finance`)
3. Sin control de envíos recientes
4. Posibles alias de correo corporativo

**Ahora:** Sistema de deduplicación que previene envíos duplicados en un período de tiempo.

---

## 🛡️ Cómo Funciona

### 1. **Cache en Memoria**
- Mantiene un registro de notificaciones enviadas
- Estructura: `Map<emailHash, Set<timestamps>>`
- Hash único: `email|status|entityId`

### 2. **Cooldown Period**
- **Tiempo:** 1 minuto (60 segundos)
- Si se intenta enviar la misma notificación al mismo email dentro de 1 minuto, se bloquea

### 3. **Limpieza Automática**
- Cada 5 minutos limpia registros antiguos
- Libera memoria automáticamente

---

## 📝 Uso en el Código

### **Integración Automática**

El sistema ya está integrado en `notificationManager.js`:

```javascript
const { filterDuplicates, registerSent } = require('./notificationDeduplicator');

// Filtrar duplicados antes de enviar
const filteredStaff = filterDuplicates(staffToNotify, status, entityId);

// Enviar correos...

// Registrar envíos exitosos
registerSent(filteredStaff, status, entityId);
```

### **Ejemplo Práctico**

```javascript
// Primera llamada a las 10:00:00
await sendNotifications('budgetCreated', work, null, io);
// ✅ Envía correo a admin@zurcherseptic.com

// Segunda llamada a las 10:00:15 (15 segundos después)
await sendNotifications('budgetCreated', work, null, io);
// ⏭️ BLOQUEADO - Mismo email, mismo status, mismo work
// Log: "Saltando notificación duplicada: admin@zurcherseptic.com - budgetCreated - 123"

// Tercera llamada a las 10:01:15 (75 segundos después)
await sendNotifications('budgetCreated', work, null, io);
// ✅ Envía correo - Ha pasado más de 1 minuto
```

---

## 🔧 Funciones Disponibles

### `filterDuplicates(staffToNotify, status, entityId)`
Filtra la lista de destinatarios para evitar duplicados recientes.

**Parámetros:**
- `staffToNotify` (Array): Lista de staff a notificar
- `status` (String): Tipo de notificación (ej: 'budgetCreated')
- `entityId` (String): ID de la entidad (ej: work.idWork)

**Retorna:** Array filtrado sin duplicados recientes

### `registerSent(staffToNotify, status, entityId)`
Registra que las notificaciones fueron enviadas.

**Parámetros:**
- `staffToNotify` (Array): Lista de staff notificados
- `status` (String): Tipo de notificación
- `entityId` (String): ID de la entidad

### `getCacheStats()`
Obtiene estadísticas del cache de notificaciones.

**Retorna:**
```javascript
{
  totalHashes: 15,
  entries: [
    {
      hash: "admin@zurcherseptic.com|budgetCreated|123",
      count: 1,
      oldest: 1697299200000,
      newest: 1697299200000
    },
    // ...
  ]
}
```

### `clearCache()`
Limpia todo el cache (útil para testing).

---

## 🧪 Testing

### **Ver Estadísticas del Cache**

En cualquier controller o ruta:

```javascript
const { getCacheStats } = require('../utils/notifications/notificationDeduplicator');

// En un endpoint de debug
app.get('/debug/notification-cache', (req, res) => {
  const stats = getCacheStats();
  res.json(stats);
});
```

### **Limpiar Cache Manualmente**

```javascript
const { clearCache } = require('../utils/notifications/notificationDeduplicator');

// Para testing
clearCache();
```

---

## ⚙️ Configuración

### **Cambiar el Cooldown Period**

En `notificationDeduplicator.js`:

```javascript
// Cambiar de 60 segundos a otro valor
const NOTIFICATION_COOLDOWN = 120000; // 2 minutos
```

### **Cambiar Frecuencia de Limpieza**

```javascript
// Al final del archivo
setInterval(() => {
  // ... código de limpieza
}, 10 * 60 * 1000); // Cambiar a 10 minutos
```

---

## 📊 Logs y Debugging

### **Logs Automáticos**

El sistema genera logs automáticamente:

```
⏭️ Saltando notificación duplicada: admin@zurcherseptic.com - budgetCreated - 123
⏭️ Todas las notificaciones de email para "budgetCreated" (123) fueron filtradas por duplicación
🧹 Limpieza automática: 5 entradas del cache de notificaciones eliminadas
```

### **Monitoreo**

Para ver cuántas notificaciones se están bloqueando:

```bash
# En los logs del servidor
grep "Saltando notificación duplicada" logs.txt | wc -l
```

---

## 🚨 Casos Especiales

### **¿Cuándo NO se deduplica?**

1. **Diferentes entidades:** 
   - Budget #123 vs Budget #456 = NO duplicado
   
2. **Diferentes status:**
   - 'budgetCreated' vs 'budgetSent' = NO duplicado
   
3. **Pasó el cooldown:**
   - Envío 1: 10:00:00
   - Envío 2: 10:01:15 (75 seg después) = NO duplicado

### **Emails con Alias**

Si usas aliases de Google (`admin@zurcherseptic.com` → `yaniz@gmail.com`):
- El sistema solo ve el email en la BD
- Si la BD tiene `admin@zurcherseptic.com`, bloqueará duplicados a ese email
- Google puede redirigir, pero el sistema no enviará duplicados

---

## 📈 Impacto Esperado

### **Antes:**
- Admin recibe 3-5 correos por evento
- 100 eventos/día = 300-500 correos

### **Después:**
- Admin recibe 1 correo por evento
- 100 eventos/día = 100 correos
- **Reducción: 66-80%**

---

## 🔒 Seguridad y Performance

### **Uso de Memoria**
- Cada entrada: ~200 bytes
- 1000 notificaciones en cache: ~200 KB
- Limpieza automática cada 5 minutos
- **Impacto:** Insignificante

### **Performance**
- Filtrado: O(n) - lineal con número de destinatarios
- Lookup en Map: O(1) - constante
- **Impacto:** < 1ms por notificación

---

## 🐛 Troubleshooting

### **Problema: No recibo notificaciones**

1. Verificar que pasó el cooldown (1 minuto)
2. Revisar logs: `grep "Saltando notificación" logs.txt`
3. Limpiar cache manualmente en desarrollo

### **Problema: Aún recibo duplicados**

1. Verificar que hay múltiples usuarios con el mismo rol
2. Revisar que no hay llamadas a `sendEmail` directamente (sin pasar por `notificationManager`)
3. Verificar aliases de correo en la BD

### **Problema: Cache crece demasiado**

1. Verificar que la limpieza automática está activa
2. Revisar `getCacheStats()` para ver tamaño
3. Reducir `NOTIFICATION_COOLDOWN` si es necesario

---

## 📚 Archivos Relacionados

- **Deduplicator:** `src/utils/notifications/notificationDeduplicator.js`
- **Manager:** `src/utils/notifications/notificationManager.js`
- **Service:** `src/utils/notifications/notificationService.js`
- **Stripe Webhook:** `src/controllers/stripeWebhookController.js`

---

## ✅ Checklist de Implementación

- [x] Crear `notificationDeduplicator.js`
- [x] Integrar en `notificationManager.js`
- [x] Integrar en `stripeWebhookController.js`
- [x] Documentar sistema
- [ ] Probar en producción
- [ ] Monitorear reducción de correos
- [ ] Ajustar cooldown si es necesario

---

## 🎓 Próximos Pasos

1. **Desplegar el cambio** en producción
2. **Monitorear logs** para ver duplicados bloqueados
3. **Solicitar feedback** del admin sobre cantidad de correos
4. **Ajustar cooldown** si 1 minuto es muy corto/largo
5. **Considerar** agregar un panel de control para ver estadísticas

---

**Autor:** Sistema de Notificaciones  
**Fecha:** Octubre 2025  
**Versión:** 1.0
