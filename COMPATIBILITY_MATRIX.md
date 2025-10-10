# 🔗 MATRIZ DE COMPATIBILIDAD - COMPONENTES FINANCIEROS

## 📌 Componentes Actuales que Generan/Usan Income/Expense/Receipt

| Componente Frontend | Backend Endpoint | Tablas Afectadas | Tipo de Operación | ¿Compatible con Nuevos Cambios? |
|---------------------|------------------|------------------|-------------------|----------------------------------|
| **UploadInitialPay.jsx** | `POST /budgets/:id/upload-invoice` | Budget, Income | Crea Income de pago inicial | ✅ SÍ - No usa Receipt tabla |
| **Summary.jsx** | `GET /balance/generalBalance` | Income, Expense, Receipt | Lee todos los movimientos | ✅ SÍ - Deduplicación agregada |
| **FixedExpensesManager.jsx** | `POST /fixed-expenses/:id/generate-expense` | FixedExpense, Expense | Crea Expense tipo "Gasto Fijo" | ✅ SÍ - Nuevo componente |
| **FinalInvoice Payment** | `POST /receipts` | FinalInvoice, Income, Receipt | Crea Income + Receipt | ✅ SÍ - Lógica revisada |
| **Expense con Inspección** | `POST /expenses` (con file) | Expense, Receipt | Crea Expense + Receipt automático | ✅ SÍ - Receipt type incluye tipos |

---

## 🔄 FLUJO DE DATOS: INCOME

### Entradas Posibles (Cómo se crea un Income)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FORMAS DE CREAR UN INCOME                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ PAGO INICIAL DE BUDGET                                      │
│     ├─ Frontend: UploadInitialPay.jsx                           │
│     ├─ Endpoint: POST /budgets/:id/upload-invoice               │
│     ├─ Backend: BudgetController.uploadInvoice                  │
│     └─ Resultado:                                                │
│        • Budget.paymentInvoice = Cloudinary URL                 │
│        • Budget.paymentProofAmount = monto                      │
│        • Income.typeIncome = 'Factura Pago Inicial Budget'      │
│        • Income.workId = del Budget                             │
│        • Receipt NO SE CREA (comprobante en Budget)             │
│                                                                  │
│  2️⃣ PAGO FINAL DE BUDGET (FinalInvoice)                         │
│     ├─ Frontend: Componente de FinalInvoice payment             │
│     ├─ Endpoint: POST /receipts (relatedModel='FinalInvoice')   │
│     ├─ Backend: ReceiptController.createReceipt                 │
│     └─ Resultado:                                                │
│        • FinalInvoice.totalAmountPaid += monto                  │
│        • FinalInvoice.status = 'partially_paid' o 'paid'        │
│        • Income.typeIncome = 'Factura Pago Final Budget'        │
│        • Income.workId = de la FinalInvoice                     │
│        • Receipt se crea asociado al Income (NO a FinalInvoice) │
│                                                                  │
│  3️⃣ INGRESO MANUAL (DiseñoDif, Comprobante Ingreso)             │
│     ├─ Frontend: Summary.jsx, formularios de creación           │
│     ├─ Endpoint: POST /incomes                                  │
│     ├─ Backend: incomeController.createIncome                   │
│     └─ Resultado:                                                │
│        • Income con tipo seleccionado manualmente               │
│        • Receipt opcional (si se sube archivo)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Salidas Posibles (Dónde se muestra)

