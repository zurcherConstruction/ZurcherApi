# 📋 GUÍA COMPLETA DE TESTING - CUENTAS POR PAGAR

## 🎯 Objetivo
Probar todas las opciones de pago y verificar que **NO se dupliquen gastos** en el balance.

---

## ✅ CASO 1: Vincular a Expense(s) Existente(s)

### Escenario
Ya existe un expense sin pagar (unpaid) y quieres vincularlo a un invoice de proveedor.

### Pasos
1. Ir a **Vista por Proveedores**
2. Expandir un proveedor
3. Hacer clic en **💳 Pagar** en un invoice pendiente
4. Seleccionar opción: **"Vincular a Expense(s) Existente(s)"**
5. Seleccionar uno o varios expenses de la lista
6. Elegir método de pago (ej: Chase Bank)
7. Seleccionar fecha de pago
8. **OPCIONAL:** Subir receipt del pago
9. Hacer clic en **"Procesar Pago"**

### ✅ Verificaciones
- [ ] El invoice desaparece de la lista de pendientes
- [ ] El proveedor reduce su deuda total
- [ ] Si se subió receipt: **NO debe aparecer** en el expense (solo en el invoice)
- [ ] En Summary: El expense sigue existiendo **UNA SOLA VEZ**
- [ ] El expense ahora tiene `paymentStatus: 'paid'`
- [ ] Verificar en Balance General que el gasto NO se duplicó

### 📊 SQL de Verificación
```sql
-- 1. Verificar el expense
SELECT 
  "idExpense",
  "typeExpense",
  "amountTotal",
  "description",
  "paymentStatus",
  "createdAt"
FROM "Expenses"
WHERE "idExpense" = '[ID_DEL_EXPENSE]';

-- 2. Verificar la vinculación en tabla intermedia
SELECT 
  sie.*,
  si."invoiceNumber",
  si."totalAmount",
  e."amountTotal" as "expenseAmount"
FROM "SupplierInvoiceExpenses" sie
JOIN "SupplierInvoices" si ON sie."idSupplierInvoice" = si."idSupplierInvoice"
JOIN "Expenses" e ON sie."idExpense" = e."idExpense"
WHERE sie."idExpense" = '[ID_DEL_EXPENSE]';

-- 3. Verificar que NO hay duplicados
SELECT 
  "description",
  "amountTotal",
  COUNT(*) as cantidad
FROM "Expenses"
WHERE "description" LIKE '%[DESCRIPCION]%'
GROUP BY "description", "amountTotal"
HAVING COUNT(*) > 1;

-- 4. Verificar receipt (si se subió)
SELECT *
FROM "Receipts"
WHERE "relatedModel" = 'SupplierInvoice'
AND "relatedId" = '[ID_DEL_INVOICE]';
```

---

## ✅ CASO 2: Crear Nuevo Expense con Work(s)

### Escenario
El invoice es por trabajos específicos. Necesitas crear expenses nuevos vinculados a esos works.

### Pasos
1. Ir a **Vista por Proveedores**
2. Expandir un proveedor
3. Hacer clic en **💳 Pagar** en un invoice pendiente
4. Seleccionar opción: **"Crear Nuevo Expense con Work(s)"**
5. Agregar uno o más works:
   - Seleccionar work de la lista
   - Ingresar monto
   - Ingresar descripción
   - Click en **+ Agregar Work**
6. Elegir método de pago
7. Seleccionar fecha de pago
8. **OPCIONAL:** Subir receipt del pago
9. Hacer clic en **"Procesar Pago"**

### ✅ Verificaciones
- [ ] El invoice desaparece de la lista de pendientes
- [ ] Se crean expenses NUEVOS (uno por cada work agregado)
- [ ] Cada expense tiene `typeExpense: 'work'`
- [ ] Cada expense tiene `workId` correcto
- [ ] Si se subió receipt: **SÍ debe aparecer** en cada expense creado
- [ ] En Summary: Los expenses aparecen en la lista
- [ ] Verificar en Balance General que los gastos NO se duplicaron

