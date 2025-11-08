# Cómo Funcionan los Change Orders en Accounts Receivable

## 📋 Flujo Correcto

### 1. Budget Original
```
Budget Total: $10,000
Initial Payment (60%): $6,000
```

### 2. Durante el Work - Se crea Change Order
```
Change Order #1: Rock Removal
- Previous Total Price: $10,000  ← Total del contrato ANTES del cambio
- Item Cost: $500                ← Costo del cargo extra
- New Total Price: $10,500       ← Total del contrato DESPUÉS del cambio
```

**Cálculo del aumento:**
```javascript
changeOrderIncrease = newTotalPrice - previousTotalPrice
                    = $10,500 - $10,000
                    = +$500
```

### 3. Final Invoice
```
Original Budget Total: $10,000
Change Orders Total: +$500
Subtotal Extras: $0 (o extras adicionales no contemplados en C.O.)
Discount: $0
--------------------------------
Final Amount Due: $10,500
Initial Payment: -$6,000
--------------------------------
Balance to Collect: $4,500
```

### 4. En Accounts Receivable
```
Budget Total: $10,000
C.O.: +$500
Expected Total: $10,500
Initial Payment: $6,000
Final Invoice Paid: $4,500
Total Collected: $10,500
Remaining: $0 (Completo)
```

## ❌ Problema Encontrado en Work #25

### Datos Actuales (INCORRECTOS):
```
Change Order:
- Previous Total: $0.00  ❌ INCORRECTO
- New Total: $0.00       ❌ INCORRECTO
- Diferencia: $0.00

Budget Total: $9,785.17
C.O. Total: $0.00        ❌ Debería mostrar el aumento real
Final Invoice Extras: $400.00  ⚠️ Esto debería estar en el C.O.
```

### Cómo Debería Ser:
```
Change Order:
- Previous Total: $9,785.17  ✅ (Budget original)
- New Total: $10,185.17      ✅ (Budget + $400)
- Diferencia: +$400.00

Budget Total: $9,785.17
C.O. Total: +$400.00
Final Invoice Extras: $0.00 (ya está en C.O.)
Expected Total: $10,185.17
```

## 🔧 Campos en Base de Datos

### Tabla: ChangeOrders
```sql
- previousTotalPrice DECIMAL(10,2)  -- Total del contrato ANTES del cambio
- newTotalPrice DECIMAL(10,2)       -- Total del contrato DESPUÉS del cambio
- totalCost DECIMAL(10,2)           -- Costo del item individual
- itemDescription TEXT              -- Descripción del cargo extra
- status ENUM('pending', 'approved', 'rejected')
```

### Tabla: FinalInvoices
```sql
- originalBudgetTotal DECIMAL(10,2)  -- Budget original
- subtotalExtras DECIMAL(10,2)       -- Extras NO contemplados en C.O.
- discount DECIMAL(10,2)             -- Descuentos aplicados
- initialPaymentMade DECIMAL(10,2)   -- Initial payment que ya se pagó
- finalAmountDue DECIMAL(10,2)       -- Balance final a cobrar
```

## 📊 Cálculo Correcto en Endpoint

```javascript
// 1. Total del contrato
const budgetTotal = work.budget.clientTotalPrice || work.budget.totalPrice;

// 2. Aumentos por Change Orders aprobados
const changeOrdersTotal = work.changeOrders
  .filter(co => co.status === 'approved')
  .reduce((sum, co) => {
    return sum + (parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0));
  }, 0);

// 3. Extras adicionales de Final Invoice (que NO están en C.O.)
const finalInvoiceExtras = work.finalInvoice?.subtotalExtras || 0;

// 4. Total esperado a cobrar
const expectedTotal = budgetTotal + changeOrdersTotal + finalInvoiceExtras;

// 5. Ya cobrado (Initial Payment + Final Invoice pagado)
const initialPayment = work.budget.paymentProofAmount || 0;
let totalCollected = initialPayment;

if (work.finalInvoice?.status === 'paid') {
  totalCollected += parseFloat(work.finalInvoice.finalAmountDue || 0);
}

// 6. Restante por cobrar
const remainingAmount = expectedTotal - totalCollected;
```

## ✅ Validaciones Necesarias

### Al Crear Change Order:
```javascript
// previousTotalPrice DEBE ser el total actual del contrato
if (!previousTotalPrice || previousTotalPrice === 0) {
  throw new Error('Previous Total Price debe ser el total del contrato actual');
}

// newTotalPrice DEBE ser mayor que previousTotalPrice
if (newTotalPrice <= previousTotalPrice) {
  throw new Error('New Total Price debe ser mayor (es un cargo extra)');
}

// La diferencia debe coincidir con el costo del item
const increase = newTotalPrice - previousTotalPrice;
if (Math.abs(increase - totalCost) > 0.01) {
  console.warn('Advertencia: El aumento no coincide con el costo del item');
}
```

## 🚨 Datos a Corregir en Producción

Buscar Change Orders con:
```sql
SELECT * FROM "ChangeOrders" 
WHERE status = 'approved' 
AND (
  "previousTotalPrice" = 0 
  OR "newTotalPrice" = 0
  OR "previousTotalPrice" IS NULL 
  OR "newTotalPrice" IS NULL
);
```

Para cada uno:
1. Obtener el Budget original → `previousTotalPrice`
2. Calcular `newTotalPrice` = `previousTotalPrice` + `totalCost`
3. Actualizar el Change Order

---

**Fecha**: 2025-11-08  
**Status**: ✅ Documentado - Listo para deploy a producción