```
┌─────────────────────────────────────────────────────────────────┐
│                 DÓNDE SE MUESTRAN LOS INCOMES                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Summary.jsx                                                  │
│     ├─ Fetch: GET /balance/generalBalance                       │
│     ├─ Muestra: TODOS los incomes (tabla completa)              │
│     ├─ Filters: Por fecha, tipo, staff, verificado              │
│     └─ Receipts: Mostrados inline (con merge manual)            │
│                                                                  │
│  📈 Dashboard.jsx                                                │
│     ├─ Fetch: GET /balance/generalBalance                       │
│     ├─ Muestra: Totales, gráficos por tipo                      │
│     └─ Grouping: Por typeIncome                                 │
│                                                                  │
│  🏗️ WorkDetails.jsx                                             │
│     ├─ Fetch: GET /balance/incomes-expenses/:workId             │
│     ├─ Muestra: Solo incomes de esa obra                        │
│     └─ Filters: Por workId                                      │
│                                                                  │
│  💰 AccountsReceivable.jsx                                       │
│     ├─ Fetch: GET /accounts-receivable                          │
│     ├─ Muestra: Incomes relacionados a facturas                 │
│     └─ Linking: Budget → FinalInvoice → Incomes                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE DATOS: EXPENSE

### Entradas Posibles (Cómo se crea un Expense)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FORMAS DE CREAR UN EXPENSE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ GASTO MANUAL (General)                                      │
│     ├─ Frontend: Summary.jsx, WorkDetails.jsx                   │
│     ├─ Endpoint: POST /expenses                                 │
│     ├─ Backend: expenseController.createExpense                 │
│     └─ Resultado:                                                │
│        • Expense con tipo seleccionado manualmente              │
│        • workId: puede ser NULL (gasto general) o UUID (obra)   │
│        • Receipt: opcional                                       │
│                                                                  │
│  2️⃣ GASTO DE INSPECCIÓN (Con Receipt Automático)                │
│     ├─ Frontend: InspectionForm.jsx (con file upload)           │
│     ├─ Endpoint: POST /expenses (con multer)                    │
│     ├─ Backend: expenseController.createExpense                 │
│     └─ Resultado:                                                │
│        • Expense.typeExpense = 'Inspección Inicial/Final'       │
│        • Receipt SE CREA automáticamente                        │
│        • Receipt.relatedModel = 'Expense'                       │
│        • Receipt.type = 'Inspección Inicial/Final'              │
│                                                                  │
│  3️⃣ GASTO GENERADO DESDE FIXED EXPENSE 🆕                       │
│     ├─ Frontend: FixedExpensesManager.jsx                       │
│     ├─ Endpoint: POST /fixed-expenses/:id/generate-expense      │
│     ├─ Backend: fixedExpenseController.generateExpenseFromFixed │
│     └─ Resultado:                                                │
│        • Expense.typeExpense = 'Gasto Fijo'                     │
│        • Expense.relatedFixedExpenseId = UUID del FixedExpense  │
│        • Expense.vendor = del FixedExpense                      │
│        • Expense.workId = NULL (gasto general, NO de obra)      │
│        • Receipt: NO se crea automáticamente                    │
│                                                                  │
│  4️⃣ GASTO DE COMISIÓN VENDEDOR                                  │
│     ├─ Frontend: BudgetController (auto-creación)               │
│     ├─ Endpoint: Interno (no API directa)                       │
│     ├─ Backend: BudgetController al crear Budget                │
│     └─ Resultado:                                                │
│        • Expense.typeExpense = 'Comisión Vendedor'              │
│        • Expense.workId = del Budget                            │
│        • Expense.amount = comisión calculada                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Salidas Posibles (Dónde se muestra)

```
┌─────────────────────────────────────────────────────────────────┐
│                 DÓNDE SE MUESTRAN LOS EXPENSES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Summary.jsx                                                  │
│     ├─ Fetch: GET /balance/generalBalance                       │
│     ├─ Muestra: TODOS los expenses (incluye Gastos Fijos)       │
│     ├─ Filters: Por fecha, tipo, staff, workId, verificado      │
│     ├─ Deduplicación: ✅ Implementada con Map                   │
│     └─ Types: Cargados dinámicamente desde /expense/types       │
│                                                                  │
│  🏗️ WorkDetails.jsx                                             │
│     ├─ Fetch: GET /balance/incomes-expenses/:workId             │
│     ├─ Muestra: Solo expenses de esa obra                       │
│     ├─ ⚠️ Gastos Fijos NO aparecen (workId es NULL)             │
│     └─ Filters: Por workId                                      │
│                                                                  │
│  💼 FixedExpensesManager.jsx 🆕                                  │
│     ├─ Fetch: GET /fixed-expenses (lista de plantillas)         │
│     ├─ Muestra: FixedExpenses + su estado isPaidThisPeriod      │
│     ├─ Linking: Muestra si ya se generó expense para período    │
│     └─ Action: Botón para generar Expense manual                │
│                                                                  │
│  📈 Dashboard.jsx                                                │
│     ├─ Fetch: GET /balance/generalBalance                       │
│     ├─ Muestra: Totales, gráficos por tipo                      │
│     └─ Grouping: Por typeExpense                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DE DATOS: RECEIPT

### Modelo Polimórfico

