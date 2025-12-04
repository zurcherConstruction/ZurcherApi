# 🚀 Guía de Optimización de Rendimiento - Alta Concurrencia

## 📊 Problema Identificado
Cuando hay múltiples usuarios simultáneos, el sistema se vuelve lento. Esto se debe a:

1. **Pool de conexiones limitado** (max: 10 conexiones)
2. **Falta de índices en la base de datos**
3. **Queries pesadas sin optimizar**
4. **Sin caché en frontend**
5. **Sin compresión de respuestas**

---

## 🎯 Soluciones por Prioridad

### ✅ PRIORIDAD 1: Optimizar Pool de Conexiones (Impacto Inmediato)

**Problema:** Con 10 conexiones máximo, si hay 15 usuarios haciendo requests simultáneas, 5 tendrán que esperar.

**Solución:**
```javascript
// BackZurcher/src/data/index.js

pool: {
  max: 30,              // ⬆️ Aumentado de 10 a 30 (Railway soporta hasta 97)
  min: 5,               // ⬆️ Mantener 5 conexiones activas siempre
  acquire: 60000,       // ⬆️ 60 segundos para adquirir conexión (antes 30s)
  idle: 20000,          // ⬆️ 20 segundos antes de liberar conexión inactiva
  evict: 10000,         // 🆕 Revisar cada 10s conexiones para eviction
  maxUses: 1000         // 🆕 Reciclar conexión después de 1000 usos
}
```

**¿Por qué esto funciona?**
- Railway Postgres permite hasta **97 conexiones simultáneas**
- Aumentar a 30 permite manejar ~25 usuarios concurrentes
- `min: 5` mantiene conexiones calientes (no hay cold start)
- `maxUses` previene memory leaks en conexiones viejas

---

### ✅ PRIORIDAD 2: Agregar Compresión HTTP (Impacto Alto)

**Problema:** Responses grandes (como `/work?page=1&limit=50` con 156KB) tardan en transferirse.

**Solución:**
```bash
# Instalar compression
cd BackZurcher
npm install compression
```

```javascript
// BackZurcher/src/app.js
const compression = require('compression');

// Después de express.json() y antes de las rutas
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance entre velocidad y compresión
  threshold: 1024 // Solo comprimir responses > 1KB
}));
```

**Beneficio:** Reduce el tamaño de respuestas hasta 70% (156KB → ~45KB)

---

### ✅ PRIORIDAD 3: Implementar Caché en Queries Pesadas

**Problema:** Queries como `fetchMaintenanceVisitsByWork` se ejecutan cada vez aunque los datos no cambien frecuentemente.

**Solución con Node-Cache:**
```bash
cd BackZurcher
npm install node-cache
```

```javascript
// BackZurcher/src/utils/cache.js
const NodeCache = require('node-cache');

// TTL = 5 minutos para datos que cambian poco
const cache = new NodeCache({ 
  stdTTL: 300,           // 5 minutos por defecto
  checkperiod: 60,       // Limpiar cada minuto
  useClones: false       // Performance: no clonar objetos
});

module.exports = cache;
```

**Ejemplo de uso en MaintenanceController:**
```javascript
// BackZurcher/src/controllers/MaintenanceController.js
const cache = require('../utils/cache');

const fetchMaintenanceVisitsByWork = async (req, res) => {
  try {
    const { workId } = req.params;
    
    // Intentar obtener de caché
    const cacheKey = `maintenance_${workId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log(`✅ Cache HIT para ${cacheKey}`);
      return res.status(200).json(cached);
    }
    
    console.log(`❌ Cache MISS para ${cacheKey}`);
    
    // Query normal...
    const visits = await MaintenanceVisit.findAll({...});
    
    // Guardar en caché
    cache.set(cacheKey, visits);
    
    res.status(200).json(visits);
  } catch (error) {
    // ...
  }
};

