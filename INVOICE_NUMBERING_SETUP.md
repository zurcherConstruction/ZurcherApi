# 🚀 GUÍA RÁPIDA: Implementar Numeración Unificada de Invoices

## ✅ PASOS PARA EJECUTAR

### 1. Ejecutar la Migración

```bash
cd BackZurcher
node scripts/run-invoice-number-migration.js
```

**Qué hace esto:**
- ✅ Agrega columna `invoiceNumber` a tabla `FinalInvoices`
- ✅ Crea índice único
- ✅ Asigna números a FinalInvoices existentes (continuando desde el último Budget Invoice)
- ✅ Muestra estadísticas y verificación

**Resultado Esperado:**
```
🚀 === INICIANDO MIGRACIÓN DE NUMERACIÓN UNIFICADA ===

📝 Agregando columna invoiceNumber a FinalInvoices...
✅ Columna invoiceNumber agregada a FinalInvoices
✅ Índice único creado para invoiceNumber en FinalInvoices

📊 Último invoice en Budgets: 67
🔢 Comenzando numeración de FinalInvoices desde: 68

📋 Asignando invoiceNumbers a 5 facturas finales existentes...
  ✅ FinalInvoice 501 → Invoice #68
  ✅ FinalInvoice 502 → Invoice #69
  ✅ FinalInvoice 503 → Invoice #70
  ✅ FinalInvoice 504 → Invoice #71
  ✅ FinalInvoice 505 → Invoice #72

✅ 5 facturas finales numeradas (68 a 72)
✅ Migración completada: invoiceNumber agregado a FinalInvoices

📊 Verificando numeración...

📋 Primeros 20 invoices en orden:
┌─────────┬────────┬───────────────┬─────┬──────────────┬─────────────┐
│ (index) │  type  │ invoiceNumber │ id  │     date     │    name     │
├─────────┼────────┼───────────────┼─────┼──────────────┼─────────────┤
│    0    │ Budget │       1       │ 101 │ 2025-01-10   │ John Doe    │
│    1    │ Budget │       2       │ 102 │ 2025-01-15   │ Jane Smith  │
│    2    │ Budget │       3       │ 103 │ 2025-01-20   │ Bob Johnson │
│    3    │ Final  │      68       │ 501 │ 2025-02-01   │ John Doe    │
│    4    │ Final  │      69       │ 502 │ 2025-02-10   │ Jane Smith  │
...
└─────────┴────────┴───────────────┴─────┴──────────────┴─────────────┘

📊 Estadísticas de Numeración:
Budget Invoices: { count: '67', min: 1, max: 67 }
Final Invoices: { count: '5', min: 68, max: 72 }

Total de Invoices: 72
Siguiente Invoice Number disponible: 73

✅ Migración verificada correctamente
```

---

### 2. Verificar en Base de Datos

```sql
-- Ver todos los invoices en orden
SELECT 
  CASE WHEN b."idBudget" IS NOT NULL THEN 'Budget Invoice'
       ELSE 'Final Invoice' END as tipo,
  COALESCE(b."invoiceNumber", fi."invoiceNumber") as invoice_num,
  COALESCE(b."date", fi."invoiceDate") as fecha,
  COALESCE(b."applicantName", b2."applicantName") as cliente,
  COALESCE(b."totalPrice", fi."finalAmountDue") as monto
FROM "Budgets" b
FULL OUTER JOIN "FinalInvoices" fi ON b."invoiceNumber" = fi."invoiceNumber"
LEFT JOIN "Budgets" b2 ON fi."budgetId" = b2."idBudget"
WHERE COALESCE(b."invoiceNumber", fi."invoiceNumber") IS NOT NULL
ORDER BY invoice_num ASC;
```

---

### 3. Reiniciar Backend

```bash
npm run dev
```

---

## 🧪 PROBAR LA FUNCIONALIDAD

### Test 1: Aprobar un Presupuesto

1. Crear un presupuesto draft
2. Enviarlo para revisión del cliente
3. Cliente lo aprueba con opción de convertir a invoice
4. **Verificar**: El presupuesto debe recibir el siguiente `invoiceNumber` disponible

**Frontend:**
```javascript
POST /api/budgets/:idBudget/approve-review/:reviewToken
{
  "convertToInvoice": true
}
```

