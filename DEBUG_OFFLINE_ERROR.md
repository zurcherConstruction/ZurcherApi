## 🔍 Cómo Ver el Error del Sistema Offline

### El error está en el NAVEGADOR, no en el backend

El sistema offline funciona **100% en el cliente** (navegador), por eso:

❌ **NO verás nada en la consola del backend** (npm run dev de BackZurcher)
✅ **SÍ verás todo en la consola del navegador** (DevTools)

---

## 📱 Cómo Ver los Logs en el Navegador

### Opción 1: Console Tab (LOGS DETALLADOS)

```
1. Presiona F12 en el navegador
2. Click en pestaña "Console" (no Network)
3. Limpia la consola (🚫 icono)
4. Intenta guardar el formulario offline
5. Verás logs como:

💾 Guardando formulario offline para visita fc53c8e6...
📋 Datos a guardar: { visitId: '...', formDataKeys: 15, filesKeys: 0 }
✅ Datos del formulario guardados
❌ Error guardando formulario offline: [AQUÍ ESTÁ EL ERROR]
```

### Opción 2: Application Tab (VER INDEXEDDB)

```
1. F12 → Application tab
2. Storage → IndexedDB → ZurcherMaintenanceDB
3. Ver si se crearon las tablas:
   - maintenance_forms
   - maintenance_files
   - sync_queue
4. Si no existen, hay un problema con initDB()
```

---

## 🐛 Errores Comunes

### Error 1: "visitId es requerido"
**Causa**: El visitId está undefined
**Solución**: Verifica que `useParams()` está retornando el visitId

### Error 2: "QuotaExceededError"
**Causa**: Almacenamiento del navegador lleno
**Solución**: 
- Application → Storage → Clear storage
- O borrar datos de IndexedDB manualmente

### Error 3: "Failed to execute 'transaction' on 'IDBDatabase'"
**Causa**: IndexedDB no se inicializó correctamente
**Solución**: Recargar la página (Ctrl+R)

### Error 4: "The object store could not be found"
**Causa**: Los stores no se crearon en initDB()
**Solución**: Borrar IndexedDB y recargar
- Application → IndexedDB → ZurcherMaintenanceDB → Delete database

---

## 🧪 Test Rápido: Verificar si IndexedDB Funciona

### Copia y pega esto en la Console del navegador:

```javascript
// Test 1: Verificar soporte de IndexedDB
if ('indexedDB' in window) {
  console.log('✅ IndexedDB soportado');
} else {
  console.log('❌ IndexedDB NO soportado');
}

// Test 2: Verificar permisos de storage
navigator.storage.estimate().then(estimate => {
  console.log('📊 Almacenamiento:');
  console.log('  Usado:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
  console.log('  Disponible:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
  console.log('  % Usado:', ((estimate.usage / estimate.quota) * 100).toFixed(1), '%');
});

// Test 3: Intentar abrir la DB
const openRequest = indexedDB.open('ZurcherMaintenanceDB', 1);

openRequest.onsuccess = () => {
  console.log('✅ Base de datos abierta correctamente');
  const db = openRequest.result;
  console.log('Stores disponibles:', Array.from(db.objectStoreNames));
  db.close();
};

openRequest.onerror = () => {
  console.error('❌ Error abriendo base de datos:', openRequest.error);
};

openRequest.onblocked = () => {
  console.warn('⚠️ Base de datos bloqueada. Cierra otras pestañas.');
};
```

---

## 📸 Capturas que Necesito Ver

Para ayudarte mejor, necesito ver **3 capturas** de la **Console del navegador**:

### 1. Console Tab - ANTES de guardar
```
Debe mostrar que la página cargó correctamente
```

### 2. Console Tab - DESPUÉS de clic en "Guardar Progreso"
```
Aquí verás el error completo con stack trace
```

### 3. Application Tab - IndexedDB
```
Application → Storage → IndexedDB → ZurcherMaintenanceDB
Mostrar si existen los stores (maintenance_forms, etc.)
```

---

## 🎯 Pasos para Debugging

### Paso 1: Limpiar Todo
```
1. F12 → Application → Storage → Clear site data
2. Recargar página (Ctrl+R)
3. Login nuevamente
4. Ir a visita de mantenimiento
```

### Paso 2: Activar Preserve Log
```
1. F12 → Console
2. ✅ Marcar "Preserve log" (para que no se borren logs)
3. Intentar guardar offline
4. Copiar TODOS los logs de la consola
```

### Paso 3: Ver Error Completo
```
1. Si hay error rojo en Console
2. Hacer clic en la flecha ▶ para expandirlo
3. Ver el "stack trace" completo
4. Compartir eso
```

---

## 💡 Mientras Tanto...

Si no puedes ver los logs, prueba este **modo de debugging manual**:

### Agrega esto TEMPORALMENTE al código:

En `WorkerMaintenanceDetail.jsx`, dentro de la función `handleSubmit`, justo antes de llamar `saveFormOffline`:

```javascript
// 🐛 DEBUG TEMPORAL
console.log('='.repeat(50));
console.log('🔍 DEBUG - Iniciando guardado offline');
console.log('='.repeat(50));
console.log('Visit ID:', visitId);
console.log('Visit ID type:', typeof visitId);
console.log('Visit ID length:', visitId?.length);
console.log('FormData:', formData);
console.log('FormData keys:', Object.keys(formData));
console.log('FieldImages:', fieldImages);
console.log('FieldImages keys:', Object.keys(fieldImages));
console.log('IsOnline:', navigator.onLine);
console.log('='.repeat(50));

try {
  const result = await saveFormOffline(visitId, formData, filesToSave);
  console.log('✅ ÉXITO:', result);
} catch (error) {
  console.error('❌ ERROR CAPTURADO:');
  console.error('  Name:', error.name);
  console.error('  Message:', error.message);
  console.error('  Stack:', error.stack);
  console.error('  Error completo:', error);
  throw error;
}
```

---

## ⚡ Solución Rápida (Si Todo Falla)

Si no podemos hacer que IndexedDB funcione, hay un **Plan B más simple**:

### Usar localStorage en vez de IndexedDB

```javascript
// Más simple, sin compresión, pero funciona siempre
localStorage.setItem('offline_' + visitId, JSON.stringify({
  formData,
  timestamp: Date.now()
}));
```

**Ventajas**: Más simple, siempre funciona
**Desventajas**: 
- Límite de 5-10MB (vs 50-100MB de IndexedDB)
- No puede almacenar archivos grandes
- Sin compresión de imágenes

---

## 🚨 NECESITO VER

Por favor comparte una captura de la **Console del navegador** mostrando:
- Los logs que aparecen
- El error en rojo (si hay)
- Expandido con el stack trace completo

Esto me dirá exactamente qué está fallando! 🔍
