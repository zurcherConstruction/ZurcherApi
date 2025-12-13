# 🧪 Prueba Completa del Sistema Offline

## ✅ Estado Actual
**El guardado offline funciona correctamente** - TransactionInactiveError resuelto

---

## 📝 Pasos para Prueba Completa

### **Paso 1: Guardar con Imágenes (Offline)**

1. **Asegúrate de estar offline**
   - DevTools → Network tab → **Offline** ✅

2. **Ir al formulario de mantenimiento**
   ```
   http://localhost:5173/worker/maintenance/487d39d6-267a-42e3-a437-a14fe7a54da8
   ```

3. **Llenar el formulario:**
   - Cambiar algún campo (ej: `Nivel de entrada del tanque` → "75%")
   - **Agregar 2-3 imágenes** en diferentes campos:
     * `tank_inlet_image` (Imagen tanque entrada)
     * `blower_filter_image` (Imagen filtro soplador)
     * `final_system_image` (Imagen final del sistema)

4. **Guardar:**
   - Clic en **"Guardar Progreso"**
   - Deberías ver: ✅ **"Formulario guardado offline correctamente"**

5. **Verificar en consola:**
   ```
   🗜️ Fase 1: Comprimiendo imágenes...
   🗜️ Imagen comprimida: tank_inlet_image_...
   🗜️ Imagen comprimida: blower_filter_image_...
   🗜️ Imagen comprimida: final_system_image_...
   ✅ Guardado exitoso: 3 archivos guardados
   ```

---

### **Paso 2: Verificar IndexedDB**

1. **Abrir DevTools → Application tab**

2. **IndexedDB → ZurcherMaintenanceDB**

3. **Verificar 3 tablas:**

   **a) maintenance_forms:**
   - Debe tener 1 registro con visitId `487d39d6-267a-42e3-a437-a14fe7a54da8`
   - status = `'pending'`
   - formData con todos los campos

   **b) maintenance_files:**
   - Debe tener 3 registros (3 imágenes)
   - Cada uno con:
     * visitId válido
     * fieldName (nombre del campo)
     * fileName (nombre original)
     * fileData (ArrayBuffer con datos comprimidos)
     * fileSize (tamaño en bytes, debería ser ~70-80% del original)

   **c) sync_queue:**
   - Debe tener 1 registro
   - visitId `487d39d6-267a-42e3-a437-a14fe7a54da8`
   - status = `'pending'`
   - attempts = 0

---

### **Paso 3: Verificar Badge "Datos Offline"**

1. En el formulario, arriba del título debe aparecer:
   ```
   🟣 Datos Offline
   ```

2. En la barra superior (ConnectionStatus):
   ```
   🔴 Sin conexión
   📦 1 formulario pendiente
   ```

---

### **Paso 4: Sincronizar (Volver Online)**

1. **DevTools → Network tab → Online** ✅

2. **Esperar 2 segundos** (auto-sincronización)
   - O hacer clic en **"Sincronizar ahora"**

3. **Verificar en consola:**
   ```
   🔄 Sincronizando formulario 487d39d6-267a-42e3-a437-a14fe7a54da8...
   ✅ Formulario sincronizado correctamente
   🧹 Datos offline eliminados para 487d39d6-267a-42e3-a437-a14fe7a54da8
   ```

4. **Verificar en backend console:**
   ```
   PUT /maintenance/487d39d6-267a-42e3-a437-a14fe7a54da8/complete
   ✅ Maintenance updated successfully
   ```

5. **Verificar IndexedDB vacío:**
   - `maintenance_forms` → 0 registros
   - `maintenance_files` → 0 registros
   - `sync_queue` → 0 registros

6. **Badge desaparece:**
   - Ya no debe aparecer "🟣 Datos Offline"

---

## 🔍 Verificación de Compresión

**Antes de comprimir:**
```
Original: 2.5MB
```

**Después de comprimir:**
```
Comprimida: ~0.5-0.8MB (70-80% reducción)
```

**En consola verás:**
```
🗜️ Imagen comprimida: tank_inlet_image_1234567890.jpg
   Original: 2.50MB
   Comprimida: 0.65MB
   Reducción: 74.0%
```

---

## 🎯 Escenarios Adicionales a Probar

### **A) Múltiples Formularios Offline**

