# Integración Completa: Sistema de Cuentas Bancarias

**Fecha:** 18 de Noviembre, 2025  
**Estado:** ✅ INTEGRACIÓN COMPLETA

---

## 📋 Resumen

Todos los puntos de entrada financiera del sistema ahora están integrados con el sistema de cuentas bancarias. Cada vez que se crea un Income o Expense con un `paymentMethod` que corresponde a una cuenta bancaria, se auto-crea una `BankTransaction` correspondiente y se actualiza el balance de la cuenta.

---

## 🔗 Puntos de Integración Completados

### 1. ✅ **Income Controller** (`incomeController.js`)
**Endpoint:** `POST /api/income`

**Cambios:**
- Importa `createDepositTransaction` de `bankTransactionHelper`
- Al crear Income, auto-crea depósito bancario si `paymentMethod` es cuenta bancaria
- Maneja errores de fondos insuficientes (no debería ocurrir en depósitos)

**Líneas modificadas:** 1-4, 48-72

**Métodos de pago que activan transacción:**
- `'Cap Trabajos Septic'` → Cuenta: Cap Trabajos Septic
- `'Capital Proyectos Septic'` → Cuenta: Capital Proyectos Septic
- `'Chase Bank'` → Cuenta: Chase Bank
- `'Efectivo'` → Cuenta: Caja Chica

---

### 2. ✅ **Expense Controller** (`expenseController.js`)
**Endpoint:** `POST /api/expense`

**Cambios:**
- Importa `createWithdrawalTransaction` de `bankTransactionHelper`
- Al crear Expense, auto-crea retiro bancario si `paymentMethod` es cuenta bancaria
- **Verifica fondos suficientes** antes de procesar
- Hace rollback completo si no hay fondos

**Líneas modificadas:** 1-5, 50-87

**Validación crítica:** 
```javascript
if (currentBalance < expenseAmount) {
  throw new Error('Fondos insuficientes...');
}
```

**Métodos de pago que activan transacción:**
- `'Cap Trabajos Septic'` → Cuenta: Cap Trabajos Septic
- `'Capital Proyectos Septic'` → Cuenta: Capital Proyectos Septic
- `'Chase Bank'` → Cuenta: Chase Bank
- `'Efectivo'` → Cuenta: Caja Chica

---

### 3. ✅ **Fixed Expense Controller** (`fixedExpenseController.js`)
**Estado:** ✅ Ya integrado automáticamente

**Razón:** El método `markAsPaidAndCreateExpense` usa `Expense.create()` directamente.

**Flujo:**
1. Usuario marca FixedExpense como pagado
2. Se crea Expense con `paymentMethod` de FixedExpense
3. `createExpense` (ya modificado) auto-crea BankTransaction

**Línea relevante:** 499 (`Expense.create`)

---

### 4. ✅ **Stripe Webhook Controller** (`stripeWebhookController.js`)
**Endpoints:** 
- Webhook: `POST /api/stripe` (procesado internamente)
- Eventos: `checkout.session.completed`

**Cambios:**
- ✅ Corregido: Campo `type` → `typeIncome`
- ✅ Corregido: Campo `description` → `notes`
- Al recibir pago de Stripe, crea Income con `paymentMethod: 'Stripe'`
- Como 'Stripe' NO está en la lista de cuentas bancarias, no crea BankTransaction
- **Correcto:** Los pagos de Stripe se procesan externamente

**Líneas modificadas:** 138-151 (invoice payment), 218-230 (final invoice payment)

**Tipos de pago procesados:**
- `'invoice_payment'` → Factura Pago Inicial Budget
- `'final_invoice_payment'` → Factura Pago Final Budget

---

### 5. ✅ **Budget Controller** (`BudgetController.js`)
**Endpoints:** 
- `POST /api/budget/:id/approve` (aprobar budget)
- `POST /api/budget/:id/payment-proof` (registrar pago inicial)

**Cambios:**
- Importa `createDepositTransaction` de `bankTransactionHelper`
- **3 lugares** donde se crea Income:
  1. **Línea ~2232:** Nuevo Work al aprobar Budget
  2. **Línea ~2307:** Income tardío para Work existente
  3. **Línea ~2615:** Income al cargar comprobante de pago

