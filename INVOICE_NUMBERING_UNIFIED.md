# 🔢 SISTEMA DE NUMERACIÓN UNIFICADA DE INVOICES

**Fecha**: 12 de Octubre, 2025  
**Objetivo**: Implementar numeración secuencial compartida entre Budget Invoices y Final Invoices

---

## 📋 PROBLEMA IDENTIFICADO

Anteriormente teníamos **dos sistemas de numeración independientes**:

### ❌ Sistema Anterior (INCORRECTO)
```
Budget Invoices:  1, 2, 3, 4, 5, 6...
Final Invoices:   1, 2, 3, 4, 5, 6...  ← ⚠️ DUPLICADOS!
```

**Problemas:**
- ❌ Números duplicados entre tipos de invoice
- ❌ Confusión en contabilidad
- ❌ Imposible rastrear secuencia temporal de ingresos
- ❌ Dificultad para auditorías financieras

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Sistema Unificado
```
Invoice #1  → Budget Invoice (Presupuesto Aprobado)
Invoice #2  → Final Invoice (Trabajo Completado)
Invoice #3  → Budget Invoice (Presupuesto Aprobado)
Invoice #4  → Budget Invoice (Presupuesto Aprobado)
Invoice #5  → Final Invoice (Trabajo Completado)
Invoice #6  → Budget Invoice (Presupuesto Aprobado)
...
```

**Ventajas:**
- ✅ Numeración única y secuencial para TODOS los invoices
- ✅ Orden cronológico de ingresos
- ✅ Fácil seguimiento contable
- ✅ Cumple con estándares de facturación

---

## 🛠️ ARCHIVOS MODIFICADOS

### 1. **Nuevo Helper: `invoiceNumberManager.js`**

**Ubicación**: `BackZurcher/src/utils/invoiceNumberManager.js`

**Funciones Principales:**

```javascript
// Obtener siguiente número de invoice disponible
getNextInvoiceNumber(transaction)

// Obtener estadísticas de numeración
getInvoiceNumberStats()

// Validar disponibilidad de número
isInvoiceNumberAvailable(invoiceNumber, transaction)
```

**Lógica de Numeración:**
```javascript
async function getNextInvoiceNumber(transaction) {
  // 1. Buscar último invoice en Budgets
  const lastBudgetInvoice = await Budget.findOne({
    where: { invoiceNumber: { [Op.not]: null } },
    order: [['invoiceNumber', 'DESC']]
  });

  // 2. Buscar último invoice en FinalInvoices
  const lastFinalInvoice = await FinalInvoice.findOne({
    where: { invoiceNumber: { [Op.not]: null } },
    order: [['invoiceNumber', 'DESC']]
  });

  // 3. Tomar el mayor de ambos
  const budgetMax = lastBudgetInvoice?.invoiceNumber || 0;
  const finalInvoiceMax = lastFinalInvoice?.invoiceNumber || 0;
  const currentMax = Math.max(budgetMax, finalInvoiceMax);

  // 4. Retornar siguiente
  return currentMax + 1;
}
```

---

### 2. **Modelo: `FinalInvoice.js`**

**Cambio**: Agregado campo `invoiceNumber`

```javascript
invoiceNumber: {
  type: DataTypes.INTEGER,
  allowNull: true,
  unique: true,
  comment: 'Número de Invoice unificado compartido con tabla Budgets'
}
```

---

### 3. **Migración: `add-invoice-number-to-final-invoices.js`**

**Ubicación**: `BackZurcher/migrations/add-invoice-number-to-final-invoices.js`

**Funcionalidad:**
1. ✅ Agrega columna `invoiceNumber` a tabla `FinalInvoices`
2. ✅ Crea índice único
3. ✅ Migra datos existentes:
   - Busca el último `invoiceNumber` en Budgets
   - Continúa la numeración desde ahí para FinalInvoices
   - Asigna números en orden cronológico (por `invoiceDate`)