**Verificar en BD:**
```sql
SELECT "idBudget", "invoiceNumber", "status", "convertedToInvoiceAt"
FROM "Budgets"
ORDER BY "invoiceNumber" DESC
LIMIT 5;
```

---

### Test 2: Generar Factura Final

1. Completar un trabajo (status: covered)
2. Generar factura final
3. **Verificar**: La factura final debe recibir el siguiente `invoiceNumber` disponible

**Frontend:**
```javascript
POST /api/final-invoices/work/:workId
```

**Verificar en BD:**
```sql
SELECT "id", "invoiceNumber", "workId", "invoiceDate", "finalAmountDue"
FROM "FinalInvoices"
ORDER BY "invoiceNumber" DESC
LIMIT 5;
```

---

### Test 3: Verificar Secuencia

**Consulta:**
```sql
SELECT 
  'Budget' as source,
  "invoiceNumber",
  "date" as invoice_date,
  "totalPrice" as amount
FROM "Budgets"
WHERE "invoiceNumber" IS NOT NULL
UNION ALL
SELECT 
  'FinalInvoice' as source,
  "invoiceNumber",
  "invoiceDate" as invoice_date,
  "finalAmountDue" as amount
FROM "FinalInvoices"
WHERE "invoiceNumber" IS NOT NULL
ORDER BY "invoiceNumber" ASC;
```

**Resultado Esperado:**
```
 source       | invoiceNumber | invoice_date | amount
--------------|---------------|--------------|----------
 Budget       |             1 | 2025-01-10   | 9985.17
 Budget       |             2 | 2025-01-15   | 5500.00
 FinalInvoice |             3 | 2025-01-20   | 3245.50
 Budget       |             4 | 2025-01-25   | 8500.00
 FinalInvoice |             5 | 2025-02-01   | 2754.50
```

---

## 📊 ESTADÍSTICAS DE NUMERACIÓN

### Usar el Helper

```javascript
const { getInvoiceNumberStats } = require('./src/utils/invoiceNumberManager');

// Obtener estadísticas
const stats = await getInvoiceNumberStats();
console.log(stats);
```

**Resultado:**
```json
{
  "budgetInvoices": {
    "count": 67,
    "min": 1,
    "max": 67
  },
  "finalInvoices": {
    "count": 5,
    "min": 68,
    "max": 72
  },
  "total": 72,
  "currentMax": 72,
  "nextAvailable": 73
}
```

---

## ⚠️ ROLLBACK (Si es necesario)

Si algo sale mal, puedes revertir:

```bash
cd BackZurcher
node -e "
const { conn } = require('./src/data');
const migration = require('./migrations/add-invoice-number-to-final-invoices');

(async () => {
  await migration.down(conn.getQueryInterface(), conn.Sequelize);
  console.log('✅ Migración revertida');
  process.exit(0);
})();
"
```

---

## 🎯 VERIFICACIÓN FINAL

### Checklist de Validación

- [ ] Migración ejecutada sin errores
- [ ] Columna `invoiceNumber` existe en tabla `FinalInvoices`
- [ ] Índice único creado correctamente
- [ ] FinalInvoices existentes tienen `invoiceNumber` asignado
- [ ] La numeración continúa desde el último Budget Invoice
- [ ] No hay duplicados en `invoiceNumber`
- [ ] Backend reiniciado correctamente
- [ ] Aprobación de presupuesto asigna `invoiceNumber`
- [ ] Creación de factura final asigna `invoiceNumber`
- [ ] PDFs muestran el número correcto

---

## 📞 SOPORTE

Si encuentras algún problema:

1. Revisa los logs del script de migración
2. Verifica que no haya duplicados:
   ```sql
   SELECT "invoiceNumber", COUNT(*)
   FROM (
     SELECT "invoiceNumber" FROM "Budgets" WHERE "invoiceNumber" IS NOT NULL
     UNION ALL
     SELECT "invoiceNumber" FROM "FinalInvoices" WHERE "invoiceNumber" IS NOT NULL
   ) combined
   GROUP BY "invoiceNumber"
   HAVING COUNT(*) > 1;
   ```
3. Consulta `INVOICE_NUMBERING_UNIFIED.md` para detalles técnicos

---

**¡Listo! Tu sistema ahora tiene numeración unificada de invoices.**

🎉 **Beneficios:**
- ✅ Un solo sistema de numeración
- ✅ Orden cronológico de ingresos
- ✅ Fácil seguimiento contable
- ✅ Cumplimiento de estándares