```
┌──────────────────────────────────────────────────────────────────┐
│                RECEIPT - RELACIÓN POLIMÓRFICA                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Receipt.relatedModel  │  Receipt.relatedId  │  Significado      │
│  ─────────────────────────────────────────────────────────────── │
│  'Income'              │  UUID de Income     │  Comprobante de   │
│                        │                     │  ingreso          │
│  ─────────────────────────────────────────────────────────────── │
│  'Expense'             │  UUID de Expense    │  Comprobante de   │
│                        │                     │  gasto            │
│  ─────────────────────────────────────────────────────────────── │
│  'FinalInvoice'        │  UUID FinalInvoice  │  ⚠️ DEPRECADO     │
│                        │                     │  Ahora se asocia  │
│                        │                     │  al Income creado │
│  ─────────────────────────────────────────────────────────────── │
│  'Inspection'          │  UUID Inspection    │  Foto/PDF de      │
│                        │                     │  inspección       │
│  ─────────────────────────────────────────────────────────────── │
│  'MaterialSet'         │  UUID MaterialSet   │  Factura de       │
│                        │                     │  materiales       │
│  ─────────────────────────────────────────────────────────────── │
│  'Work'                │  UUID Work          │  Documento del    │
│                        │                     │  trabajo          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Entradas (Cómo se crea un Receipt)

```
┌──────────────────────────────────────────────────────────────────┐
│                   FORMAS DE CREAR UN RECEIPT                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1️⃣ PAGO FINAL DE BUDGET (via ReceiptController)                │
│     ├─ Usuario sube archivo en modal de FinalInvoice payment     │
│     ├─ POST /receipts con relatedModel='FinalInvoice'            │
│     ├─ Backend CAMBIA relatedModel a 'Income'                    │
│     └─ Receipt.relatedId = ID del Income creado                  │
│                                                                   │
│  2️⃣ COMPROBANTE DE INSPECCIÓN (Auto-creado)                      │
│     ├─ Usuario crea Expense tipo 'Inspección' con archivo        │
│     ├─ POST /expenses (con multer)                               │
│     ├─ expenseController crea Receipt automáticamente            │
│     └─ Receipt.relatedModel = 'Expense'                          │
│                                                                   │
│  3️⃣ COMPROBANTE MANUAL (Desde Summary)                           │
│     ├─ Usuario edita un Income/Expense y agrega comprobante      │
│     ├─ POST /receipts con relatedModel='Income'/'Expense'        │
│     └─ Receipt se asocia al movimiento editado                   │
│                                                                   │
│  4️⃣ COMPROBANTE DE PAGO INICIAL                                  │
│     ├─ ⚠️ NO USA TABLA RECEIPT                                   │
│     ├─ Se guarda en Budget.paymentInvoice (Cloudinary URL)       │
│     └─ Summary lo muestra con merge manual                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Query Pattern (Cómo se obtienen)

```javascript
// Patrón usado en balanceController.getGeneralBalance

// 1. Obtener IDs de todos los Incomes
const incomeIds = allIncomes.map(income => income.idIncome);

// 2. Query separado para Receipts de Income
const incomeReceipts = await Receipt.findAll({
  where: {
    relatedModel: 'Income',
    relatedId: { [Op.in]: incomeIds.map(id => id.toString()) }
  }
});

// 3. Asociar manualmente a cada Income
const incomesWithReceipts = allIncomes.map(income => {
  const receipts = incomeReceipts.filter(receipt =>
    receipt.relatedId === income.idIncome.toString()
  );
  
  // Merge especial para pago inicial (desde Budget)
  if (income.typeIncome === 'Factura Pago Inicial Budget' && 
      income.work?.budget?.paymentInvoice) {
    receipts.push({
      idReceipt: `budget-${income.work.budget.idBudget}`,
      fileUrl: income.work.budget.paymentInvoice,
      source: 'budget' // Identificador especial
    });
  }
  
  return { ...income.toJSON(), Receipts: receipts };
});
```

**⚠️ IMPORTANTE**: NO se usa `include` de Sequelize porque la relación es polimórfica (relatedModel + relatedId string).

---

## 🔗 COMPATIBILIDAD CON COMPONENTES EXISTENTES

### ✅ UploadInitialPay.jsx - COMPATIBLE

**Flujo Actual**:
```
Usuario selecciona Budget → Sube PDF/imagen + monto
   ↓
POST /budgets/:id/upload-invoice
   ↓
Budget.paymentInvoice = Cloudinary URL
Income creado con typeIncome='Factura Pago Inicial Budget'
   ↓
Summary muestra Income con comprobante (merge desde Budget)
```

**Cambios Necesarios**: ❌ NINGUNO

**Verificación**:
- ✅ Income se crea correctamente
- ✅ Summary lo muestra (con merge de Budget.paymentInvoice)
- ✅ No interfiere con FixedExpenses ni nuevos campos

---

### ✅ Summary.jsx - COMPATIBLE (con mejoras)

**Flujo Actual**:
```
GET /balance/generalBalance
   ↓
Backend retorna: { list: { incomes, expenses } }
   ↓
Frontend combina en movements array
   ↓
Ahora usa Map para deduplicar ✅
   ↓
Muestra tabla con filtros
```