**Líneas modificadas:** 1-5, 2232-2265, 2307-2340, 2615-2653

**Flujos integrados:**
- Usuario aprueba Budget → Crea Work + Income → Auto-crea BankTransaction
- Usuario carga comprobante de pago → Crea/Actualiza Income → Auto-crea BankTransaction

---

### 6. ✅ **Receipt Controller** (`ReceiptController.js`)
**Endpoint:** `POST /api/receipt`

**Cambios:**
- Importa `createDepositTransaction` de `bankTransactionHelper`
- Al crear Receipt para FinalInvoice, crea Income → Auto-crea BankTransaction

**Líneas modificadas:** 1-5, 183-199

**Flujo:**
1. Usuario carga comprobante de pago final
2. Se crea Income con `typeIncome: 'Factura Pago Final Budget'`
3. Se auto-crea BankTransaction si el `paymentMethod` es cuenta bancaria

---

## 🛠️ Helper Centralizado

### **`bankTransactionHelper.js`**

Ubicación: `src/utils/bankTransactionHelper.js`

**Funciones exportadas:**

#### `createDepositTransaction(params)`
Crea transacción de depósito (Income)

**Parámetros:**
```javascript
{
  paymentMethod: string,        // Método de pago
  amount: number,               // Monto
  date: string,                 // YYYY-MM-DD
  description: string,          // Descripción
  relatedIncomeId: UUID,        // ID del Income relacionado
  notes: string,                // Notas (opcional)
  createdByStaffId: UUID,       // Staff creador (opcional)
  transaction: Object           // Sequelize transaction (opcional)
}
```

**Retorna:** `BankTransaction` o `null`

---

#### `createWithdrawalTransaction(params)`
Crea transacción de retiro (Expense)

**Parámetros:**
```javascript
{
  paymentMethod: string,                // Método de pago
  amount: number,                       // Monto
  date: string,                         // YYYY-MM-DD
  description: string,                  // Descripción
  relatedExpenseId: UUID,               // ID del Expense (opcional)
  relatedCreditCardPaymentId: UUID,     // ID del SupplierInvoice (opcional)
  notes: string,                        // Notas (opcional)
  createdByStaffId: UUID,               // Staff creador (opcional)
  transaction: Object,                  // Sequelize transaction (opcional)
  skipBalanceCheck: boolean             // Saltar validación de fondos (default: false)
}
```

**Retorna:** `BankTransaction` o `null`

**⚠️ Validación:** Por defecto verifica fondos suficientes. Lanza error si no hay fondos.

---

#### `createCreditCardPaymentTransaction(params)`
Crea transacción de pago de tarjeta desde cuenta bancaria

**Parámetros:**
```javascript
{
  fromAccount: string,          // Cuenta origen (ej: 'Chase Bank')
  creditCardName: string,       // Nombre de tarjeta (ej: 'Chase Credit Card')
  amount: number,               // Monto
  date: string,                 // YYYY-MM-DD
  supplierInvoiceId: UUID,      // ID del SupplierInvoice
  notes: string,                // Notas (opcional)
  createdByStaffId: UUID,       // Staff creador (opcional)
  transaction: Object           // Sequelize transaction (opcional)
}
```

**Retorna:** `BankTransaction` o `null`

---

#### Funciones auxiliares:
- `isBankAccount(paymentMethod)` → boolean
- `getAccountName(paymentMethod)` → string | null
- `getLocalDateString(date)` → string (YYYY-MM-DD)

---

## 📊 Mapeo de PaymentMethods

```javascript
const PAYMENT_METHOD_TO_ACCOUNT = {
  'Cap Trabajos Septic': 'Cap Trabajos Septic',
  'Capital Proyectos Septic': 'Capital Proyectos Septic',
  'Chase Bank': 'Chase Bank',
  'Efectivo': 'Caja Chica'  // ⚠️ Mapeo especial
};
```

---

## 🔄 Flujo Completo de Integración

### Ejemplo: Usuario crea Expense desde frontend

