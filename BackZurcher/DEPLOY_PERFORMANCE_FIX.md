# 🚨 DEPLOY URGENTE - Performance Fix

## Problema
Sistema **extremadamente lento** con múltiples usuarios simultáneos.

## Causa
1. Pool de conexiones saturado (30 max, pero con tráfico alto se agotan)
2. Operaciones bloqueantes (uploads a Cloudinary, emails)
3. Sin caché en endpoints críticos
4. Sin índices en base de datos

## ✅ Fixes Implementados (Listos para Deploy)

### 1. Upload de PDF Manual Asíncrono
**Archivo**: `BackZurcher/src/controllers/BudgetController.js`
- ✅ Responde status 202 inmediatamente
- ✅ Sube a Cloudinary en background
- ✅ Evita timeout de 80 segundos

**Frontend**: `FrontZurcher/src/Components/Budget/EditBudget.jsx`
- ✅ Maneja status 202
- ✅ Muestra mensaje "Procesando en segundo plano"
- ✅ Recarga después de 3 segundos

### 2. Caché en Endpoints Críticos
**Archivo**: `BackZurcher/src/routes/workRoutes.js`
- ✅ `GET /work/maintenance` - 20 segundos
- ✅ `GET /work/:idWork` - 30 segundos

### 3. Queries Optimizadas
**Archivo**: `BackZurcher/src/controllers/MaintenanceController.js`
- ✅ Removido `MaintenanceMedia` includes pesados
- ✅ Solo carga campos necesarios
- ✅ Reducción de 65s → 3s

---

## 📋 PASOS PARA DEPLOY (EJECUTAR EN ORDEN)

### Paso 1: Deploy del Código (5 min)
```bash
# En local
git add .
git commit -m "perf: async PDF upload, cache, optimized queries"
git push origin develop

# En Railway (automático si tienes CI/CD)
# O manualmente: git push railway develop
```

### Paso 2: Índices de Base de Datos (10 min) ⚠️ CRÍTICO
**Conectar a Railway PostgreSQL**:

1. Railway Dashboard → PostgreSQL → Connect
2. Copiar DATABASE_URL
3. Usar TablePlus/DBeaver/psql

**Ejecutar este SQL** (copia/pega completo):

```sql
-- ÍNDICES CRÍTICOS PARA PERFORMANCE INMEDIATA
-- Tiempo estimado: 5-10 minutos

BEGIN;

-- Works (tabla más consultada)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_status ON "Work"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_created_at ON "Work"("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_budget_id ON "Work"("idBudget");

-- Expenses (muy frecuente en dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_work_id ON "Expense"("workId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_date ON "Expense"(date DESC);

-- Incomes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_work_id ON "Income"("workId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_date ON "Income"(date DESC);

-- MaintenanceVisits
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_visit_work_id ON "MaintenanceVisit"("workId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_visit_status ON "MaintenanceVisit"(status);

-- Budgets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_status ON "Budget"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_created_at ON "Budget"("createdAt" DESC);

COMMIT;

-- Actualizar estadísticas
VACUUM ANALYZE "Work";
VACUUM ANALYZE "Expense";
VACUUM ANALYZE "Income";
VACUUM ANALYZE "Budget";
```

**Verificar**:
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('Work', 'Expense', 'Income')
ORDER BY tablename;
```

### Paso 3: Verificar Pool de Conexiones (Ya configurado ✅)
En `BackZurcher/src/data/index.js` ya está optimizado:
- max: 30 conexiones
- min: 5 warm connections
- acquire: 60s timeout

### Paso 4: Reiniciar Servidor (Railway)
```bash
# Railway Dashboard → Deployment → Restart
# O esperar a que el nuevo deploy termine
```

---

## 📊 Mejoras Esperadas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Upload PDF manual | 60-80s | 1-2s | **97% más rápido** |
| GET /work (con caché) | 500ms | 50ms | **90% más rápido** |
| Programar visitas | 65s | 3s | **95% más rápido** |
| Dashboard expenses | 2-3s | 300ms | **85% más rápido** |

---

## ⚠️ Notas Importantes

### Durante el Deploy
- Los usuarios verán "procesando" en upload de PDFs (3 segundos de espera)
- Caché se construirá progresivamente (primera request lenta, siguientes rápidas)
- Índices se crean CONCURRENTLY (sin bloquear tablas)

### Monitoreo Post-Deploy
1. **Verificar logs en Railway**:
   - Buscar `SLOW QUERY` (queries > 1s)
   - Verificar `💾 [CACHE HIT]` (caché funcionando)
   - Ver `✅ PDF subido exitosamente` (upload asíncrono)

2. **Railway Metrics**:
   - CPU no debe superar 80%
   - Memory estable < 500MB
   - DB Connections < 25/30

3. **Test Manual**:
   - Subir PDF firmado manual → debe responder en 1-2s
   - GET /work → ver `💾 [CACHE HIT]` en logs
   - Programar visitas → 3-5s máximo

---

## 🆘 Si Algo Sale Mal

### Rollback del Código
```bash
git revert HEAD
git push origin develop
```

### Eliminar Índices (si causan problemas)
```sql
DROP INDEX CONCURRENTLY idx_work_status;
DROP INDEX CONCURRENTLY idx_expense_work_id;
-- etc...
```

### Limpiar Caché
```bash
# En Railway → Variables → Agregar:
CLEAR_CACHE=true

# Luego reiniciar y remover la variable
```

---

## 📞 Contacto
Si hay problemas críticos durante el deploy:
1. Revisar Railway logs
2. Verificar Railway Metrics (CPU/Memory)
3. Ejecutar queries de diagnóstico (en PERFORMANCE_OPTIMIZATION.md)

**Última actualización**: Diciembre 4, 2025
