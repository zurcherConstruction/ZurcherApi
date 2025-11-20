# 🧪 Guía de Testing: Integración de Cuentas Bancarias

**Fecha:** 18 de Noviembre, 2025  
**Objetivo:** Verificar que todos los puntos de integración funcionan correctamente

---

## 📋 Pre-requisitos

### 1. Verificar que el servidor está corriendo
```bash
cd BackZurcher
npm run dev
```

### 2. Verificar que las cuentas existen
**URL:** `GET http://localhost:3001/api/bank-accounts`

**Cuentas esperadas:**
- ✅ Chase Bank ($0.00)
- ✅ Cap Trabajos Septic ($0.00)
- ✅ Capital Proyectos Septic ($0.00)
- ✅ Caja Chica ($0.00)

---

## 🧪 Tests de Integración

### Test 1: Income Directo (Upload Vouchers) 💰

**Pasos:**
1. Ir a **Upload Vouchers** (uploadVouchers)
2. Seleccionar **Income**
3. Llenar formulario:
   - Amount: `$1,000.00`
   - Type: `Comprobante Ingreso`
   - Payment Method: **`Chase Bank`**
   - Date: Hoy
   - Description: `Test deposito Chase`
4. Guardar

**Verificación:**
- ✅ Income creado exitosamente
- ✅ Mensaje en consola: `💰 Depósito auto-creado: Chase Bank +$1000.00 → Balance: $1000.00`
- ✅ Balance de Chase Bank ahora es `$1,000.00`
- ✅ Existe BankTransaction con:
  - `transactionType: 'deposit'`
  - `amount: 1000`
  - `relatedIncomeId: [UUID del Income]`

**Cómo verificar:**
```bash
# Ver transacciones de Chase Bank
GET http://localhost:3001/api/bank-accounts/1/transactions
```

---

### Test 2: Expense Directo (Upload Vouchers) 💸

**Pasos:**
1. Ir a **Upload Vouchers**
2. Seleccionar **Expense**
3. Llenar formulario:
   - Amount: `$500.00`
   - Type: `Materiales`
   - Payment Method: **`Chase Bank`**
   - Date: Hoy
   - Description: `Test retiro materiales`
4. Guardar

**Verificación:**
- ✅ Expense creado exitosamente
- ✅ Mensaje en consola: `💸 Retiro auto-creado: Chase Bank -$500.00 → Balance: $500.00`
- ✅ Balance de Chase Bank ahora es `$500.00` (1000 - 500)
- ✅ Existe BankTransaction con:
  - `transactionType: 'withdrawal'`
  - `amount: 500`
  - `relatedExpenseId: [UUID del Expense]`

---

### Test 3: Validación de Fondos Insuficientes ❌

**Pasos:**
1. Verificar balance actual de Chase Bank (debería ser $500 del test anterior)
2. Ir a **Upload Vouchers** → **Expense**
3. Intentar crear Expense:
   - Amount: `$10,000.00` (mayor que $500)
   - Type: `Materiales`
   - Payment Method: **`Chase Bank`**
   - Date: Hoy
4. Guardar

**Verificación:**
- ❌ Debe mostrar error: `"Fondos insuficientes en Chase Bank. Balance: $500.00, Retiro: $10000.00"`
- ✅ Expense NO se crea
- ✅ BankTransaction NO se crea
- ✅ Balance permanece en `$500.00`

**Consola debe mostrar:**
```
❌ Error creando transacción bancaria: Fondos insuficientes en Chase Bank...
```

---

### Test 4: Budget Approval Payment 📝

**Pasos:**
1. Crear un Budget normal
2. Esperar aprobación del cliente
3. Ir a **Aprobar Budget**
4. En el formulario de aprobación:
   - Payment Method: **`Efectivo`** (Caja Chica)
   - Initial Payment: `$2,000.00`
5. Aprobar

**Verificación:**
- ✅ Budget aprobado
- ✅ Work creado
- ✅ Income creado con `typeIncome: 'Factura Pago Inicial Budget'`
- ✅ Mensaje en consola: `💰 Depósito auto-creado: Caja Chica +$2000.00 → Balance: $2000.00`
- ✅ Balance de Caja Chica ahora es `$2,000.00`
- ✅ BankTransaction creada vinculada al Income