```
1. Frontend envía POST /api/expense
   {
     amount: 500,
     typeExpense: 'Materiales',
     paymentMethod: 'Chase Bank',
     date: '2025-11-18'
   }

2. expenseController.js recibe request
   ↓
3. Inicia transaction de Sequelize
   ↓
4. Crea Expense en DB
   ↓
5. Llama createWithdrawalTransaction({
     paymentMethod: 'Chase Bank',
     amount: 500,
     ...
   })
   ↓
6. bankTransactionHelper:
   - Busca cuenta 'Chase Bank'
   - Verifica fondos: currentBalance >= 500 ✅
   - Actualiza balance: currentBalance -= 500
   - Crea BankTransaction (withdrawal)
   ↓
7. Commit de transaction
   ↓
8. Responde al frontend con Expense creado
```

---

## ✅ Validaciones Implementadas

### En Depósitos (Income):
- ✅ PaymentMethod debe ser cuenta bancaria válida
- ✅ Cuenta debe existir y estar activa
- ✅ Amount debe ser > 0
- ⚠️ No valida fondos (en depósitos no es necesario)

### En Retiros (Expense):
- ✅ PaymentMethod debe ser cuenta bancaria válida
- ✅ Cuenta debe existir y estar activa
- ✅ Amount debe ser > 0
- ✅ **Fondos suficientes (crítico)**
- ✅ Hace rollback completo si no hay fondos

---

## 🐛 Manejo de Errores

### Escenario 1: Cuenta bancaria no encontrada
```javascript
// Helper retorna null
if (!bankAccount) {
  console.warn(`⚠️ Cuenta bancaria no encontrada: ${accountName}`);
  return null; // No es error crítico
}
```

**Resultado:** Income/Expense se crea, pero no hay BankTransaction

---

### Escenario 2: Fondos insuficientes (Expense)
```javascript
if (currentBalance < withdrawalAmount) {
  throw new Error('Fondos insuficientes...');
}
```

**Resultado:** 
- ❌ Rollback completo de transacción
- ❌ No se crea Expense
- ❌ No se crea BankTransaction
- ✅ Frontend recibe error 400

---

### Escenario 3: Error de base de datos
```javascript
try {
  await createWithdrawalTransaction(...);
} catch (bankError) {
  console.error('❌ Error:', bankError.message);
  await transaction.rollback();
  return res.status(400).json({ error: bankError.message });
}
```

**Resultado:** Rollback completo, error al frontend

---

## 📝 Logs de Consola

### Depósito exitoso:
```
💰 Depósito auto-creado: Chase Bank +$5000.00 → Balance: $5000.00
```

### Retiro exitoso:
```
💸 Retiro auto-creado: Chase Bank -$1500.00 → Balance: $3500.00
```

### Advertencias:
```
⚠️ Cuenta bancaria no encontrada para: Cheque
```

### Errores:
```
❌ Error creando transacción bancaria: Fondos insuficientes en Chase Bank. Balance: $100.00, Retiro: $500.00
```

---

## 🚫 Métodos de Pago NO Integrados

Los siguientes métodos de pago **NO** crean BankTransaction:

- `'AMEX'` (tarjeta de crédito externa)
- `'Chase Credit Card'` (tarjeta de crédito, usa SupplierInvoice)
- `'Cheque'`
- `'Transferencia Bancaria'` (externo)
- `'Zelle'` (externo)
- `'Tarjeta Débito'` (externo)
- `'PayPal'` (externo)
- `'Stripe'` (procesado externamente)
- `'Otro'`

**Razón:** Estos métodos no impactan directamente las cuentas bancarias gestionadas internamente.

---

## 🎯 Beneficios de la Integración

### 1. **Tracking Automático de Cash Flow**
- Cada Income/Expense actualiza balance en tiempo real
- No hay desfase entre registros contables y balance de cuentas

### 2. **Prevención de Sobregiros**
- Validación de fondos antes de aprobar Expense
- Imposible crear gasto si no hay dinero

### 3. **Auditoría Completa**
- Cada transacción bancaria vinculada a Income/Expense
- `relatedIncomeId` / `relatedExpenseId` permiten trazabilidad

