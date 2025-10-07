# 📋 Flujo de Trabajo: Draft → Invoice

## 🎯 Objetivo

Separar los **Presupuestos Borrador (Drafts)** de los **Invoices Definitivos** para:
- Evitar generar números de invoice para presupuestos que aún no están aprobados
- Facilitar el control financiero
- Mejorar la claridad para el cliente

---

## 🔄 Flujo Completo

### **Paso 1: Crear Presupuesto Borrador (Draft)**

**Endpoint:** `POST /api/budgets/`

**Body:**
```json
{
  "permitId": "uuid-del-permiso",
  "status": "draft",  // ✅ IMPORTANTE: Usar status "draft"
  "lineItems": [...],
  "discountAmount": 0,
  "initialPaymentPercentage": 60,
  ...
}
```

**Resultado:**
- Se crea un Budget con `status: 'draft'`
- Se asigna `idBudget` (ejemplo: 1010)
- **NO** se asigna `invoiceNumber` (queda en `NULL`)
- Se genera PDF que dice **"BUDGET #1010"** (no "INVOICE")
- **NO** incluye botón de pago de Stripe
- **NO** se envía a SignNow

---

### **Paso 2: Enviar para Revisión del Cliente**

**Endpoint:** `POST /api/budgets/:idBudget/send-for-review`

**Resultado:**
- Cambia status a `pending_review`
- Genera un `reviewToken` único
- Envía email al cliente con link de revisión
- Cliente ve el PDF del **BUDGET #1010** (sin botón de pago)

**Link de revisión:**
```
https://app.zurcherseptic.com/budget-review/:idBudget/:reviewToken
```

---

### **Paso 3A: Cliente Aprueba el Presupuesto**

**Endpoint (Público):** `POST /api/budgets/:idBudget/approve-review/:reviewToken`

**Resultado:**
- ✅ Se asigna el siguiente `invoiceNumber` disponible (ejemplo: 123)
- Cambia status a `created` (invoice definitivo)
- Registra fecha en `convertedToInvoiceAt`
- **Se regenera el PDF** que ahora dice **"INVOICE #123"**
- **Incluye botón de pago** de Stripe (+3% fee)
- Notifica al equipo que el presupuesto fue aprobado
- Envía confirmación al cliente

**Ahora el presupuesto está listo para:**
- Enviarse a SignNow para firma digital
- Procesar el pago inicial
- Iniciar el trabajo

---

### **Paso 3B: Cliente Rechaza el Presupuesto**

**Endpoint (Público):** `POST /api/budgets/:idBudget/reject-review/:reviewToken`

**Resultado:**
- Cambia status a `rejected`
- **NO** se asigna `invoiceNumber`
- El borrador queda archivado
- No afecta la numeración de invoices
- Se notifica al equipo del rechazo

---

### **Paso 4 (Opcional): Conversión Manual**

Si el administrador quiere convertir un draft a invoice sin esperar aprobación del cliente:

**Endpoint:** `POST /api/budgets/:idBudget/convert-to-invoice`

**Requiere autenticación:** Admin, Owner o Finance

**Resultado:**
- Mismo proceso que la aprobación del cliente
- Asigna `invoiceNumber`
- Regenera PDF como INVOICE
- Cambia status a `created`

---

## 📊 Estados del Budget

| Estado | Descripción | `invoiceNumber` | PDF muestra |
|--------|-------------|-----------------|-------------|
| `draft` | Borrador inicial, no enviado | `NULL` | BUDGET #1010 |
| `pending_review` | Enviado para revisión del cliente | `NULL` | BUDGET #1010 |
| `client_approved` | Cliente aprobó, pendiente conversión | Asignado | INVOICE #123 |
| `created` | Invoice definitivo listo | Asignado | INVOICE #123 |
| `sent_for_signature` | Enviado a SignNow | Asignado | INVOICE #123 |
| `signed` | Firmado por el cliente | Asignado | INVOICE #123 |
| `rejected` | Rechazado por el cliente | `NULL` | BUDGET #1010 |

---

## 🔢 Numeración

### **Budget Numbers (idBudget)**
- Se asignan **automáticamente** a TODOS los presupuestos
- Secuencia continua: 1, 2, 3, 4...
- Nunca se reutilizan
- Incluyen drafts y rechazados