---

### Test 5: Final Invoice Payment (Receipt Upload) 📄

**Pasos:**
1. Tener un Work con FinalInvoice pendiente
2. Ir a **Receipts** → **Upload Receipt**
3. Subir comprobante de pago:
   - Payment Method: **`Cap Trabajos Septic`**
   - Amount: `$3,500.00`
   - Date: Hoy
4. Guardar

**Verificación:**
- ✅ Receipt creado
- ✅ Income creado con `typeIncome: 'Factura Pago Final Budget'`
- ✅ Mensaje en consola: `💰 Depósito auto-creado: Cap Trabajos Septic +$3500.00 → Balance: $3500.00`
- ✅ Balance de Cap Trabajos Septic ahora es `$3,500.00`
- ✅ BankTransaction creada

---

### Test 6: Fixed Expense Payment 🔧

**Pasos:**
1. Ir a **Fixed Expenses**
2. Marcar un FixedExpense como **Paid**
3. En el modal de pago:
   - Payment Method: **`Capital Proyectos Septic`**
   - Date: Hoy
4. Confirmar

**Verificación:**
- ✅ FixedExpense marcado como `isPaid: true`
- ✅ Expense creado automáticamente
- ✅ Mensaje en consola: `💸 Retiro auto-creado: Capital Proyectos Septic -$XXX.XX → Balance: $XXX.XX`
- ✅ Balance de Capital Proyectos Septic disminuye
- ✅ BankTransaction creada vinculada al Expense

---

### Test 7: Multiple Accounts Cash Flow 💼

**Pasos:**
1. Hacer 3 Income a diferentes cuentas:
   - Chase Bank: +$5,000
   - Efectivo: +$1,000
   - Cap Trabajos: +$2,500
2. Hacer 2 Expenses:
   - Chase Bank: -$1,200
   - Efectivo: -$300

**Verificación:**
- ✅ Balance Chase Bank: `$5,000 - $1,200 = $3,800`
- ✅ Balance Caja Chica: `$1,000 - $300 = $700`
- ✅ Balance Cap Trabajos: `$2,500`
- ✅ Total en cuentas: `$3,800 + $700 + $2,500 = $7,000`

**Dashboard debe mostrar:**
```
Chase Bank:              $3,800.00
Caja Chica:              $700.00
Cap Trabajos Septic:     $2,500.00
Capital Proyectos:       $0.00
─────────────────────────────────
TOTAL:                   $7,000.00
```

---

### Test 8: Stripe Payment (NO debe crear BankTransaction) 💳

**Pasos:**
1. Hacer pago de Budget vía Stripe (checkout)
2. Completar pago online
3. Webhook procesa el pago

**Verificación:**
- ✅ Income creado con `paymentMethod: 'Stripe'`
- ❌ BankTransaction NO se crea (correcto, Stripe es externo)
- ✅ Mensaje en consola: `⚠️ Cuenta bancaria no encontrada para: Stripe`
- ✅ Balances de cuentas NO cambian

---

## 📊 Dashboard de Verificación

### Endpoint para verificar todo:
```bash
GET http://localhost:3001/api/bank-accounts/dashboard
```

**Respuesta esperada:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": 1,
      "accountName": "Chase Bank",
      "currentBalance": "3800.00",
      "totalDeposits": "6000.00",
      "totalWithdrawals": "2200.00",
      "transactionCount": 5
    },
    {
      "id": 4,
      "accountName": "Caja Chica",
      "currentBalance": "700.00",
      "totalDeposits": "1000.00",
      "totalWithdrawals": "300.00",
      "transactionCount": 2
    },
    // ...
  ],
  "summary": {
    "totalBalance": "7000.00",
    "totalAccounts": 4,
    "activeAccounts": 4
  }
}
```

---

## 🔍 Cómo Verificar en Base de Datos

### Ver todas las transacciones:
```sql
SELECT 
  bt.id,
  bt.transactionType,
  bt.amount,
  bt.transactionDate,
  bt.description,
  ba.accountName,
  ba.currentBalance