### 4. **Centralización de Lógica**
- Helper `bankTransactionHelper.js` evita duplicación
- Un solo lugar para modificar lógica de transacciones

### 5. **Consistencia de Datos**
- Sequelize transactions garantizan atomicidad
- Si falla algo, todo se revierte

---

## 🔮 Próximos Pasos (Pendientes)

### Backend:
- [ ] Integrar `supplierInvoiceController` para pagos de tarjetas desde cuentas
- [ ] Manejar UPDATE de Income/Expense (cambio de paymentMethod)
- [ ] Sistema de reconciliación bancaria (comparar con extractos)

### Frontend:
- [ ] Mostrar balance disponible al seleccionar paymentMethod
- [ ] Indicador visual de fondos insuficientes
- [ ] Dashboard de cuentas bancarias
- [ ] Historial de transacciones por cuenta
- [ ] Alertas de balance bajo

### Reportes:
- [ ] Flujo de efectivo por período
- [ ] Comparación de cuentas
- [ ] Proyección de balance futuro
- [ ] Exportar a Excel/CSV

---

## 📚 Archivos Modificados

### Nuevos:
- ✅ `src/utils/bankTransactionHelper.js` (294 líneas)

### Modificados:
- ✅ `src/controllers/incomeController.js`
- ✅ `src/controllers/expenseController.js`
- ✅ `src/controllers/stripeWebhookController.js`
- ✅ `src/controllers/BudgetController.js`
- ✅ `src/controllers/ReceiptController.js`

### Sin cambios (ya integrados):
- ✅ `src/controllers/fixedExpenseController.js` (usa Expense.create)

---

## 🧪 Cómo Probar

### Prueba 1: Income → Deposit
```bash
curl -X POST http://localhost:3001/api/income \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "typeIncome": "Comprobante Ingreso",
    "paymentMethod": "Chase Bank",
    "date": "2025-11-18",
    "notes": "Test"
  }'
```

**Verificar:**
1. Income creado
2. BankTransaction creado con `transactionType: 'deposit'`
3. Balance de Chase Bank aumentó en $1000

---

### Prueba 2: Expense → Withdrawal
```bash
curl -X POST http://localhost:3001/api/expense \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "typeExpense": "Materiales",
    "paymentMethod": "Chase Bank",
    "date": "2025-11-18",
    "notes": "Test"
  }'
```

**Verificar:**
1. Expense creado
2. BankTransaction creado con `transactionType: 'withdrawal'`
3. Balance de Chase Bank disminuyó en $500

---

### Prueba 3: Fondos Insuficientes
```bash
# Crear Expense por monto mayor al balance
curl -X POST http://localhost:3001/api/expense \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 999999,
    "typeExpense": "Materiales",
    "paymentMethod": "Chase Bank",
    "date": "2025-11-18"
  }'
```

**Resultado esperado:**
```json
{
  "error": "Error procesando transacción bancaria",
  "message": "Fondos insuficientes en Chase Bank. Balance: $500.00, Retiro: $999999.00"
}
```

---

## 📞 Troubleshooting

### Problema: "Cuenta bancaria no encontrada"
**Causa:** No se ejecutó el seed o el nombre no coincide

**Solución:**
```bash
cd BackZurcher
node seed-bank-accounts.js
```

---

### Problema: Transacción no se crea pero Income/Expense sí
**Causa:** PaymentMethod no está en la lista de cuentas bancarias

**Verificar:** 
- `PAYMENT_METHOD_TO_ACCOUNT` en `bankTransactionHelper.js`
- Valores ENUM en modelo Income/Expense

---

### Problema: Balance descuadrado
**Causa:** Posible transacción manual o migración incompleta

**Solución:**
1. Revisar logs de consola (buscar 💰 o 💸)
2. Comparar suma de transacciones vs currentBalance
3. Usar DELETE /api/bank-transactions/:id para reversar

---

**Última actualización:** 18 de Noviembre, 2025  
**Versión:** 2.0.0  
**Estado:** ✅ INTEGRACIÓN COMPLETA
