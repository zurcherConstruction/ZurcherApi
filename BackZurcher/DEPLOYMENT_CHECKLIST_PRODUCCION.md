# ✅ CHECKLIST - DEPLOYMENT A PRODUCCIÓN

## 📋 PRE-REQUISITOS (Verificar antes de empezar)

- [ ] **Pruebas locales completadas exitosamente**
  - [ ] Servidor reiniciado sin crear duplicados
  - [ ] Búsqueda por propertyAddress funciona
  - [ ] Crear/editar Permits funciona
  - [ ] Performance mejorado confirmado

- [ ] **Horario programado**
  - [ ] Deployment en horario de bajo tráfico (2-4 AM recomendado)
  - [ ] O tener ventana de mantenimiento aprobada

- [ ] **Backup disponible**
  - [ ] Backup automático de Railway/Render verificado
  - [ ] O backup manual creado

---

## 🚀 PASO 1: Agregar Variables de Entorno

### En Railway/Render/Panel de Producción:

```env
ENABLE_DB_SYNC=false
```

**Verificar que ya existe:**
```env
DB_SYNC_ALTER=false  ✅ Ya existe
```

- [ ] Variable `ENABLE_DB_SYNC=false` agregada
- [ ] Variable `DB_SYNC_ALTER=false` confirmada
- [ ] Variables guardadas
- [ ] Servidor de producción reiniciado (automáticamente después de cambiar variables)

---

## 🔍 PASO 2: Verificar Estado Actual de Producción

### Desde tu máquina local:

```bash
node check-production-duplicates.js
```

**Anotar resultados:**
- Duplicados encontrados: _______
- Índices totales: _______
- Constraints UNIQUE: _______

- [ ] Script ejecutado
- [ ] Resultados anotados
- [ ] Decisión tomada: 
  - [ ] No hay duplicados → Ir al Paso 4
  - [ ] Hay duplicados → Continuar al Paso 3

---

## 🗑️ PASO 3: Limpiar Duplicados (SOLO SI SE DETECTARON)

### ⚠️ IMPORTANTE: Ejecutar en horario de bajo tráfico

```bash
node clean-production-constraints.js
```

**El script hará:**
1. Esperar 10 segundos (puedes cancelar con Ctrl+C)
2. Eliminar Foreign Keys temporalmente
3. Limpiar constraints duplicadas
4. Recrear Foreign Keys
5. Verificar que todo quedó bien

- [ ] Horario de bajo tráfico confirmado
- [ ] Script ejecutado
- [ ] Proceso completado sin errores
- [ ] Verificación exitosa mostrada

**Tiempo estimado:** 5-10 minutos

---

## ✅ PASO 4: Verificación Post-Deployment

### A. Verificar que no se crearon duplicados nuevos:

```bash
node check-production-duplicates.js
```

**Debe mostrar:** ✅ No hay constraints duplicadas

- [ ] 0 duplicados confirmado
- [ ] Índices: ~8 (optimizado)
- [ ] Constraints UNIQUE: 2

### B. Verificar funcionalidad en producción:

- [ ] Navegar a la app en producción
- [ ] Login funciona
- [ ] Página `/works` carga correctamente
- [ ] Búsqueda por dirección funciona
- [ ] Crear nuevo permit funciona
- [ ] Performance mejorado (carga más rápido)

### C. Monitorear logs del servidor:

- [ ] No hay errores en logs de Railway/Render
- [ ] Aplicación responde normalmente
- [ ] No hay timeouts reportados

---

## 📊 PASO 5: Medición de Resultados

### Antes de la optimización:
- Duplicados: _______ (anotar del Paso 2)
- Tiempo de carga `/works`: _______ segundos
- Índices en Permits: _______

### Después de la optimización:
- Duplicados: 0 ✅
- Tiempo de carga `/works`: _______ segundos
- Índices en Permits: ~8 ✅

**Mejora de performance:** _______%

- [ ] Métricas anotadas
- [ ] Mejora confirmada

---

## 🔄 PASO 6: Monitoreo Post-Deployment (24-48 horas)

### Día 1 (después de deployment):

```bash
node check-production-duplicates.js
```

- [ ] Verificación ejecutada
- [ ] 0 duplicados confirmado
- [ ] Performance estable

### Día 2 (48 horas después):

```bash
node check-production-duplicates.js
```

- [ ] Verificación ejecutada
- [ ] 0 duplicados confirmado
- [ ] No hay reportes de usuarios sobre problemas

---

## 🚨 PLAN DE ROLLBACK (En caso de problemas)

### Si algo falla:

1. **Verificar logs:**
   ```bash
   # En Railway/Render
   Ver logs → Buscar errores relacionados con BD
   ```

2. **Recrear Foreign Keys manualmente:**
   ```bash
   node recreate-fk.js
   ```

3. **Revertir variables de entorno:**
   ```env
   # Solo si es absolutamente necesario
   ENABLE_DB_SYNC=true  # Temporal
   DB_SYNC_ALTER=false  # Mantener
   ```

4. **Contactar soporte si es necesario**

- [ ] Plan de rollback revisado
- [ ] Scripts de emergencia disponibles

---

## 📞 CONTACTOS DE EMERGENCIA

- **Desarrollador responsable:** _______
- **Horario de deployment:** _______
- **Canal de comunicación:** _______

---

## ✅ DEPLOYMENT COMPLETADO

- [ ] Todas las pruebas pasadas
- [ ] Monitoreo de 48h completado
- [ ] Performance mejorado confirmado
- [ ] Sin duplicados confirmado
- [ ] Usuarios sin reportes de problemas

**Firma:** _______________ **Fecha:** ___/___/2025

---

## 📝 NOTAS ADICIONALES

```
(Anotar cualquier observación durante el proceso)





```

---

**Archivos creados para este proceso:**
- ✅ `check-production-duplicates.js` - Verificar duplicados en producción
- ✅ `clean-production-constraints.js` - Limpiar duplicados en producción
- ✅ `recreate-fk.js` - Recrear Foreign Keys en emergencia
- ✅ `PREVENCION_INDICES_DUPLICADOS.md` - Documentación completa

**Última actualización:** 26 de Noviembre, 2025