1. Estar offline
2. Completar **3 mantenimientos diferentes**
3. Cada uno con 2-3 imágenes
4. Verificar que aparezcan:
   ```
   📦 3 formularios pendientes
   ```
5. Sincronizar todos a la vez
6. Verificar progreso:
   ```
   Sincronizando 1/3...
   Sincronizando 2/3...
   Sincronizando 3/3...
   ✅ Todos sincronizados
   ```

### **B) Reconexión Automática**

1. Guardar offline
2. Dejar la página abierta
3. Volver online
4. **Esperar 5 minutos** (auto-sync)
5. Verificar que sincronice automáticamente sin intervención

### **C) Error de Sincronización**

1. Guardar offline
2. Apagar el servidor backend (`Ctrl+C` en terminal BackZurcher)
3. Intentar sincronizar
4. Verificar mensaje de error:
   ```
   ❌ Error al sincronizar: No se pudo conectar con el servidor
   ```
5. Verificar que el formulario **permanece en IndexedDB** (no se pierde)
6. Reactivar servidor
7. Sincronizar de nuevo
8. Verificar éxito

### **D) Restaurar Formulario**

1. Guardar formulario offline con datos parciales
2. **Cerrar pestaña del navegador**
3. Volver a abrir el formulario
4. Verificar mensaje:
   ```
   📦 Tienes datos guardados offline para esta visita
   ¿Deseas cargarlos?
   [Cargar Datos] [Descartar]
   ```
5. Clic en **"Cargar Datos"**
6. Verificar que todos los campos se restauran correctamente

---

## 🚨 Errores Comunes y Soluciones

### **Error: QuotaExceededError**
```
💡 Solución: Sincronizar formularios pendientes para liberar espacio
```

### **Error: TransactionInactiveError**
```
✅ YA RESUELTO - Si ves este error, recarga la página (Ctrl+R)
```

### **Error: visitId undefined**
```
💡 Verifica que estás en la URL correcta del formulario
```

### **Backend no responde**
```
💡 Verifica:
1. Terminal BackZurcher → npm run dev (puerto 3001)
2. No hay errores en consola del backend
3. Endpoint existe: POST /maintenance/:visitId/complete
```

---

## 📊 Estadísticas de Almacenamiento

**Para ver el uso del almacenamiento:**

```javascript
// En consola del navegador:
const stats = await window.offlineStorage.getStorageStats();
console.log(stats);
```

**Resultado esperado:**
```javascript
{
  formsCount: 1,
  filesCount: 3,
  totalFilesSize: 2500000, // ~2.5MB
  pendingCount: 1,
  storageUsed: "2.5 MB"
}
```

---

## ✅ Lista de Verificación Final

- [ ] Formulario guarda offline sin errores
- [ ] Imágenes se comprimen correctamente (70-80% reducción)
- [ ] IndexedDB contiene los datos guardados
- [ ] Badge "Datos Offline" aparece
- [ ] ConnectionStatus muestra contador correcto
- [ ] Sincronización manual funciona
- [ ] Auto-sincronización funciona (5 min)
- [ ] Datos se eliminan después de sincronizar
- [ ] Formulario se puede restaurar después de cerrar pestaña
- [ ] Múltiples formularios se pueden guardar y sincronizar
- [ ] Errores de sincronización no pierden datos

---

## 🎉 Resultado Esperado

Si todos los pasos funcionan:

**✅ Sistema offline completamente funcional**
- Workers pueden trabajar sin señal
- Datos se guardan localmente
- Imágenes se comprimen para ahorrar espacio
- Sincronización automática cuando hay conexión
- Datos seguros contra pérdidas

---

## 📝 Notas para Producción

1. **Capacidad:** IndexedDB soporta ~50-100MB (suficiente para 20-30 mantenimientos con imágenes)

2. **Limitaciones:**
   - Solo funciona en HTTPS en producción (o localhost en desarrollo)
   - No funciona en modo incógnito si el usuario desactiva almacenamiento

3. **Recomendaciones:**
   - Sincronizar al final del día
   - No acumular más de 10 formularios sin sincronizar
   - Verificar espacio disponible antes de trabajo de campo

4. **Monitoreo:**
   - Revisar logs de sincronización en backend
   - Alertar si un worker tiene >5 formularios pendientes por >24 horas