### **Invoice Numbers (invoiceNumber)**
- Se asignan **solo a presupuestos aprobados**
- Secuencia separada: 1, 2, 3, 4...
- Solo afectan el control financiero
- No incluyen drafts ni rechazados

**Ejemplo:**
```
Budget #1005 (draft) → Rechazado → NO tiene invoiceNumber
Budget #1006 (draft) → Aprobado → Invoice #45
Budget #1007 (draft) → Aprobado → Invoice #46
Budget #1008 (draft) → Pendiente → NO tiene invoiceNumber (aún)
```

---

## 🎨 Diferencias Visuales en el PDF

### **DRAFT (BUDGET #1010)**
```
┌─────────────────────────────┐
│   BUDGET #1010              │
│   (Sin número de invoice)   │
│                             │
│   [Items del presupuesto]   │
│                             │
│   TOTAL: $15,000            │
│                             │
│   ❌ SIN botón de pago      │
└─────────────────────────────┘
```

### **INVOICE DEFINITIVO (INVOICE #123)**
```
┌─────────────────────────────┐
│   INVOICE #123              │
│   (Budget original: #1010)  │
│                             │
│   [Items del presupuesto]   │
│                             │
│   TOTAL: $15,000            │
│   INITIAL PAYMENT: $9,000   │
│                             │
│   ✅ [PAY NOW] (Stripe)     │
└─────────────────────────────┘
```

---

## 🛠️ Migración de Datos Existentes

Para los presupuestos existentes, ejecutar:

```bash
cd BackZurcher
node migrations/add-invoice-number-to-budgets.js
```

**Esto hará:**
1. Agregar columnas `invoiceNumber` y `convertedToInvoiceAt`
2. Asignar invoice numbers a presupuestos existentes que NO sean drafts
3. Mantener `NULL` para drafts existentes

---

## 📱 Endpoints Nuevos

### **Convertir Draft a Invoice**
```
POST /api/budgets/:idBudget/convert-to-invoice
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Presupuesto convertido exitosamente a Invoice #123",
  "invoiceNumber": 123,
  "convertedAt": "2025-10-06T14:30:00.000Z"
}
```

---

## 🎯 Ventajas del Nuevo Flujo

✅ **Control Financiero Mejorado**
- Solo los presupuestos aprobados tienen invoice numbers
- Más fácil rastrear pagos y facturación

✅ **Claridad para el Cliente**
- "BUDGET" = Propuesta (puede cambiar)
- "INVOICE" = Definitivo (listo para pago/firma)

✅ **Flexibilidad**
- Puedes enviar múltiples versiones de un presupuesto
- Solo se genera invoice cuando hay aprobación

✅ **Sin Pérdida de Funcionalidad**
- Todo el flujo anterior sigue funcionando
- Solo se agrega la separación draft/invoice

---

## 🔍 Consultas Útiles

### **Ver todos los Drafts pendientes:**
```sql
SELECT "idBudget", "propertyAddress", "totalPrice", "status" 
FROM "Budgets" 
WHERE "status" IN ('draft', 'pending_review')
AND "invoiceNumber" IS NULL;
```

### **Ver todos los Invoices definitivos:**
```sql
SELECT "idBudget", "invoiceNumber", "propertyAddress", "totalPrice", "status" 
FROM "Budgets" 
WHERE "invoiceNumber" IS NOT NULL
ORDER BY "invoiceNumber" DESC;
```

### **Obtener el siguiente Invoice Number disponible:**
```sql
SELECT COALESCE(MAX("invoiceNumber"), 0) + 1 AS "nextInvoiceNumber"
FROM "Budgets";
```

---

## 📝 Notas Importantes

1. **Los drafts NO afectan la numeración de invoices**
   - Puedes crear 100 drafts y solo 10 invoices

2. **La conversión es irreversible**
   - Una vez asignado un invoiceNumber, no se puede revertir

3. **El PDF se regenera automáticamente**
   - Al convertir a invoice, el sistema regenera el PDF con el nuevo número

4. **Compatibilidad con sistema anterior**
   - Los presupuestos creados con `status: 'created'` automáticamente obtienen un invoiceNumber en la migración