### 📊 SQL de Verificación
```sql
-- 1. Verificar los expenses creados
SELECT 
  e."idExpense",
  e."typeExpense",
  e."workId",
  e."amountTotal",
  e."description",
  e."paymentStatus",
  w."propertyAddress"
FROM "Expenses" e
LEFT JOIN "Works" w ON e."workId" = w."idWork"
WHERE e."createdAt" > NOW() - INTERVAL '10 minutes'
ORDER BY e."createdAt" DESC;

-- 2. Verificar la vinculación con el invoice
SELECT 
  sie.*,
  si."invoiceNumber",
  e."typeExpense",
  e."workId",
  e."amountTotal"
FROM "SupplierInvoiceExpenses" sie
JOIN "SupplierInvoices" si ON sie."idSupplierInvoice" = si."idSupplierInvoice"
JOIN "Expenses" e ON sie."idExpense" = e."idExpense"
WHERE si."invoiceNumber" = '[NUMERO_INVOICE]';

-- 3. Verificar receipts (si se subió)
SELECT 
  r.*,
  e."description" as "expenseDescription"
FROM "Receipts" r
JOIN "Expenses" e ON r."relatedId" = e."idExpense"::text
WHERE r."relatedModel" = 'Expense'
AND e."createdAt" > NOW() - INTERVAL '10 minutes';
```

---

## ✅ CASO 3: Crear Expense General (sin work)

### Escenario
El invoice es un gasto general de la empresa (no vinculado a ningún work específico).

### Pasos
1. Ir a **Vista por Proveedores**
2. Expandir un proveedor
3. Hacer clic en **💳 Pagar** en un invoice pendiente
4. Seleccionar opción: **"Crear Expense General"**
5. Ingresar descripción del gasto
6. Elegir método de pago
7. Seleccionar fecha de pago
8. **OPCIONAL:** Subir receipt del pago
9. Hacer clic en **"Procesar Pago"**

### ✅ Verificaciones
- [ ] El invoice desaparece de la lista de pendientes
- [ ] Se crea UN expense NUEVO
- [ ] El expense tiene `typeExpense: 'general'` (o similar)
- [ ] El expense NO tiene `workId` (NULL)
- [ ] Si se subió receipt: **SÍ debe aparecer** en el expense creado
- [ ] En Summary: El expense aparece en la lista
- [ ] Verificar en Balance General que el gasto NO se duplicó

### 📊 SQL de Verificación
```sql
-- 1. Verificar el expense creado
SELECT 
  "idExpense",
  "typeExpense",
  "workId",
  "amountTotal",
  "description",
  "paymentStatus",
  "createdAt"
FROM "Expenses"
WHERE "workId" IS NULL
AND "createdAt" > NOW() - INTERVAL '10 minutes'
ORDER BY "createdAt" DESC;

-- 2. Verificar la vinculación con el invoice
SELECT 
  sie.*,
  si."invoiceNumber",
  si."totalAmount",
  e."amountTotal",
  e."description"
FROM "SupplierInvoiceExpenses" sie
JOIN "SupplierInvoices" si ON sie."idSupplierInvoice" = si."idSupplierInvoice"
JOIN "Expenses" e ON sie."idExpense" = e."idExpense"
WHERE si."invoiceNumber" = '[NUMERO_INVOICE]';

-- 3. Verificar receipt (si se subió)
SELECT 
  r.*,
  e."description" as "expenseDescription"
FROM "Receipts" r
JOIN "Expenses" e ON r."relatedId" = e."idExpense"::text
WHERE r."relatedModel" = 'Expense'
AND e."createdAt" > NOW() - INTERVAL '10 minutes';
```

---

## 🔍 VERIFICACIÓN GLOBAL DE NO DUPLICACIÓN

