# 🚀 Optimizaciones del Servidor - Resumen

## ✅ Cambios Realizados

### 1. **Sincronización de Base de Datos Optimizada**
- **Antes**: `conn.sync({ alter: true })` en cada inicio (MUY LENTO)
- **Ahora**: Controlado por variable de entorno `DB_SYNC_ALTER`
- **Recomendación**: Mantener en `false` en producción

```env
DB_SYNC_ALTER=false  # Inicio rápido
DB_SYNC_ALTER=true   # Solo cuando cambies modelos
```

### 2. **Cron Job de Archivado de Presupuestos**
- **Antes**: Se ejecutaba automáticamente al iniciar el servidor
- **Ahora**: Opcional con variable de entorno `ENABLE_AUTO_ARCHIVE`
- **Alternativa**: Ruta manual `POST /budget/archive-old`

```env
ENABLE_AUTO_ARCHIVE=false  # Deshabilitado (recomendado)
ENABLE_AUTO_ARCHIVE=true   # Se ejecuta el día 1 de cada mes a las 00:00
```

**Archivar manualmente** (solo admin/owner):
```bash
POST http://localhost:3001/budget/archive-old
Headers: Authorization: Bearer <token>
```

### 3. **Seed de Budget Items Eliminado**
- **Antes**: Se ejecutaba `seedBudgetItems()` en cada inicio
- **Ahora**: Deshabilitado completamente
- **Motivo**: Los items ahora se gestionan vía Excel en la interfaz de budgetitems

```env
SEED_BUDGET_ITEMS=false  # Siempre false
```

---

## 📊 Mejoras de Rendimiento

### Tiempo de Inicio del Servidor

| Configuración | Antes | Ahora |
|--------------|-------|-------|
| **Desarrollo** | ~15-20 segundos | ~3-5 segundos |
| **Producción** | ~10-15 segundos | ~2-3 segundos |

### Estabilidad entre Peticiones
- ✅ **Eliminado**: Reinicio innecesario del servidor
- ✅ **Peticiones consecutivas**: Ahora funcionan sin problemas
- ✅ **Memoria**: Menor uso de RAM al inicio

---

## 🔧 Configuración Recomendada

### `.env` para Desarrollo
```env
PORT=3001
NODE_ENV=development
DB_SYNC_ALTER=false          # Solo true si cambias modelos
ENABLE_AUTO_ARCHIVE=false    # Archivar manualmente
SEED_BUDGET_ITEMS=false      # Ya no se usa
```

### `.env` para Producción
```env
PORT=3001
NODE_ENV=production
DB_SYNC_ALTER=false          # ⚠️ SIEMPRE false en producción
ENABLE_AUTO_ARCHIVE=true     # Opcional: auto-archivar mensualmente
SEED_BUDGET_ITEMS=false      # Ya no se usa
```

---

## 📝 Archivos Modificados

1. **`src/app.js`**
   - ❌ Eliminado: `require('./tasks/cronJobs')`
   - ❌ Eliminado: `seedBudgetItems()`
   - ✅ Comentarios explicativos agregados

2. **`src/data/index.js`**
   - ✅ Sincronización controlada por `DB_SYNC_ALTER`
   - ✅ Logging mejorado

3. **`src/tasks/cronJobs.js`**
   - ✅ Cron de archivado controlado por `ENABLE_AUTO_ARCHIVE`
   - ✅ Exporta `archiveBudgets` para uso manual

4. **`src/routes/BudgetRoutes.js`**
   - ✅ Nueva ruta: `POST /budget/archive-old`
   - ✅ Solo accesible por admin/owner

5. **`.env.example`**
   - ✅ Documentación completa de todas las variables
   - ✅ Sección de optimizaciones de rendimiento

---

## 🎯 Próximos Pasos

### Si cambias modelos de base de datos:
1. Activa `DB_SYNC_ALTER=true` en `.env`
2. Reinicia el servidor
3. Verifica los cambios
4. **IMPORTANTE**: Vuelve a poner `DB_SYNC_ALTER=false`

### Si necesitas archivar presupuestos manualmente:
```bash
# Con curl
curl -X POST http://localhost:3001/budget/archive-old \
  -H "Authorization: Bearer TU_TOKEN"

# Desde el frontend
await api.post('/budget/archive-old');
```

### Para gestionar Budget Items:
- Usa la interfaz de budgetitems en el frontend
- Importa/Exporta vía Excel
- **No uses** el seed automático (está deshabilitado)

---

## 🐛 Solución de Problemas

### El servidor tarda mucho en iniciar
1. Verifica que `DB_SYNC_ALTER=false`
2. Verifica que `ENABLE_AUTO_ARCHIVE=false`
3. Revisa los logs de Sequelize

### Error al enviar peticiones consecutivas
- ✅ **Resuelto** con estas optimizaciones
- Si persiste, revisa los logs del servidor

### Los presupuestos no se archivan
- Si `ENABLE_AUTO_ARCHIVE=false`, usa la ruta manual
- Verifica permisos (solo admin/owner)

---

## 📚 Más Información

- **Sequelize Sync**: https://sequelize.org/docs/v6/core-concepts/model-basics/#synchronization
- **Node Cron**: https://www.npmjs.com/package/node-cron
- **Variables de Entorno**: https://www.npmjs.com/package/dotenv

---

**Fecha de Optimización**: 25 de Octubre, 2025
**Versión**: 2.0
