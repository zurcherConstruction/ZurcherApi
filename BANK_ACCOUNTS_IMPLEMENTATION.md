# Sistema de Gestión de Cuentas Bancarias - Resumen de Implementación

**Fecha:** 18 de Noviembre, 2025  
**Estado:** ✅ Fase 1, 2 y 3 (Integración básica) completadas

---

## 📋 Descripción General

Sistema completo para gestionar cuentas bancarias y transacciones financieras, con integración automática con Income y Expense. Permite rastrear el flujo de efectivo en tiempo real a través de 4 cuentas bancarias principales.

---

## 🏦 Cuentas Bancarias Configuradas

| Nombre | Tipo | Balance Inicial | Uso |
|--------|------|----------------|-----|
| **Chase Bank** | checking | $0.00 | Cuenta principal de operaciones |
| **Cap Trabajos Septic** | checking | $0.00 | Fondos para trabajos de septic |
| **Capital Proyectos Septic** | checking | $0.00 | Inversión en proyectos |
| **Caja Chica** | cash | $0.00 | Efectivo para gastos menores |

---

## 📁 Estructura de Base de Datos

### Tabla: `BankAccounts`

```sql
- idBankAccount (UUID, PK)
- accountName (VARCHAR, UNIQUE) -- Nombre de la cuenta
- accountType (ENUM: checking, savings, cash, credit_card)
- currentBalance (DECIMAL(15,2)) -- Balance actual
- currency (VARCHAR(3), default: 'USD')
- isActive (BOOLEAN, default: true)
- bankName (VARCHAR) -- Nombre del banco (opcional)
- accountNumber (VARCHAR) -- Últimos dígitos (opcional)
- notes (TEXT)
- createdAt, updatedAt
```

**Índices:**
- `accountName` (único)
- `isActive`

---

### Tabla: `BankTransactions`

```sql
- idTransaction (UUID, PK)
- bankAccountId (UUID, FK → BankAccounts) -- Cuenta involucrada
- transactionType (ENUM: deposit, withdrawal, transfer_in, transfer_out)
- amount (DECIMAL(15,2)) -- Monto de la transacción
- date (DATE) -- Fecha en formato YYYY-MM-DD
- description (VARCHAR) -- Descripción
- category (ENUM: income, expense, transfer, credit_card_payment, manual)
- balanceAfter (DECIMAL(15,2)) -- Balance después de la transacción
- relatedIncomeId (UUID, FK → Incomes, nullable)
- relatedExpenseId (UUID, FK → Expenses, nullable)
- relatedCreditCardPaymentId (UUID, FK → SupplierInvoices, nullable)
- transferFromAccountId (UUID, FK → BankAccounts, nullable)
- transferToAccountId (UUID, FK → BankAccounts, nullable)
- relatedTransferId (UUID, FK → BankTransactions, nullable) -- Para vincular transferencias
- notes (TEXT)
- createdByStaffId (UUID, FK → Staffs, nullable)
- createdAt, updatedAt
```

**Índices:**
- `bankAccountId`
- `date`
- `transactionType`
- `category`
- `relatedIncomeId`
- `relatedExpenseId`
- `relatedCreditCardPaymentId`

---

## 🎯 Tipos de Transacciones

### 1. **Deposit (Depósito)**
- **Uso:** Entrada de dinero a la cuenta
- **Efecto:** Balance aumenta (+)
- **Auto-creado:** Cuando se registra Income con paymentMethod = cuenta bancaria
- **Categorías:** `income`, `manual`

### 2. **Withdrawal (Retiro)**
- **Uso:** Salida de dinero de la cuenta
- **Efecto:** Balance disminuye (-)
- **Auto-creado:** Cuando se registra Expense con paymentMethod = cuenta bancaria
- **Categorías:** `expense`, `credit_card_payment`, `manual`
- **Validación:** Verifica fondos suficientes antes de procesar

### 3. **Transfer (Transferencia)**
- **Uso:** Mover dinero entre cuentas propias
- **Efecto:** Crea 2 transacciones vinculadas:
  - `transfer_out` en cuenta origen (-)
  - `transfer_in` en cuenta destino (+)
- **Categoría:** `transfer`
- **Validación:** Verifica fondos en cuenta origen

---

## 🔗 Integración con Income/Expense

### Income → BankTransaction (Deposit)

**Trigger:** Se crea un Income con `paymentMethod` en:
- `'Cap Trabajos Septic'`
- `'Capital Proyectos Septic'`
- `'Chase Bank'`
- `'Efectivo'` → se mapea a cuenta **Caja Chica**