// Invalidar caché al actualizar
const updateMaintenanceVisit = async (req, res) => {
  try {
    // ...actualizar visita...
    
    // Invalidar caché
    const cacheKey = `maintenance_${visit.workId}`;
    cache.del(cacheKey);
    console.log(`🗑️ Cache invalidado para ${cacheKey}`);
    
    // ...
  }
};
```

---

### ✅ PRIORIDAD 4: Índices en Base de Datos

**Problema:** Queries lentas por falta de índices en columnas frecuentemente buscadas.

**Queries a optimizar:**
```sql
-- Ver queries lentas
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

**Índices recomendados:**
```sql
-- MaintenanceVisit (búsquedas por workId y status)
CREATE INDEX CONCURRENTLY idx_maintenance_visit_work_id ON "MaintenanceVisits" ("workId");
CREATE INDEX CONCURRENTLY idx_maintenance_visit_status ON "MaintenanceVisits" ("status");
CREATE INDEX CONCURRENTLY idx_maintenance_visit_work_status ON "MaintenanceVisits" ("workId", "status");

-- Work (búsquedas frecuentes)
CREATE INDEX CONCURRENTLY idx_work_state ON "Works" ("state");
CREATE INDEX CONCURRENTLY idx_work_created_at ON "Works" ("createdAt" DESC);
CREATE INDEX CONCURRENTLY idx_work_staff_state ON "Works" ("staffId", "state");

-- Expense/Income (dashboard performance)
CREATE INDEX CONCURRENTLY idx_expense_work_date ON "Expenses" ("workId", "date" DESC);
CREATE INDEX CONCURRENTLY idx_income_work_date ON "Incomes" ("workId", "date" DESC);
CREATE INDEX CONCURRENTLY idx_expense_staff_date ON "Expenses" ("staffId", "date" DESC);

-- BankTransaction
CREATE INDEX CONCURRENTLY idx_bank_transaction_date ON "BankTransactions" ("date" DESC);
CREATE INDEX CONCURRENTLY idx_bank_transaction_account_date ON "BankTransactions" ("bankAccountId", "date" DESC);

-- Budget (búsquedas por cliente y estado)
CREATE INDEX CONCURRENTLY idx_budget_client_name ON "Budgets" ("clientName");
CREATE INDEX CONCURRENTLY idx_budget_status ON "Budgets" ("status");
CREATE INDEX CONCURRENTLY idx_budget_created_at ON "Budgets" ("createdAt" DESC);
```

**Cómo ejecutar:**
```bash
# Crear script
node BackZurcher/create-performance-indexes.js
```

---

### ✅ PRIORIDAD 5: Paginación y Lazy Loading en Frontend

**Problema:** Cargar 50 works con todos sus includes es pesado.

**Solución en Redux:**
```javascript
// FrontZurcher/src/Redux/Actions/workActions.jsx

// Cargar solo lo esencial primero
export const fetchWorks = (page = 1, limit = 20) => async (dispatch) => {
  dispatch(fetchWorksRequest());
  try {
    // Solo cargar campos básicos, sin includes pesados
    const response = await api.get('/work', {
      params: { 
        page, 
        limit,
        minimal: true  // 🆕 Flag para indicar response minimalista
      }
    });
    dispatch(fetchWorksSuccess(response.data));
  } catch (error) {
    dispatch(fetchWorksFailure(error.message));
  }
};

// Cargar detalles solo cuando se necesiten
export const fetchWorkDetails = (workId) => async (dispatch) => {
  // Cargar con todos los includes solo para UN work
  const response = await api.get(`/work/${workId}/full`);
  dispatch(updateWorkInStore(response.data));
};
```

**Backend:**
```javascript
// BackZurcher/src/controllers/workController.js

const getAllWorks = async (req, res) => {
  try {
    const { page = 1, limit = 20, minimal } = req.query;
    
    const includeOptions = minimal === 'true' 
      ? [] // Sin includes, solo campos del Work
      : [
          { model: Staff, attributes: ['id', 'name'] },
          { model: Budget, as: 'budget', attributes: ['id', 'budgetNumber'] }
        ]; // Includes básicos, sin mediaFiles ni history
    
    const works = await Work.findAndCountAll({
      include: includeOptions,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

### ✅ PRIORIDAD 6: Throttle y Debounce en Frontend

**Problema:** Usuarios haciendo múltiples clicks mientras esperan.

**Solución:**
```bash
cd FrontZurcher
npm install lodash.debounce lodash.throttle
```

```javascript
// FrontZurcher/src/Components/Maintenance/MaintenanceDetail.jsx
import { debounce } from 'lodash';