**Cambios Aplicados**:
- ✅ Deduplicación con Map (BUG 2 corregido)
- ✅ Tipos cargados dinámicamente desde backend
- ✅ "Gasto Fijo" incluido en expenseTypes

**Verificación**:
- ✅ No hay duplicados
- ✅ Gastos fijos se muestran correctamente
- ✅ Filtros funcionan con nuevos tipos

---

### ✅ FinalInvoice Payment - COMPATIBLE

**Flujo Actual**:
```
Usuario sube comprobante para FinalInvoice
   ↓
POST /receipts (relatedModel='FinalInvoice', amountPaid)
   ↓
ReceiptController:
  1. Actualiza FinalInvoice.totalAmountPaid
  2. Crea Income automáticamente
  3. Crea Receipt asociado al Income (NO a FinalInvoice)
   ↓
Summary muestra Income con Receipt
```

**Cambios Necesarios**: ❌ NINGUNO

**Verificación**:
- ✅ Income se crea con typeIncome='Factura Pago Final Budget'
- ✅ Receipt se asocia al Income
- ✅ FinalInvoice.status se actualiza correctamente
- ✅ Work.status cambia a 'paymentReceived' si FinalInvoice.status='paid'

---

### ⚠️ WorkDetails - INCOMPATIBLE PARCIAL

**Problema**:
```javascript
// WorkDetails hace query por workId
GET /balance/incomes-expenses/:workId

// Pero los Gastos Fijos tienen workId = NULL
// Por lo tanto, NO aparecen en el detalle de obras
```

**Solución Recomendada**:
```javascript
// Opción 1: Agregar toggle en WorkDetails
"Mostrar gastos generales de la empresa"
  ├─ Si está activado: Incluye expenses con workId=NULL
  └─ Si está desactivado: Solo expenses de esa obra

// Opción 2: Sección separada en WorkDetails
"Gastos Generales Relacionados"
  ├─ Muestra expenses con workId=NULL y category relevante
  └─ Ej: Si la obra usa combustible, mostrar gastos de Combustible
```

**Cambios Necesarios**:
- 🔧 Decidir si WorkDetails debe mostrar gastos generales o no
- 🔧 Si sí, modificar query para incluir `WHERE workId = :id OR workId IS NULL`

---

## 📊 TABLA RESUMEN: COMPATIBILIDAD

| Componente | Estado | Cambios Requeridos | Prioridad |
|------------|--------|-------------------|-----------|
| UploadInitialPay.jsx | ✅ Compatible | Ninguno | - |
| Summary.jsx | ✅ Compatible | ✅ Ya aplicados | - |
| FixedExpensesManager.jsx | ✅ Nuevo | N/A | - |
| FinalInvoice Payment | ✅ Compatible | Ninguno | - |
| WorkDetails.jsx | ⚠️ Parcial | Decidir si mostrar gastos generales | 🟡 Media |
| Dashboard.jsx | ✅ Compatible | Ninguno | - |
| AccountsReceivable.jsx | ✅ Compatible | Ninguno | - |
| BudgetController | ✅ Compatible | Ninguno | - |
| ReceiptController | ✅ Compatible | ✅ Ya funciona correctamente | - |
| expenseController | ✅ Compatible | ✅ Incluye "Gasto Fijo" en types | - |

---

## 🔧 ACCIONES PENDIENTES

### ALTA PRIORIDAD 🔴
1. ❌ **Implementar Auto-generación de FixedExpenses**
   - Cron job para expenses recurrentes
   - Cálculo automático de nextDueDate
   - Notificaciones al generar

2. ❌ **Decidir comportamiento de WorkDetails**
   - ¿Mostrar gastos generales (workId=NULL)?
   - ¿Agregar sección separada?

### MEDIA PRIORIDAD 🟠
3. ❌ **Unificar almacenamiento de Receipts**
   - Migrar Budget.paymentInvoice a tabla Receipt
   - Simplificar lógica de Summary

4. ⚠️ **Agregar Middleware de Autenticación**
   - fixedExpenseRoutes.js no tiene `isAuth`
   - Otras rutas pueden estar desprotegidas

### BAJA PRIORIDAD 🟢
5. ❌ **Testing**
   - Unit tests para calculatePeriodDates
   - Integration tests para flujos completos

6. ❌ **Documentación API**
   - Swagger para todos los endpoints
   - Diagramas de flujo actualizados

---

**FIN DE LA MATRIZ DE COMPATIBILIDAD**

*Actualizado: 9 de Octubre, 2025*