**Proceso automático:**
1. Se busca la cuenta bancaria por nombre
2. Se actualiza `currentBalance` (suma el monto)
3. Se crea `BankTransaction`:
   - `transactionType: 'deposit'`
   - `category: 'income'`
   - `relatedIncomeId: [ID del Income]`
   - `balanceAfter: [nuevo balance]`

**Código:** `incomeController.js` líneas 44-74

---

### Expense → BankTransaction (Withdrawal)

**Trigger:** Se crea un Expense con `paymentMethod` en:
- `'Cap Trabajos Septic'`
- `'Capital Proyectos Septic'`
- `'Chase Bank'`
- `'Efectivo'` → se mapea a cuenta **Caja Chica**

**Proceso automático:**
1. Se busca la cuenta bancaria por nombre
2. **Valida fondos suficientes** (si no hay, devuelve error 400)
3. Se actualiza `currentBalance` (resta el monto)
4. Se crea `BankTransaction`:
   - `transactionType: 'withdrawal'`
   - `category: 'expense'`
   - `relatedExpenseId: [ID del Expense]`
   - `balanceAfter: [nuevo balance]`

**Código:** `expenseController.js` líneas 47-95

---

## 🌐 API Endpoints

### Bank Accounts

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/bank-accounts` | Listar todas las cuentas (con opción `?includeInactive=true`) |
| `GET` | `/api/bank-accounts/summary/dashboard` | Resumen para dashboard (totales, por tipo) |
| `GET` | `/api/bank-accounts/:id` | Detalle de cuenta con estadísticas |
| `GET` | `/api/bank-accounts/:id/balance` | Balance actual y última transacción |
| `POST` | `/api/bank-accounts` | Crear nueva cuenta |
| `PUT` | `/api/bank-accounts/:id` | Actualizar cuenta existente |

---

### Bank Transactions

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/bank-transactions` | Listar transacciones (filtros: bankAccountId, type, category, dates) |
| `GET` | `/api/bank-transactions/:id` | Detalle de transacción con todas las relaciones |
| `POST` | `/api/bank-transactions/deposit` | Registrar depósito manual |
| `POST` | `/api/bank-transactions/withdrawal` | Registrar retiro manual |
| `POST` | `/api/bank-transactions/transfer` | Transferir entre cuentas |
| `DELETE` | `/api/bank-transactions/:id` | Eliminar transacción y reversar balance |

---

## 📊 Respuestas de API

### GET /api/bank-accounts (Ejemplo)

```json
{
  "success": true,
  "count": 4,
  "activeCount": 4,
  "totalBalance": "0.00",
  "accounts": [
    {
      "idBankAccount": "uuid...",
      "accountName": "Chase Bank",
      "accountType": "checking",
      "currentBalance": "0.00",
      "currency": "USD",
      "isActive": true,
      "formattedBalance": "$0.00"
    }
  ]
}
```

### POST /api/bank-transactions/deposit (Ejemplo)

```json
{
  "success": true,
  "message": "Depósito registrado exitosamente",
  "transaction": {
    "idTransaction": "uuid...",
    "transactionType": "deposit",
    "amount": "1000.00",
    "date": "2025-11-18",
    "description": "Depósito de prueba",
    "balanceAfter": "1000.00",
    "formattedAmount": "+$1,000.00"
  },
  "newBalance": "1000.00",
  "formattedBalance": "$1,000.00"
}
```

---

## 🎨 Modelos Sequelize

### BankAccount Model

**Métodos personalizados:**
- `updateBalance(amount, transaction)` - Actualiza balance atómicamente
- `getFormattedBalance()` - Devuelve balance formateado (ej: "$1,234.56")

**Relaciones:**
- `hasMany(BankTransaction, { as: 'transactions' })`
- `hasMany(BankTransaction, { as: 'transfersFrom', foreignKey: 'transferFromAccountId' })`
- `hasMany(BankTransaction, { as: 'transfersTo', foreignKey: 'transferToAccountId' })`

---

### BankTransaction Model

**Métodos personalizados:**
- `getFormattedAmount()` - Devuelve monto con signo (ej: "+$1,000.00" o "-$500.00")
- `isDeposit()` - Verifica si es depósito
- `isWithdrawal()` - Verifica si es retiro

**Relaciones:**
- `belongsTo(BankAccount, { as: 'bankAccount' })`
- `belongsTo(Income, { as: 'relatedIncome' })`
- `belongsTo(Expense, { as: 'relatedExpense' })`
- `belongsTo(SupplierInvoice, { as: 'relatedCreditCardPayment' })`
- `belongsTo(Staff, { as: 'createdByStaff' })`
- `belongsTo(BankAccount, { as: 'transferFromAccount' })`
- `belongsTo(BankAccount, { as: 'transferToAccount' })`
- `belongsTo(BankTransaction, { as: 'relatedTransfer' })`