FROM BankTransactions bt
JOIN BankAccounts ba ON bt.bankAccountId = ba.id
ORDER BY bt.transactionDate DESC;
```

### Ver balance por cuenta:
```sql
SELECT 
  accountName,
  currentBalance,
  (SELECT COUNT(*) FROM BankTransactions WHERE bankAccountId = ba.id) as transactionCount
FROM BankAccounts ba;
```

### Verificar integridad (balance = suma de transacciones):
```sql
SELECT 
  ba.accountName,
  ba.currentBalance,
  COALESCE(SUM(CASE WHEN bt.transactionType = 'deposit' THEN bt.amount ELSE 0 END), 0) as totalDeposits,
  COALESCE(SUM(CASE WHEN bt.transactionType = 'withdrawal' THEN bt.amount ELSE 0 END), 0) as totalWithdrawals,
  (
    COALESCE(SUM(CASE WHEN bt.transactionType = 'deposit' THEN bt.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN bt.transactionType = 'withdrawal' THEN bt.amount ELSE 0 END), 0)
  ) as calculatedBalance
FROM BankAccounts ba
LEFT JOIN BankTransactions bt ON ba.id = bt.bankAccountId
GROUP BY ba.id, ba.accountName, ba.currentBalance;
```

**Resultado esperado:** `currentBalance = calculatedBalance` para todas las cuentas

---

## 🐛 Troubleshooting

### Problema: Balance no coincide con transacciones
**Causa:** Posible transacción manual o error en rollback

**Solución:**
1. Revisar logs de consola (buscar 💰 💸 ❌)
2. Ejecutar query de integridad arriba
3. Si hay descuadre, revisar BankTransactions sin `relatedIncomeId` o `relatedExpenseId`

---

### Problema: No se crea BankTransaction pero Income/Expense sí
**Causa:** PaymentMethod no está en lista de cuentas

**Verificar:**
- Income/Expense tiene `paymentMethod: 'Chase Bank'` (exacto)
- No es 'chase bank' (case-sensitive)
- Revisar logs: `⚠️ Cuenta bancaria no encontrada...`

**Solución:**
- Usar valores EXACTOS del ENUM
- O agregar alias en `PAYMENT_METHOD_TO_ACCOUNT`

---

### Problema: Error "Fondos insuficientes" pero hay dinero
**Causa:** Balance desactualizado o transacción en proceso

**Solución:**
1. Refrescar balance de cuenta: `GET /api/bank-accounts/:id`
2. Verificar transacciones pendientes
3. Revisar logs del servidor

---

## ✅ Checklist de Validación

Marca cada item después de probarlo:

- [ ] **Test 1:** Income directo crea depósito ✅
- [ ] **Test 2:** Expense directo crea retiro ✅
- [ ] **Test 3:** Validación de fondos funciona ❌
- [ ] **Test 4:** Budget approval crea depósito ✅
- [ ] **Test 5:** Final invoice payment crea depósito ✅
- [ ] **Test 6:** Fixed expense payment crea retiro ✅
- [ ] **Test 7:** Múltiples cuentas funcionan correctamente ✅
- [ ] **Test 8:** Stripe NO crea transacción bancaria ✅
- [ ] **Dashboard:** Balances coinciden con suma de transacciones ✅

---

## 📝 Registro de Pruebas

### Template para documentar cada test:

```
TEST: [Nombre del test]
FECHA: [Fecha]
USUARIO: [Tu nombre]

ACCIONES:
1. [Paso 1]
2. [Paso 2]

RESULTADO:
✅ / ❌ [Descripción]

BALANCES:
- Chase Bank: $X,XXX.XX
- Caja Chica: $XXX.XX
- Cap Trabajos: $X,XXX.XX
- Capital Proyectos: $XXX.XX

NOTAS:
[Observaciones adicionales]
```

---

## 🚀 Después del Testing

Una vez validado todo:

1. ✅ **Documentar resultados** en este archivo
2. 🔄 **Commit de cambios** si hay fixes
3. 🏗️ **Continuar con:**
   - Integrar `supplierInvoiceController` (pago de tarjetas)
   - Frontend: Dashboard de cuentas
   - Frontend: Indicador de balance disponible en forms
   - Reportes: Cash flow por período

---

**Última actualización:** 18 de Noviembre, 2025  
**Estado:** 📋 LISTO PARA TESTING