### Script SQL Completo
```sql
-- ================================================
-- SCRIPT DE VERIFICACIÓN GLOBAL
-- ================================================

-- 1. Contar expenses totales antes vs después
SELECT 
  COUNT(*) as "total_expenses",
  SUM("amountTotal") as "suma_total"
FROM "Expenses"
WHERE "deletedAt" IS NULL;

-- 2. Buscar expenses duplicados (mismo monto y descripción)
SELECT 
  "description",
  "amountTotal",
  "typeExpense",
  COUNT(*) as "cantidad",
  STRING_AGG("idExpense"::text, ', ') as "ids"
FROM "Expenses"
WHERE "deletedAt" IS NULL
GROUP BY "description", "amountTotal", "typeExpense"
HAVING COUNT(*) > 1;

-- 3. Verificar tabla intermedia (no debe haber duplicados)
SELECT 
  "idSupplierInvoice",
  "idExpense",
  COUNT(*) as "cantidad"
FROM "SupplierInvoiceExpenses"
GROUP BY "idSupplierInvoice", "idExpense"
HAVING COUNT(*) > 1;

-- 4. Verificar todos los invoices pagados recientemente
SELECT 
  si."invoiceNumber",
  si."vendor",
  si."totalAmount",
  si."paymentStatus",
  si."paymentDate",
  COUNT(DISTINCT sie."idExpense") as "expenses_vinculados",
  STRING_AGG(DISTINCT e."idExpense"::text, ', ') as "expense_ids"
FROM "SupplierInvoices" si
LEFT JOIN "SupplierInvoiceExpenses" sie ON si."idSupplierInvoice" = sie."idSupplierInvoice"
LEFT JOIN "Expenses" e ON sie."idExpense" = e."idExpense"
WHERE si."paymentStatus" = 'paid'
AND si."paymentDate" > NOW() - INTERVAL '1 day'
GROUP BY si."idSupplierInvoice", si."invoiceNumber", si."vendor", si."totalAmount", si."paymentStatus", si."paymentDate"
ORDER BY si."paymentDate" DESC;

-- 5. Verificar balance: suma de invoices vs suma de expenses vinculados
SELECT 
  'Invoices Pagados' as "tipo",
  SUM(si."totalAmount") as "total"
FROM "SupplierInvoices" si
WHERE si."paymentStatus" = 'paid'
AND si."paymentDate" > NOW() - INTERVAL '1 day'

UNION ALL

SELECT 
  'Expenses Vinculados' as "tipo",
  SUM(e."amountTotal") as "total"
FROM "Expenses" e
JOIN "SupplierInvoiceExpenses" sie ON e."idExpense" = sie."idExpense"
JOIN "SupplierInvoices" si ON sie."idSupplierInvoice" = si."idSupplierInvoice"
WHERE si."paymentDate" > NOW() - INTERVAL '1 day';
```

---

## 📝 CHECKLIST FINAL

### Antes de cada prueba
- [ ] Anotar el expense ID que vas a usar (Caso 1)
- [ ] Anotar el invoice number que vas a pagar
- [ ] Anotar el balance total actual
- [ ] Tomar screenshot del estado inicial

### Durante la prueba
- [ ] Probar con y sin receipt
- [ ] Verificar que el modal muestre el invoice PDF/imagen
- [ ] Verificar que la lista se recargue automáticamente

### Después de cada prueba
- [ ] Ejecutar el SQL de verificación correspondiente
- [ ] Verificar que el invoice desapareció de pendientes
- [ ] Ir a Summary y buscar el/los expense(s)
- [ ] Verificar Balance General
- [ ] Anotar resultados

---

## ⚠️ PROBLEMAS CONOCIDOS

### 1. Error de tipos UUID vs VARCHAR
**Síntoma:** Error al cargar invoice completo para mostrar PDF
```
el operador no existe: uuid = character varying
```

**Workaround:** Receipts temporalmente comentado en el endpoint GET /supplier-invoices/:id

**Solución permanente:** Migrar `Receipts.relatedId` de STRING a UUID

### 2. Recarga automática
**Fix aplicado:** Ya implementado. Usa `onRefresh()` en lugar de `window.location.reload()`

---

## 📊 REGISTRO DE PRUEBAS

| Fecha | Caso | Invoice # | Expense ID(s) | Receipt | Resultado | Notas |
|-------|------|-----------|---------------|---------|-----------|-------|
| 2025-11-06 | Caso 1 | 767677 | 44c4f505-... | ✅ Sí | ✅ PASÓ | Invoice pagado, expense vinculado correctamente |
| | | | | | | |
| | | | | | | |

---

## 🎯 PRÓXIMOS PASOS

1. **Prueba Caso 1**: Vincular a expense existente ✅ (YA PROBADO)
2. **Prueba Caso 2**: Crear expense con work(s)
3. **Prueba Caso 3**: Crear expense general
4. **Verificar Balance**: Ejecutar SQL de verificación global
5. **Prueba de Receipts**: Verificar con y sin receipt en cada caso
6. **Prueba de Edge Cases**: 
   - Pagar invoice con monto diferente al expense
   - Vincular múltiples expenses a un invoice
   - Crear múltiples works para un invoice

---

## 📞 SOPORTE

Si encuentras algún problema:
1. Copia el mensaje de error completo
2. Anota los pasos exactos que seguiste
3. Ejecuta el SQL de verificación correspondiente
4. Comparte los resultados

**¡Éxito en las pruebas!** 🚀