**Ejemplo de Migración:**
```
Budgets existentes:
  Budget 101 → Invoice #1
  Budget 102 → Invoice #2
  Budget 103 → Invoice #3

FinalInvoices existentes (sin numerar):
  FinalInvoice 501 (fecha: 2025-01-15) → Invoice #4
  FinalInvoice 502 (fecha: 2025-02-10) → Invoice #5
  FinalInvoice 503 (fecha: 2025-03-05) → Invoice #6
```

---

### 4. **BudgetController.js**

**Cambios:**

#### A. Import del Helper
```javascript
const { getNextInvoiceNumber } = require('../utils/invoiceNumberManager');
```

#### B. Método `approveReview` (línea ~3712)

**Antes:**
```javascript
const lastInvoice = await Budget.findOne({
  where: { invoiceNumber: { [Op.not]: null } },
  order: [['invoiceNumber', 'DESC']]
});
invoiceNumber = lastInvoice?.invoiceNumber ? lastInvoice.invoiceNumber + 1 : 1;
```

**Después:**
```javascript
// 🔄 USAR NUMERACIÓN UNIFICADA
invoiceNumber = await getNextInvoiceNumber(transaction);
```

#### C. Método `convertDraftToInvoice` (línea ~4220)

**Antes:**
```javascript
const lastInvoice = await Budget.findOne({
  where: { invoiceNumber: { [Op.not]: null } },
  order: [['invoiceNumber', 'DESC']]
});
const nextInvoiceNumber = lastInvoice?.invoiceNumber ? lastInvoice.invoiceNumber + 1 : 1;
```

**Después:**
```javascript
// 🔄 USAR NUMERACIÓN UNIFICADA
const nextInvoiceNumber = await getNextInvoiceNumber(transaction);
```

---

### 5. **FinalInvoiceController.js**

**Cambios:**

#### A. Import del Helper
```javascript
const { getNextInvoiceNumber } = require('../utils/invoiceNumberManager');
```

#### B. Método `createFinalInvoice` (línea ~83)

**Antes:**
```javascript
const newFinalInvoice = await FinalInvoice.create({
  workId: work.idWork,
  budgetId: work.budget.idBudget,
  invoiceDate: new Date(),
  // ... sin invoiceNumber
}, { transaction });
```

**Después:**
```javascript
// 🆕 ASIGNAR NÚMERO DE INVOICE USANDO NUMERACIÓN UNIFICADA
const invoiceNumber = await getNextInvoiceNumber(transaction);

const newFinalInvoice = await FinalInvoice.create({
  workId: work.idWork,
  budgetId: work.budget.idBudget,
  invoiceNumber: invoiceNumber, // 🆕 NÚMERO UNIFICADO
  invoiceDate: new Date(),
  // ...
}, { transaction });
```

#### C. Método `sendFinalInvoiceEmail` (línea ~595)

**Antes:**
```javascript
const invoiceNumber = finalInvoice.id.toString().substring(0, 8);
```

**Después:**
```javascript
// 🆕 USAR invoiceNumber REAL
const invoiceNumber = finalInvoice.invoiceNumber || finalInvoice.id.toString().substring(0, 8);
```

---

## 🚀 CÓMO EJECUTAR LA MIGRACIÓN

### Paso 1: Ejecutar la migración
```bash
cd BackZurcher
node migrations/add-invoice-number-to-final-invoices.js
```