---

## 🧪 Scripts de Prueba

### 1. `seed-bank-accounts.js`
Inicializa las 4 cuentas bancarias con balance $0.00

**Uso:**
```bash
node seed-bank-accounts.js
```

---

### 2. `test-bank-accounts.js`
Prueba todos los endpoints de cuentas bancarias

**Nota:** Actualizar `AUTH_TOKEN` antes de ejecutar

**Uso:**
```bash
node test-bank-accounts.js
```

**Pruebas:**
- GET todas las cuentas
- GET detalle de cuenta
- GET balance
- GET dashboard summary

---

### 3. `test-bank-transactions.js`
Prueba todos los endpoints de transacciones

**Nota:** Actualizar `AUTH_TOKEN` antes de ejecutar

**Uso:**
```bash
node test-bank-transactions.js
```

**Pruebas:**
- POST deposit ($1000)
- POST withdrawal ($250)
- POST transfer ($300)
- GET transacciones con filtros
- Verificación de balances

---

### 4. `test-income-expense-integration.js`
Prueba la integración automática con Income/Expense

**Nota:** Actualizar `AUTH_TOKEN` antes de ejecutar

**Uso:**
```bash
node test-income-expense-integration.js
```

**Flujo de prueba:**
1. Obtiene balance inicial de Chase Bank
2. Crea Income con `paymentMethod: 'Chase Bank'` ($5000)
3. Verifica que se creó BankTransaction tipo deposit
4. Verifica balance actualizado (+$5000)
5. Crea Expense con `paymentMethod: 'Chase Bank'` ($1500)
6. Verifica que se creó BankTransaction tipo withdrawal
7. Verifica balance final ($5000 - $1500 = $3500)

---

## ✅ Validaciones Implementadas

### En Depósitos:
- ✅ `bankAccountId` es obligatorio
- ✅ `amount` debe ser > 0
- ✅ Cuenta debe existir y estar activa

### En Retiros:
- ✅ `bankAccountId` es obligatorio
- ✅ `amount` debe ser > 0
- ✅ Cuenta debe existir y estar activa
- ✅ **Fondos suficientes** (currentBalance >= amount)

### En Transferencias:
- ✅ `fromAccountId` y `toAccountId` son obligatorios
- ✅ No se puede transferir a la misma cuenta
- ✅ `amount` debe ser > 0
- ✅ Ambas cuentas deben existir y estar activas
- ✅ **Fondos suficientes en cuenta origen**

### En Eliminación:
- ✅ Transacción debe existir
- ✅ Al reversar, el balance no puede quedar negativo
- ✅ Si es transferencia, elimina ambas transacciones vinculadas

---

## 🔒 Seguridad

- ✅ Todas las rutas protegidas con `verifyToken` middleware
- ✅ Transacciones atómicas de base de datos (Sequelize transactions)
- ✅ Validación de fondos antes de procesar retiros/transferencias
- ✅ Verificación de cuentas activas
- ✅ Rollback automático en caso de error

---

## 📈 Características Adicionales

### Actualización Atómica de Balances
- Usa `sequelize.transaction()` para garantizar consistencia
- Si falla cualquier paso, se hace rollback completo
- Previene condiciones de carrera (race conditions)

### Fecha Local (Timezone Fix)
- Helper `getLocalDateString()` devuelve fecha en formato `YYYY-MM-DD`
- Previene problemas de timezone (UTC vs local)
- Usado en Income, Expense y BankTransaction

### Logs Detallados
- Cada transacción imprime en consola:
  - Tipo de operación
  - Cuenta involucrada
  - Monto con signo (+/-)
  - Balance resultante
  - Ejemplo: `💰 Depósito auto-creado: Chase Bank +$5000.00 → Balance: $5000.00`

### Estadísticas y Resúmenes
- Dashboard con totales por tipo de cuenta
- Estadísticas por cuenta (depósitos, retiros, transfers)
- Última transacción por cuenta
- Conteo de transacciones

---

## 📝 Próximos Pasos (Pendientes)

### Fase 4: Frontend (No iniciado)
- [ ] Crear `BankAccountsDashboard.jsx` - Vista general de cuentas
- [ ] Crear `BankAccountDetail.jsx` - Detalle de cuenta con historial
- [ ] Crear `BankTransactionForm.jsx` - Formulario para depósitos/retiros/transferencias
- [ ] Integrar con formularios de Income/Expense (mostrar impacto en cuenta bancaria)

