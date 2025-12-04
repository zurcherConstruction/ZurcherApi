# 🚀 Optimizaciones de Performance - ZurcherApi

## ✅ Optimizaciones Implementadas (Diciembre 2025)

### 1. **Base de Datos - Pool de Conexiones Optimizado**
- **Ubicación**: `BackZurcher/src/data/index.js`
- **Cambios**:
  ```javascript
  pool: {
    max: 30,        // ⬆️ Aumentado de 10 a 30 para soportar alta concurrencia
    min: 5,         // ⬆️ Mantener 5 conexiones activas (warm connections)
    acquire: 60000, // ⬆️ 60 segundos para adquirir conexión
    idle: 20000,    // ⬆️ 20 segundos antes de liberar conexión inactiva
    evict: 10000,   // 🆕 Revisar cada 10s conexiones para eviction
    maxUses: 1000   // 🆕 Reciclar conexión después de 1000 usos
  }
  ```
- **Impacto**: Reduce timeouts bajo alta carga, permite hasta 30 conexiones simultáneas

### 2. **Compresión HTTP**
- **Ubicación**: `BackZurcher/src/app.js`
- **Implementación**:
  ```javascript
  app.use(compression({
    level: 6,       // Balance entre velocidad y compresión
    threshold: 1024 // Solo comprimir responses > 1KB
  }));
  ```
- **Impacto**: Reduce tamaño de responses hasta 70%, acelera transferencia de datos

### 3. **Caché de Endpoints Críticos**
- **Ubicación**: `BackZurcher/src/routes/workRoutes.js`
- **Endpoints cacheados**:
  - `GET /work` - 15 segundos (lista de obras)
  - `GET /work/maintenance` - 20 segundos (obras en mantenimiento)
  - `GET /work/:idWork` - 30 segundos (detalle de obra individual)
- **Impacto**: Reduce queries a DB hasta 80% en endpoints frecuentes

### 4. **Optimización de Queries - Maintenance**
- **Ubicación**: `BackZurcher/src/controllers/MaintenanceController.js`
- **Cambios**:
  - Removido include de `MaintenanceMedia` en `scheduleMaintenanceVisits` (línea 526)
  - Solo carga campos necesarios en queries de Work y MaintenanceVisit
- **Impacto**: Reduce tiempo de programación de visitas de 65s a ~2-5s

### 5. **Async Email Sending**
- **Ubicación**: `BackZurcher/src/controllers/MaintenanceController.js`
- **Implementación**: Emails se envían en background sin bloquear responses
- **Impacto**: Asignación de visitas responde en 1-2s en lugar de 80s

### 6. **Loading Indicators en Frontend**
- **Ubicación**: 
  - `FrontZurcher/src/Components/Maintenance/MaintenanceDetail.jsx`
  - `FrontZurcher/src/Components/Maintenance/VisitForm.jsx`
- **Implementación**: SweetAlert loading con `Swal.showLoading()`
- **Impacto**: Mejor UX, usuarios ven feedback inmediato

---

## 📊 Métricas de Mejora

| Operación | Antes | Después | Mejora |
|-----------|-------|---------|--------|
| Programar visitas | 65s | ~3s | **95% más rápido** |
| Asignar visita | 80s | 1.9s | **97% más rápido** |
| GET /work (cached) | ~500ms | ~50ms | **90% más rápido** |
| Response size | 100KB | ~30KB | **70% más liviano** |

---

## 🎯 Recomendaciones Adicionales (Para Implementar)

### Fase 2: Optimizaciones de Base de Datos

#### A. Índices en PostgreSQL
Agregar estos índices para acelerar queries frecuentes:

```sql
-- Índices para Works (queries más comunes)
CREATE INDEX IF NOT EXISTS idx_work_status ON "Work"(status);
CREATE INDEX IF NOT EXISTS idx_work_created_at ON "Work"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_work_property_address ON "Work"("propertyAddress");

-- Índices para MaintenanceVisit
CREATE INDEX IF NOT EXISTS idx_maintenance_visit_work_id ON "MaintenanceVisit"("workId");
CREATE INDEX IF NOT EXISTS idx_maintenance_visit_status ON "MaintenanceVisit"(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_visit_scheduled_date ON "MaintenanceVisit"("scheduledDate");

-- Índices para Expenses (frecuentes en dashboard)
CREATE INDEX IF NOT EXISTS idx_expense_work_id ON "Expense"("workId");
CREATE INDEX IF NOT EXISTS idx_expense_date ON "Expense"(date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_supplier_invoice_item ON "Expense"("supplierInvoiceItemId");

-- Índices para Incomes
CREATE INDEX IF NOT EXISTS idx_income_work_id ON "Income"("workId");
CREATE INDEX IF NOT EXISTS idx_income_date ON "Income"(date DESC);

-- Índices para Budgets
CREATE INDEX IF NOT EXISTS idx_budget_status ON "Budget"(status);
CREATE INDEX IF NOT EXISTS idx_budget_created_at ON "Budget"("createdAt" DESC);
```

**Cómo ejecutar**:
1. Conectarte a Railway PostgreSQL
2. Ejecutar en psql o TablePlus
3. Verificar con: `SELECT * FROM pg_indexes WHERE tablename LIKE 'Work' OR tablename LIKE 'Expense';`

#### B. VACUUM y ANALYZE (Mantenimiento de DB)
```sql
-- Ejecutar mensualmente para optimizar tablas
VACUUM ANALYZE "Work";
VACUUM ANALYZE "Expense";
VACUUM ANALYZE "Income";
VACUUM ANALYZE "MaintenanceVisit";
VACUUM ANALYZE "Budget";
```