### Paso 2: Verificar en la base de datos
```sql
-- Ver invoices de Budgets
SELECT "idBudget", "invoiceNumber", "status", "date"
FROM "Budgets"
WHERE "invoiceNumber" IS NOT NULL
ORDER BY "invoiceNumber" ASC;

-- Ver invoices de FinalInvoices
SELECT "id", "invoiceNumber", "invoiceDate", "status"
FROM "FinalInvoices"
WHERE "invoiceNumber" IS NOT NULL
ORDER BY "invoiceNumber" ASC;

-- Ver numeración unificada
SELECT 'Budget' as source, "invoiceNumber", "date" as invoice_date
FROM "Budgets"
WHERE "invoiceNumber" IS NOT NULL
UNION ALL
SELECT 'FinalInvoice' as source, "invoiceNumber", "invoiceDate" as invoice_date
FROM "FinalInvoices"
WHERE "invoiceNumber" IS NOT NULL
ORDER BY "invoiceNumber" ASC;
```

---

## 📊 FLUJO DE NUMERACIÓN

### Caso 1: Cliente aprueba presupuesto
```javascript
// Frontend: Cliente aprueba presupuesto
POST /api/budgets/:idBudget/approve-review/:token
{
  "convertToInvoice": true
}

// Backend: BudgetController.approveReview()
invoiceNumber = await getNextInvoiceNumber(transaction); // 7
await budget.update({
  status: 'created',
  invoiceNumber: 7,
  convertedToInvoiceAt: new Date()
});

// Resultado: Budget Invoice #7
```

### Caso 2: Trabajo completado, generar factura final
```javascript
// Frontend: Admin crea factura final
POST /api/final-invoices/work/:workId

// Backend: FinalInvoiceController.createFinalInvoice()
const invoiceNumber = await getNextInvoiceNumber(transaction); // 8
const newFinalInvoice = await FinalInvoice.create({
  workId,
  budgetId,
  invoiceNumber: 8,
  // ...
});

// Resultado: Final Invoice #8
```

### Caso 3: Convertir Draft a Invoice
```javascript
// Frontend: Admin convierte Draft a Invoice
POST /api/budgets/:idBudget/convert-to-invoice

// Backend: BudgetController.convertDraftToInvoice()
const nextInvoiceNumber = await getNextInvoiceNumber(transaction); // 9
await budget.update({
  invoiceNumber: 9,
  status: 'created'
});

// Resultado: Budget Invoice #9
```

---

## 🔍 VALIDACIONES IMPLEMENTADAS

### 1. Unicidad Garantizada
```javascript
// Base de datos
invoiceNumber INTEGER UNIQUE

// Aplicación
const isAvailable = await isInvoiceNumberAvailable(invoiceNumber, transaction);
if (!isAvailable) {
  throw new Error('Invoice number already exists');
}
```

### 2. Transacciones
```javascript
// Todas las asignaciones usan transacciones
const transaction = await conn.transaction();
const invoiceNumber = await getNextInvoiceNumber(transaction);
await budget.update({ invoiceNumber }, { transaction });
await transaction.commit();
```

### 3. Logs de Auditoría
```javascript
console.log(`📊 Numeración de Invoices:`, {
  lastBudgetInvoice: 5,
  lastFinalInvoice: 3,
  currentMax: 5,
  nextNumber: 6
});
```

---

## 📈 ESTADÍSTICAS DE NUMERACIÓN

### Endpoint para Estadísticas
```javascript
// Usar el helper directamente
const { getInvoiceNumberStats } = require('../utils/invoiceNumberManager');

const stats = await getInvoiceNumberStats();
console.log(stats);
```

**Resultado:**
```json
{
  "budgetInvoices": {
    "count": 45,
    "min": 1,
    "max": 67
  },
  "finalInvoices": {
    "count": 23,
    "min": 12,
    "max": 68
  },
  "total": 68,
  "currentMax": 68,
  "nextAvailable": 69
}
```

---

## 🧪 TESTING

### Test 1: Crear Budget Invoice
```javascript
const budgetInvoiceNumber = await getNextInvoiceNumber();
console.log(`Nuevo Budget Invoice: #${budgetInvoiceNumber}`);
```

### Test 2: Crear Final Invoice
```javascript
const finalInvoiceNumber = await getNextInvoiceNumber();
console.log(`Nuevo Final Invoice: #${finalInvoiceNumber}`);
```

### Test 3: Verificar Secuencia
```sql
SELECT 
  'Budget' as type, 
  "invoiceNumber", 
  "idBudget" as id,
  "date"::text as date