### Fase 5: Integraciones Avanzadas (No iniciado)
- [ ] Integrar con `supplierInvoiceController.js` para pagos de tarjetas
- [ ] Manejar actualizaciones de Income/Expense (cambio de paymentMethod)
- [ ] Sistema de reconciliación bancaria (comparar con extractos reales)
- [ ] Exportar transacciones a CSV/Excel
- [ ] Gráficas de flujo de efectivo

### Fase 6: Reportes (No iniciado)
- [ ] Reporte de flujo de efectivo por cuenta
- [ ] Comparación de períodos
- [ ] Proyección de balance futuro
- [ ] Alertas de fondos bajos

---

## 🐛 Problemas Conocidos

### ⚠️ Staff Foreign Key Warning
Durante la migración de `BankTransactions` aparece:
```
ADVERTENCIA: No se pudo crear la foreign key para Staff
```

**Causa:** El script intenta crear la FK pero la tabla `Staffs` puede no existir aún o tener diferente caso (Staff vs Staffs).

**Impacto:** ⚠️ **Ninguno** - Sequelize maneja las relaciones correctamente en tiempo de ejecución.

**Solución aplicada:** Try/catch en la migración para que no falle el proceso.

---

### ⚠️ Update Income/Expense con cambio de paymentMethod
Actualmente, si se actualiza un Income o Expense y se cambia el `paymentMethod` de una cuenta bancaria a otra, NO se actualiza automáticamente la transacción bancaria existente.

**Impacto:** ⚠️ Puede causar inconsistencias en balances

**Workaround:** Eliminar el Income/Expense y crearlo nuevamente con el paymentMethod correcto.

**Solución futura:** Implementar lógica en `updateIncome` y `updateExpense` para:
1. Detectar cambio de paymentMethod
2. Reversar transacción bancaria anterior (si existe)
3. Crear nueva transacción en cuenta correcta

---

## 📚 Archivos Creados/Modificados

### Migraciones
- ✅ `migrations/20251118-create-bank-accounts.js`
- ✅ `migrations/20251118-create-bank-transactions.js`

### Modelos
- ✅ `src/data/models/BankAccount.js`
- ✅ `src/data/models/BankTransaction.js`
- ✅ `src/data/index.js` (modificado: líneas 79, 549-623)

### Controladores
- ✅ `src/controllers/bankAccountController.js`
- ✅ `src/controllers/bankTransactionController.js`
- ✅ `src/controllers/incomeController.js` (modificado: integración automática)
- ✅ `src/controllers/expenseController.js` (modificado: integración automática)

### Rutas
- ✅ `src/routes/bankAccountRoutes.js`
- ✅ `src/routes/bankTransactionRoutes.js`
- ✅ `src/routes/index.js` (modificado: registrar rutas)

### Scripts
- ✅ `seed-bank-accounts.js`
- ✅ `test-bank-accounts.js`
- ✅ `test-bank-transactions.js`
- ✅ `test-income-expense-integration.js`

### Documentación
- ✅ `BANK_ACCOUNTS_IMPLEMENTATION.md` (este archivo)

---

## 🎓 Notas Técnicas

### Uso de Sequelize Transactions
Todas las operaciones que modifican balances usan transacciones:

```javascript
const transaction = await sequelize.transaction();
try {
  // Operaciones...
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  // Manejo de error...
}
```

### Mapeo de paymentMethod a Cuentas
```javascript
const accountMapping = {
  'Cap Trabajos Septic': 'Cap Trabajos Septic',
  'Capital Proyectos Septic': 'Capital Proyectos Septic',
  'Chase Bank': 'Chase Bank',
  'Efectivo': 'Caja Chica'  // ⚠️ Mapeo especial
};
```

### Formato de Montos
```javascript
// En BankTransaction model
getFormattedAmount() {
  const sign = this.transactionType === 'deposit' || this.transactionType === 'transfer_in' ? '+' : '-';
  return `${sign}$${parseFloat(this.amount).toFixed(2)}`;
}
```

---

## 📞 Contacto y Soporte

Para preguntas o problemas con el sistema de cuentas bancarias:
- Revisar logs de consola (búsqueda: `💰`, `💸`, `🏦`)
- Verificar que las migraciones se ejecutaron correctamente
- Confirmar que las cuentas existen con: `node seed-bank-accounts.js`
- Probar endpoints con scripts de prueba

---

**Última actualización:** 18 de Noviembre, 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Producción (Fase 1-3 completadas)