// Evitar múltiples clicks en botón de programar
const handleScheduleVisits = debounce(async () => {
  // ...lógica existente...
}, 1000, { leading: true, trailing: false });
// leading: true = ejecutar inmediatamente en el primer click
// trailing: false = ignorar clicks subsecuentes dentro del delay
```

---

## 📈 Métricas Esperadas

### Antes:
- **GET /work?page=1&limit=50**: ~300ms (10 usuarios) → ~8000ms (50 usuarios)
- **POST /maintenance/.../schedule**: 65 segundos
- **GET /maintenance/.../**: ~200ms (baja carga) → timeout (alta carga)

### Después:
- **GET /work?page=1&limit=20&minimal=true**: ~50ms (10 usuarios) → ~400ms (50 usuarios)
- **POST /maintenance/.../schedule**: ~2 segundos (con índices y sin mediaFiles)
- **GET /maintenance/.../**: ~80ms (con caché) → ~200ms (sin caché, alta carga)

---

## 🚀 Plan de Implementación

### Fase 1: Quick Wins (1 hora)
1. ✅ Ajustar pool de conexiones (editar `data/index.js`)
2. ✅ Agregar compresión (instalar + 3 líneas en `app.js`)
3. ✅ Commit y deploy

### Fase 2: Caché (2 horas)
1. ✅ Instalar node-cache
2. ✅ Implementar en MaintenanceController
3. ✅ Implementar en WorkController para `/work?minimal=true`
4. ✅ Testing y deploy

### Fase 3: Índices (30 minutos)
1. ✅ Crear script de índices
2. ✅ Ejecutar en producción (CONCURRENTLY = sin downtime)
3. ✅ Verificar con `EXPLAIN ANALYZE`

### Fase 4: Frontend (3 horas)
1. ✅ Implementar paginación inteligente
2. ✅ Agregar debounce a botones críticos
3. ✅ Lazy loading de detalles pesados
4. ✅ Testing y deploy

---

## 🔍 Monitoreo Post-Deploy

```javascript
// BackZurcher/src/middleware/performance.js
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log requests lentas
    if (duration > 1000) {
      console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};

module.exports = performanceMonitor;
```

```javascript
// app.js
const performanceMonitor = require('./middleware/performance');
app.use(performanceMonitor);
```

---

## 💡 Optimizaciones Adicionales (Opcional)

### Redis para Caché Distribuido
Si planeas escalar a múltiples instancias de servidor:
```bash
npm install redis
```

### Rate Limiting
Prevenir abuso y DDoS:
```bash
npm install express-rate-limit
```

### Query Optimization
Usar `attributes: ['col1', 'col2']` en vez de `SELECT *`:
```javascript
Work.findAll({
  attributes: ['id', 'propertyAddress', 'state', 'createdAt'], // Solo lo necesario
  // ...
});
```

---

## ✅ Checklist de Implementación

- [ ] Aumentar pool de conexiones a 30
- [ ] Instalar y configurar compression
- [ ] Instalar y configurar node-cache
- [ ] Implementar caché en MaintenanceController
- [ ] Implementar caché en WorkController
- [ ] Crear índices en producción
- [ ] Agregar flag `minimal=true` en frontend
- [ ] Implementar debounce en botones críticos
- [ ] Agregar performance monitor middleware
- [ ] Testing de carga (simular 20+ usuarios)
- [ ] Verificar métricas en Railway

---

¿Quieres que implemente alguna de estas optimizaciones ahora? Recomiendo empezar con **Fase 1** (pool + compression) que toma 5 minutos y tiene impacto inmediato.