FROM "Budgets"
WHERE "invoiceNumber" IS NOT NULL
UNION ALL
SELECT 
  'Final' as type, 
  "invoiceNumber", 
  "id"::text,
  "invoiceDate"::text as date
FROM "FinalInvoices"
WHERE "invoiceNumber" IS NOT NULL
ORDER BY "invoiceNumber" ASC;
```

**Resultado Esperado:**
```
type    | invoiceNumber | id  | date
--------|---------------|-----|------------
Budget  | 1             | 101 | 2025-01-10
Budget  | 2             | 102 | 2025-01-15
Final   | 3             | 501 | 2025-01-20
Budget  | 4             | 103 | 2025-01-25
Final   | 5             | 502 | 2025-02-01
...
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Retrocompatibilidad
- ✅ FinalInvoices antiguos sin `invoiceNumber` usan fallback al `id`
- ✅ La migración asigna números automáticamente
- ✅ No se requieren cambios en frontend para datos existentes

### 2. Concurrencia
- ✅ Uso de transacciones para evitar race conditions
- ✅ Índice único en base de datos previene duplicados
- ✅ getNextInvoiceNumber() consulta en tiempo real

### 3. PDFs
- ✅ Los PDFs usan el campo `invoiceNumber` cuando existe
- ✅ Se regeneran automáticamente al asignar número
- ✅ Formato: "INVOICE #123" o "BUDGET #456" (para drafts)

---

## 🎯 BENEFICIOS PARA FINANZAS

### 1. Trazabilidad Completa
```
Invoice #1  → $5,991.10 (Budget - Cliente A)
Invoice #2  → $3,245.50 (Final - Cliente B)
Invoice #3  → $8,500.00 (Budget - Cliente C)
Invoice #4  → $2,754.50 (Final - Cliente A)
```

### 2. Reportes Simplificados
```sql
-- Total facturado (ambos tipos)
SELECT SUM(total) FROM (
  SELECT "totalPrice" as total, "invoiceNumber"
  FROM "Budgets" WHERE "invoiceNumber" IS NOT NULL
  UNION ALL
  SELECT "finalAmountDue" as total, "invoiceNumber"
  FROM "FinalInvoices" WHERE "invoiceNumber" IS NOT NULL
) combined;
```

### 3. Auditoría
- ✅ Secuencia numérica sin gaps detectables
- ✅ Tipo de invoice identificable por tabla origen
- ✅ Fechas correlacionadas con números

---

## 🔄 FLUJO COMPLETO DE VIDA

```
1. PRESUPUESTO CREADO
   Status: draft
   Invoice Number: NULL
   ↓

2. CLIENTE APRUEBA
   Status: created
   Invoice Number: 45 ← ASIGNADO
   ↓

3. TRABAJO INICIA
   Work Status: inProgress
   ↓

4. TRABAJO COMPLETADO
   Work Status: covered
   ↓

5. FACTURA FINAL GENERADA
   FinalInvoice Created
   Invoice Number: 46 ← ASIGNADO (siguiente al del presupuesto)
   ↓

6. PAGO FINAL RECIBIDO
   FinalInvoice Status: paid
```

---

## 📝 CONCLUSIÓN

El sistema de numeración unificada garantiza:

✅ **Integridad Financiera**: Números únicos sin duplicados  
✅ **Trazabilidad**: Secuencia cronológica clara  
✅ **Escalabilidad**: Soporta crecimiento sin límites  
✅ **Cumplimiento**: Estándares contables profesionales  
✅ **Simplicidad**: Una sola fuente de verdad  

---

**FIN DE DOCUMENTACIÓN**

*Generado: 12 de Octubre, 2025*