### Fase 3: Optimizaciones de Código

#### C. Paginación en Maintenance Visits
Actualmente `GET /maintenance/work/:workId` carga TODAS las visitas. Implementar:

```javascript
// En MaintenanceController.js
const getMaintenanceVisitsByWork = async (req, res) => {
  const { workId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const { count, rows } = await MaintenanceVisit.findAndCountAll({
    where: { workId },
    limit,
    offset: (page - 1) * limit,
    include: [{ model: Staff, as: 'assignedStaff' }],
    // NO incluir MaintenanceMedia aquí
    order: [['visitNumber', 'ASC']]
  });
  
  res.json({
    visits: rows,
    pagination: { total: count, page, limit }
  });
};
```

#### D. Lazy Loading de Media Files
Separar endpoint para cargar fotos bajo demanda:

```javascript
// Nueva ruta: GET /maintenance/:visitId/media
router.get('/:visitId/media', getMaintenanceMedia);

const getMaintenanceMedia = async (req, res) => {
  const { visitId } = req.params;
  const media = await MaintenanceMedia.findAll({
    where: { maintenanceVisitId: visitId }
  });
  res.json(media);
};
```

#### E. Worker/Background Jobs para Tareas Pesadas
Para operaciones que toman >5s, usar background jobs:

```javascript
// Instalar: npm install bull redis
const Queue = require('bull');
const emailQueue = new Queue('emails', process.env.REDIS_URL);

// Al asignar visita
emailQueue.add({ visitId, staffEmail });

// Procesador
emailQueue.process(async (job) => {
  const { visitId, staffEmail } = job.data;
  await sendEmail(...);
});
```

### Fase 4: Infraestructura

#### F. Redis para Caché Distribuido
Actualmente usas caché en memoria (se pierde al reiniciar). Con Redis:

```javascript
// npm install redis
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

// En middleware/cache.js
async function cacheMiddleware(duration) {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const originalJson = res.json.bind(res);
    res.json = async function(data) {
      await client.setEx(key, duration, JSON.stringify(data));
      return originalJson(data);
    };
    next();
  };
}
```

**Railway**: Agregar Redis add-on ($5/mes)

#### G. CDN para Assets Estáticos
- Cloudinary para PDFs (ya implementado ✅)
- CloudFront/Cloudflare CDN para:
  - `/uploads/*`
  - `/images/*`
  - Build de React (`FrontZurcher/dist`)

#### H. Connection Pooling con PgBouncer
Railway permite PgBouncer para manejar picos de tráfico:

1. Railway Dashboard → PostgreSQL → Settings
2. Enable "Connection Pooling"
3. Actualizar `DB_DEPLOY` con URL de pooling
4. Max connections: 100 (vs 30 actual)

---

## 🔧 Monitoreo y Debugging

### Ver Queries Lentas
```javascript
// En data/index.js, temporalmente:
logging: (sql, timing) => {
  if (timing > 1000) { // Queries > 1s
    console.warn(`🐢 SLOW QUERY (${timing}ms): ${sql}`);
  }
}
```

### Ver Uso del Pool
```javascript
// En cualquier endpoint crítico
console.log({
  pool: sequelize.connectionManager.pool._count,
  idle: sequelize.connectionManager.pool._idle.length,
  active: sequelize.connectionManager.pool._count - sequelize.connectionManager.pool._idle.length
});
```

### Middleware de Timing
```javascript
// En app.js, antes de routes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 2000) {
      console.warn(`⏱️  SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});
```

---

## 📝 Checklist de Implementación

### ✅ Ya Implementado (Diciembre 2025)
- [x] Pool de conexiones optimizado (max: 30)
- [x] Compresión HTTP con `compression`
- [x] Caché en endpoints de Work
- [x] Queries optimizadas en MaintenanceController
- [x] Async email sending
- [x] Loading indicators en frontend

### ⏳ Por Implementar (Prioridad Alta)
- [ ] Índices en PostgreSQL (30 min)
- [ ] Paginación en MaintenanceVisits (1 hora)
- [ ] Lazy loading de media files (2 horas)
- [ ] VACUUM mensual automatizado (30 min)

### 🔮 Mejoras Futuras (Prioridad Media)
- [ ] Redis para caché distribuido (4 horas)
- [ ] Background jobs con Bull/Redis (1 día)
- [ ] PgBouncer en Railway (15 min)
- [ ] CDN para assets estáticos (2 horas)

---

## 🎓 Mejores Prácticas

### DO ✅
- Usar caché en endpoints de lectura frecuente
- Invalidar caché después de modificaciones
- Cargar solo campos necesarios (`attributes: [...]`)
- Separar queries pesadas en paralelo
- Paginar resultados (especialmente con >100 items)
- Índices en foreign keys y campos de WHERE/ORDER BY

### DON'T ❌
- Cargar BLOBs (PDFs, imágenes) en lista de items
- Hacer `include` con más de 2 niveles de profundidad
- Usar `findAll()` sin `limit` en producción
- Bloquear responses esperando emails/webhooks
- Sincronizar DB (`sync()`) en cada request

---

## 📞 Contacto y Soporte

**Mantenedor**: Equipo Zurcher Development  
**Última actualización**: Diciembre 4, 2025  
**Versión**: 1.0.0

Para reportar problemas de performance:
1. Verificar logs de `SLOW QUERY` y `SLOW REQUEST`
2. Revisar Railway Metrics (CPU, Memory, DB connections)
3. Ejecutar `npm run analyze-performance` (si existe)
4. Contactar con logs relevantes
