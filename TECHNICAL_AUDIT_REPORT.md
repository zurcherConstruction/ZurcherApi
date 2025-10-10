# 📊 REPORTE TÉCNICO COMPLETO - SISTEMA FINANCIERO ZURCHER API
**Fecha**: 9 de Octubre, 2025  
**Autor**: Auditoría Técnica Automatizada  
**Versión**: 1.0

---

## 🎯 RESUMEN EJECUTIVO

El sistema gestiona **4 tablas principales** para el tracking financiero:
1. **Income** (Ingresos)
2. **Expense** (Gastos)
3. **FixedExpense** (Gastos Fijos Recurrentes)
4. **Receipt** (Comprobantes/Vouchers)

**Estado General**: ✅ **Sistema funcional con nuevas features integradas**

**Cambios Recientes**:
- ✅ Tabla `FixedExpense` creada y funcionando
- ✅ Campo `relatedFixedExpenseId` agregado a `Expense`
- ✅ Campo `vendor` agregado a `Expense`
- ✅ ENUM `paymentMethod` sincronizado (12 valores)
- ✅ Receipt type incluye "Gasto Fijo"

---

## 📋 TABLA 1: INCOME (Ingresos)

### Estructura de Datos
```javascript
{
  idIncome: UUID (PK),
  staffId: UUID (FK → Staffs),
  date: DATEONLY,
  amount: DECIMAL,
  typeIncome: ENUM [
    'Factura Pago Inicial Budget',
    'Factura Pago Final Budget',
    'DiseñoDif',
    'Comprobante Ingreso'
  ],
  notes: STRING,
  workId: UUID (FK → Work),
  paymentMethod: ENUM (12 valores),
  paymentDetails: STRING,
  verified: BOOLEAN (default: false)
}
```

### Relaciones
- **Staff** (1:N) - Un staff puede tener múltiples ingresos
- **Work** (1:N) - Una obra puede tener múltiples ingresos
- **Receipt** (1:N polimórfica) - Un ingreso puede tener múltiples comprobantes

### Flujos de Creación

#### FLUJO 1: Pago Inicial de Budget
**Componente**: `UploadInitialPay.jsx`  
**Endpoint**: `POST /budgets/:id/upload-invoice`  
**Proceso**:
```mermaid
1. Usuario selecciona Budget → 2. Sube PDF/imagen + monto
3. BudgetController actualiza Budget.paymentInvoice
4. BudgetController crea Income automáticamente:
   - typeIncome: 'Factura Pago Inicial Budget'
   - amount: monto del comprobante
   - workId: del Budget
   - staffId: del Work asociado
5. Receipt NO se crea aquí (el comprobante se guarda en Budget)
```

**Código Relevante**:
```javascript
// BudgetController.js - uploadInvoice
const newIncome = await Income.create({
  amount: paymentProofAmount,
  date: new Date(),
  workId: budget.Work?.idWork,
  typeIncome: 'Factura Pago Inicial Budget',
  notes: `Pago inicial para Budget ID: ${budget.idBudget}`,
  staffId: budget.Work?.staffId,
  paymentMethod: paymentMethod || 'Sin especificar',
  verified: false
});
```

**⚠️ IMPORTANTE**: El comprobante se almacena en `Budget.paymentInvoice` (Cloudinary URL), NO en la tabla `Receipt`.

#### FLUJO 2: Pago Final de Budget (FinalInvoice)
**Componente**: `UploadInitialPay.jsx` (reutilizado)  
**Endpoint**: `POST /receipts` con `relatedModel: 'FinalInvoice'`  
**Proceso**:
```mermaid
1. Usuario selecciona FinalInvoice → 2. Sube comprobante + monto
3. ReceiptController:
   a. Sube archivo a Cloudinary
   b. Actualiza FinalInvoice.totalAmountPaid
   c. Cambia FinalInvoice.status ('partially_paid' o 'paid')
   d. Crea Income automáticamente:
      - typeIncome: 'Factura Pago Final Budget'
      - amount: monto del pago
      - workId: de la FinalInvoice
   e. Crea Receipt asociado al Income (NO a FinalInvoice)
   f. Si FinalInvoice.status == 'paid' → Work.status = 'paymentReceived'
4. Envía notificación de ingreso registrado
```

**Código Relevante**:
```javascript
// ReceiptController.js - createReceipt (líneas 120-165)
const incomeDataForFinalInvoice = {
  amount: numericAmountPaidForIncome,
  date: finalInvoiceInstanceForUpdate.paymentDate || new Date(),
  workId: finalInvoiceInstanceForUpdate.workId,
  typeIncome: 'Factura Pago Final Budget',
  notes: `Pago para Factura Final ID: ${finalInvoiceInstanceForUpdate.id}.`,
  staffId: req.user?.id || null,
  paymentMethod: req.body.paymentMethod || 'Sin especificar',
  verified: false
};

const createdIncome = await Income.create(incomeDataForFinalInvoice, { transaction });
createdIncomeId = createdIncome.idIncome;

// El Receipt se crea asociado al Income, NO a FinalInvoice
const newReceiptData = {
  relatedModel: 'Income', // ✅ Cambiado de 'FinalInvoice'
  relatedId: createdIncomeId,
  type,
  notes,
  fileUrl: result.secure_url,
  publicId: result.public_id,
  mimeType: req.file.mimetype,
  originalName: req.file.originalname,
};
```

**🔍 INSIGHT CRÍTICO**: Aunque el usuario sube un comprobante "para la FinalInvoice", el sistema:
1. Crea un **Income** con typeIncome = 'Factura Pago Final Budget'
2. Asocia el **Receipt** al Income (NO a FinalInvoice directamente)
3. La FinalInvoice solo mantiene metadata en `totalAmountPaid` y `paymentNotes`

#### FLUJO 3: Otros Ingresos (DiseñoDif, Comprobante Ingreso)
**Componente**: `Summary.jsx` o módulos de creación manual  
**Endpoint**: `POST /incomes`  
**Proceso**: Creación directa, sin lógica especial.

### Queries Principales
```javascript
// balanceController.js - getGeneralBalance
const allIncomes = await Income.findAll({
  where: incomeWhere,
  order: [['date', 'DESC']],
  include: [
    { model: Staff, as: 'Staff' },
    { 
      model: Work, 
      as: 'work',
      include: [
        { model: Budget, as: 'budget' },
        { model: FinalInvoice, as: 'finalInvoice' }
      ]
    }
  ]
});

// Luego obtiene Receipts por separado y los asocia manualmente
const incomeReceipts = await Receipt.findAll({
  where: {
    relatedModel: 'Income',
    relatedId: { [Op.in]: incomeIds.map(id => id.toString()) }
  }
});
```

---

## 📋 TABLA 2: EXPENSE (Gastos)

### Estructura de Datos
```javascript
{
  idExpense: UUID (PK),
  date: DATEONLY,
  amount: DECIMAL,
  staffId: UUID (FK → Staffs),
  typeExpense: ENUM [
    'Materiales',
    'Diseño',
    'Workers',
    'Imprevistos',
    'Comprobante Gasto',
    'Gastos Generales',
    'Materiales Iniciales',
    'Inspección Inicial',
    'Inspección Final',
    'Comisión Vendedor',
    'Gasto Fijo' // 🆕 NUEVO
  ],
  notes: STRING,
  workId: UUID (FK → Work),
  paymentMethod: ENUM (12 valores),
  paymentDetails: STRING,
  verified: BOOLEAN (default: false),
  relatedFixedExpenseId: UUID (FK → FixedExpenses), // 🆕 NUEVO
  vendor: STRING // 🆕 NUEVO
}
```

### Relaciones
- **Staff** (1:N)
- **Work** (1:N)
- **Receipt** (1:N polimórfica)
- **FixedExpense** (1:N) - 🆕 Un gasto fijo puede generar múltiples expenses

### Flujos de Creación

#### FLUJO 1: Gasto Manual (Directo)
**Componente**: `Summary.jsx`, `WorkDetails.jsx`  
**Endpoint**: `POST /expenses`  
**Proceso**: Creación estándar con todos los campos requeridos.

#### FLUJO 2: Gasto desde FixedExpense (Auto-generado)
**Componente**: `FixedExpensesManager.jsx`  
**Endpoint**: `POST /fixed-expenses/:id/generate-expense`  
**Proceso**:
```mermaid
1. Usuario hace clic en "Generar Gasto" para un FixedExpense
2. fixedExpenseController.generateExpenseFromFixed:
   a. Valida que el gasto fijo esté activo
   b. Verifica que NO exista ya un gasto para el período actual
   c. Crea Expense:
      - amount: del FixedExpense.amount
      - typeExpense: 'Gasto Fijo'
      - relatedFixedExpenseId: del FixedExpense.idFixedExpense
      - vendor: del FixedExpense.vendor
      - paymentMethod: del FixedExpense.paymentMethod
      - staffId: del FixedExpense.createdByStaffId
      - date: hoy o la fecha especificada
   d. Retorna el expense creado con isPaidThisPeriod: true
```

**Código Relevante**:
```javascript
// fixedExpenseController.js - generateExpenseFromFixed (líneas 193-242)
const newExpense = await Expense.create({
  date: paymentDate || new Date(),
  amount: fixedExpense.amount,
  typeExpense: 'Gasto Fijo',
  notes: notes || `Gasto automático: ${fixedExpense.name} - ${fixedExpense.category}`,
  staffId: fixedExpense.createdByStaffId,
  paymentMethod: fixedExpense.paymentMethod,
  paymentDetails: fixedExpense.paymentAccount,
  verified: false,
  relatedFixedExpenseId: fixedExpense.idFixedExpense,
  vendor: fixedExpense.vendor,
  workId: null // Los gastos fijos NO están asociados a una obra específica
});
```

**⚠️ CAMPO CRÍTICO**: `workId` es **NULL** para gastos fijos porque son gastos generales de la empresa, no de una obra específica.

#### FLUJO 3: Gastos de Inspección (con Receipt automático)
**Endpoint**: `POST /expenses` (con req.file)  
**Proceso**:
```javascript
// expenseController.js - createExpense (líneas 31-48)
if ((typeExpense === 'Inspección Inicial' || typeExpense === 'Inspección Final') && req.file) {
  // Sube a Cloudinary y crea Receipt automáticamente
  const createdReceipt = await Receipt.create({
    relatedModel: 'Expense',
    relatedId: newExpense.idExpense,
    type: typeExpense,
    fileUrl: result.secure_url,
    publicId: result.public_id,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    notes: `Comprobante de ${typeExpense}`
  });
}
```

### Queries Principales
```javascript
// balanceController.js - getGeneralBalance
const allExpenses = await Expense.findAll({
  where: expenseWhere,
  order: [['date', 'DESC']],
  include: [
    { model: Staff, as: 'Staff' },
    { model: Work, as: 'work' }
  ]
});

// Obtener receipts por separado
const expenseReceipts = await Receipt.findAll({
  where: {
    relatedModel: 'Expense',
    relatedId: { [Op.in]: expenseIds.map(id => id.toString()) }
  }
});
```

---

## 📋 TABLA 3: FIXEDEXPENSE (Gastos Fijos Recurrentes) 🆕

### Estructura de Datos
```javascript
{
  idFixedExpense: UUID (PK),
  name: STRING (required),
  description: TEXT,
  amount: DECIMAL(10, 2) (required),
  frequency: ENUM [
    'monthly',    // Mensual
    'biweekly',   // Quincenal
    'weekly',     // Semanal
    'quarterly',  // Trimestral
    'semiannual', // Semestral
    'annual',     // Anual
    'one_time'    // Único
  ] (default: 'monthly'),
  category: ENUM [
    'Renta', 'Servicios', 'Seguros', 'Salarios',
    'Equipamiento', 'Software/Subscripciones',
    'Mantenimiento Vehicular', 'Combustible',
    'Impuestos', 'Contabilidad/Legal', 'Marketing',
    'Telefonía', 'Otros'
  ],
  paymentMethod: ENUM (12 valores),
  paymentAccount: STRING,
  startDate: DATEONLY (required),
  endDate: DATEONLY,
  nextDueDate: DATEONLY,
  isActive: BOOLEAN (default: true),
  autoCreateExpense: BOOLEAN (default: false),
  vendor: STRING,
  accountNumber: STRING,
  notes: TEXT,
  createdByStaffId: UUID (FK → Staffs)
}
```

### Relaciones
- **Staff** (1:N) - createdBy
- **Expense** (1:N inversa) - Un FixedExpense puede generar múltiples Expenses

### Endpoints CRUD
```javascript
POST   /api/fixed-expenses                     // Crear
GET    /api/fixed-expenses                     // Listar todos (con filtros)
GET    /api/fixed-expenses/upcoming?days=30    // Próximos a vencer
GET    /api/fixed-expenses/:id                 // Obtener uno
PATCH  /api/fixed-expenses/:id                 // Actualizar
DELETE /api/fixed-expenses/:id                 // Eliminar
PATCH  /api/fixed-expenses/:id/toggle-status   // Activar/Desactivar
POST   /api/fixed-expenses/:id/generate-expense // Generar Expense
```

### Lógica de Verificación de Periodo (isPaidThisPeriod)
**Función**: `fixedExpenseController.getAllFixedExpenses` (líneas 142-188)

```javascript
// Determina si ya existe un Expense para el período actual
switch (fe.frequency) {
  case 'monthly':
    // Busca expense del mes actual
    startOfPeriod = new Date(currentYear, currentMonth, 1);
    endOfPeriod = new Date(currentYear, currentMonth + 1, 0);
    break;
    
  case 'biweekly':
    // Primera o segunda quincena del mes
    if (currentDay <= 15) {
      startOfPeriod = new Date(currentYear, currentMonth, 1);
      endOfPeriod = new Date(currentYear, currentMonth, 15);
    } else {
      startOfPeriod = new Date(currentYear, currentMonth, 16);
      endOfPeriod = new Date(currentYear, currentMonth + 1, 0);
    }
    break;
    
  case 'weekly':
    // De lunes a domingo actual
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    startOfPeriod = startOfWeek;
    endOfPeriod = endOfWeek;
    break;
    
  case 'quarterly':
    // Trimestre actual
    const quarter = Math.floor(currentMonth / 3);
    startOfPeriod = new Date(currentYear, quarter * 3, 1);
    endOfPeriod = new Date(currentYear, (quarter + 1) * 3, 0);
    break;
    
  case 'semiannual':
    // Semestre actual (Ene-Jun o Jul-Dic)
    if (currentMonth < 6) {
      startOfPeriod = new Date(currentYear, 0, 1);  // Enero
      endOfPeriod = new Date(currentYear, 5, 30);   // Junio
    } else {
      startOfPeriod = new Date(currentYear, 6, 1);  // Julio
      endOfPeriod = new Date(currentYear, 11, 31);  // Diciembre
    }
    break;
    
  case 'annual':
    // Año actual
    startOfPeriod = new Date(currentYear, 0, 1);
    endOfPeriod = new Date(currentYear, 11, 31);
    break;
    
  case 'one_time':
    // Busca cualquier expense alguna vez generado
    startOfPeriod = new Date('1900-01-01');
    endOfPeriod = new Date('2100-12-31');
    break;
}

// Busca si existe un Expense en ese rango
const existingExpense = await Expense.findOne({
  where: {
    relatedFixedExpenseId: fe.idFixedExpense,
    date: {
      [Op.between]: [startOfPeriod, endOfPeriod]
    }
  }
});

return {
  ...fe.toJSON(),
  isPaidThisPeriod: !!existingExpense,
  lastPaymentDate: existingExpense?.date || null
};
```

### UI - FixedExpensesManager.jsx
**Features**:
1. ✅ Lista de gastos fijos con filtros (activo/inactivo, categoría, método de pago)
2. ✅ Crear/Editar/Eliminar gastos fijos
3. ✅ Toggle activar/desactivar (ahora arreglado con `isActive` en body)
4. ✅ Generar expense manual con botón
5. ✅ Botón deshabilitado si `isPaidThisPeriod === true`
6. ✅ Badge verde "✓ Generado (fecha)" cuando ya se pagó
7. ✅ Lista de "Próximos a Vencer" (upcoming expenses)

**Código Toggle Arreglado**:
```javascript
// balanceActions.jsx (líneas 286-293)
toggleActive: async (id, currentIsActive) => {
  const response = await api.patch(`/fixed-expenses/${id}/toggle-status`, {
    isActive: !currentIsActive // ✅ Ahora envía el body correcto
  });
  return response.data;
}

// FixedExpensesManager.jsx (línea 259)
const response = await fixedExpenseActions.toggleActive(
  expense.idFixedExpense, 
  expense.isActive // ✅ Pasa el estado actual
);
```

---

## 📋 TABLA 4: RECEIPT (Comprobantes)

### Estructura de Datos
```javascript
{
  idReceipt: UUID (PK),
  relatedModel: STRING (required) [
    'Income', 'Expense', 'FinalInvoice', 'Permit', 
    'Inspection', 'MaterialSet', 'Work'
  ],
  relatedId: STRING (required), // ID del registro relacionado
  type: ENUM [
    'Factura Pago Inicial Budget',
    'Factura Pago Final Budget',
    'Materiales', 'Diseño', 'Workers',
    'Comisión Vendedor', 'Imprevistos',
    'Comprobante Gasto', 'Comprobante Ingreso',
    'Gastos Generales', 'Materiales Iniciales',
    'Inspección Inicial', 'Inspección Final',
    'Gasto Fijo' // 🆕 NUEVO
  ],
  fileUrl: STRING (required), // Cloudinary URL
  publicId: STRING (required), // Cloudinary ID
  mimeType: STRING,
  originalName: STRING,
  notes: TEXT
}
```

### Relaciones (Polimórficas)
- **Income** (N:1) - Múltiples receipts pueden asociarse a un ingreso
- **Expense** (N:1) - Múltiples receipts pueden asociarse a un gasto
- **FinalInvoice** (N:1) - Múltiples receipts para pagos finales
- **Inspection**, **MaterialSet**, **Work**, etc.

### Flujos de Creación

#### FLUJO 1: Receipt para Income (Pago Final Budget)
**Endpoint**: `POST /receipts`  
**Body**:
```json
{
  "relatedModel": "FinalInvoice",
  "relatedId": "uuid-de-final-invoice",
  "type": "Factura Pago Final Budget",
  "notes": "Pago parcial",
  "amountPaid": 5000.00,
  "paymentMethod": "Chase Bank"
}
```
**Proceso** (ver FLUJO 2 de Income arriba):
1. Sube archivo a Cloudinary
2. Crea Income automáticamente
3. Crea Receipt asociado al Income (NO a FinalInvoice)
4. Actualiza FinalInvoice.totalAmountPaid

#### FLUJO 2: Receipt para Expense (Inspecciones)
**Endpoint**: `POST /expenses` (con multer middleware)  
**Proceso**: Auto-creación dentro del `createExpense` si es Inspección Inicial/Final.

#### FLUJO 3: Receipt Manual
**Endpoint**: `POST /receipts`  
**Componente**: `Summary.jsx` (editar movimiento, cambiar comprobante)

### Query de Receipts en Summary
```javascript
// balanceController.js - getGeneralBalance (líneas 209-229)
// 1. Obtener receipts de Income
const incomeReceipts = await Receipt.findAll({
  where: {
    relatedModel: 'Income',
    relatedId: { [Op.in]: incomeIds.map(id => id.toString()) }
  }
});

// 2. Obtener receipts de FinalInvoice para pagos finales
const finalInvoiceReceipts = await Receipt.findAll({
  where: { relatedModel: 'FinalInvoice' }
});

// 3. Asociar manualmente a los incomes
const incomesWithReceipts = allIncomes.map(income => {
  const receipts = incomeReceipts.filter(receipt =>
    receipt.relatedId === income.idIncome.toString()
  );

  // Si es pago inicial, agregar comprobante del Budget
  if (income.typeIncome === 'Factura Pago Inicial Budget' && 
      income.work?.budget?.paymentInvoice) {
    receipts.push({
      idReceipt: `budget-${income.work.budget.idBudget}`,
      fileUrl: income.work.budget.paymentInvoice,
      mimeType: income.work.budget.paymentProofType === 'image' ? 'image/png' : 'application/pdf',
      source: 'budget' // Identificador especial
    });
  }

  // Si es pago final, agregar receipts de FinalInvoice
  if (income.typeIncome === 'Factura Pago Final Budget' && 
      income.work?.finalInvoice) {
    const finalInvoiceId = income.work.finalInvoice.id;
    const finalInvoiceReceiptsForThisIncome = finalInvoiceReceipts.filter(receipt =>
      receipt.relatedId === finalInvoiceId.toString()
    );
    finalInvoiceReceiptsForThisIncome.forEach(receipt => {
      receipts.push({
        ...receipt.toJSON(),
        source: 'finalInvoice' // Identificador especial
      });
    });
  }

  return { ...income.toJSON(), Receipts: receipts };
});
```

**🔍 INSIGHT CRÍTICO**: Los receipts se obtienen por separado y se asocian manualmente en el backend, NO mediante JOINs de Sequelize, porque la relación es polimórfica (relatedModel + relatedId).

---

## 🔗 FLUJO COMPLETO: PAGO INICIAL DE BUDGET

### 1. Frontend - UploadInitialPay.jsx
```javascript
// Usuario selecciona Budget y sube archivo
const handleUpload = async () => {
  const uploadResult = await dispatch(
    uploadInvoice(selectedBudgetId, file, parsedAmount, paymentMethod)
  );
};
```

### 2. Redux - budgetActions.js
```javascript
export const uploadInvoice = (budgetId, file, amount, paymentMethod) => async (dispatch) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('paymentProofAmount', amount);
  formData.append('paymentMethod', paymentMethod);

  const response = await api.post(`/budgets/${budgetId}/upload-invoice`, formData);
  return response.data;
};
```

### 3. Backend - BudgetController.uploadInvoice
```javascript
// 1. Valida que el Budget existe y está en estado apropiado
const budget = await Budget.findByPk(idBudget, {
  include: [{ model: Work, as: 'Work' }]
});

// 2. Sube archivo a Cloudinary
const result = await uploadBufferToCloudinary(req.file.buffer, { ... });

// 3. Actualiza Budget
budget.paymentInvoice = result.secure_url;
budget.paymentProofType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
budget.paymentProofAmount = paymentProofAmount;
budget.status = 'approved'; // O el estado correspondiente
await budget.save();

// 4. Crea Income automáticamente
const newIncome = await Income.create({
  amount: paymentProofAmount,
  date: new Date(),
  workId: budget.Work?.idWork,
  typeIncome: 'Factura Pago Inicial Budget',
  notes: `Pago inicial para Budget ID: ${budget.idBudget}`,
  staffId: budget.Work?.staffId,
  paymentMethod: paymentMethod || 'Sin especificar',
  verified: false
});

// 5. Envía notificaciones
await sendNotifications('incomeRegistered', incomeData);

// 6. Responde al frontend
res.status(200).json({
  message: 'Comprobante subido e ingreso registrado correctamente.',
  budget: budget,
  income: newIncome
});
```

### 4. ¿Dónde se muestra?
- **Summary.jsx**: El Income aparece con tipo "Factura Pago Inicial Budget"
- El Receipt NO existe en la tabla `Receipt`, está en `Budget.paymentInvoice`
- Para mostrarlo, el backend hace el merge manual (ver código arriba en "Query de Receipts")

---

## 🔗 FLUJO COMPLETO: PAGO FINAL DE BUDGET (FINAL INVOICE)

### 1. Frontend - UploadInitialPay.jsx (o similar)
```javascript
// Usuario sube comprobante para FinalInvoice
const formData = new FormData();
formData.append('file', file);
formData.append('relatedModel', 'FinalInvoice');
formData.append('relatedId', finalInvoiceId);
formData.append('type', 'Factura Pago Final Budget');
formData.append('amountPaid', amount);
formData.append('paymentMethod', paymentMethod);

const response = await api.post('/receipts', formData);
```

### 2. Backend - ReceiptController.createReceipt
```javascript
// 1. Sube archivo a Cloudinary
const uploadStream = cloudinary.uploader.upload_stream({ ... });

// 2. Busca FinalInvoice
const finalInvoice = await FinalInvoice.findByPk(relatedId);

// 3. Valida que no esté ya pagada completamente
if (finalInvoice.status === 'paid') {
  return res.status(400).json({ error: true, message: 'Ya está pagada' });
}

// 4. Valida que el monto no exceda el saldo pendiente
const currentRemainingBalance = finalInvoice.finalAmountDue - finalInvoice.totalAmountPaid;
if (amountPaid > currentRemainingBalance + 0.05) {
  return res.status(400).json({ error: true, message: 'Monto excede saldo' });
}

// 5. Actualiza FinalInvoice
finalInvoice.totalAmountPaid += amountPaid;
if (finalInvoice.totalAmountPaid >= finalInvoice.finalAmountDue - 0.05) {
  finalInvoice.status = 'paid';
  finalInvoice.paymentDate = new Date();
} else {
  finalInvoice.status = 'partially_paid';
}
await finalInvoice.save();

// 6. Crea Income automáticamente
const createdIncome = await Income.create({
  amount: amountPaid,
  date: new Date(),
  workId: finalInvoice.workId,
  typeIncome: 'Factura Pago Final Budget',
  notes: `Pago para Factura Final ID: ${finalInvoice.id}`,
  staffId: workStaff.staffId,
  paymentMethod: paymentMethod || 'Sin especificar',
  verified: false
});

// 7. Crea Receipt asociado al Income (NO a FinalInvoice)
const createdReceipt = await Receipt.create({
  relatedModel: 'Income', // ✅ IMPORTANTE
  relatedId: createdIncome.idIncome,
  type: 'Factura Pago Final Budget',
  fileUrl: result.secure_url,
  publicId: result.public_id,
  mimeType: req.file.mimetype,
  originalName: req.file.originalname,
  notes
});

// 8. Si FinalInvoice está completamente pagada, actualizar Work.status
if (finalInvoice.status === 'paid') {
  const work = await Work.findByPk(finalInvoice.workId);
  if (work) {
    work.status = 'paymentReceived';
    await work.save();
  }
}

// 9. Envía notificaciones
await sendNotifications('incomeRegistered', incomeData);
```

### 3. ¿Dónde se muestra?
- **Summary.jsx**: El Income aparece con tipo "Factura Pago Final Budget"
- El Receipt SÍ existe en la tabla `Receipt`, asociado al Income
- El frontend hace fetch de `/balance/generalBalance` y el backend asocia los receipts

---

## 🔗 FLUJO COMPLETO: GENERACIÓN DE GASTO DESDE FIXED EXPENSE

### 1. Frontend - FixedExpensesManager.jsx
```javascript
const handleGenerateExpense = async () => {
  const response = await fixedExpenseActions.generateExpense(
    selectedExpenseForGenerate.idFixedExpense,
    {
      paymentDate: generateDate,
      notes: generateNotes
    }
  );
  
  if (!response.error) {
    toast.success('✅ Gasto generado correctamente');
    await loadFixedExpenses(); // Recarga para actualizar isPaidThisPeriod
  }
};
```

### 2. Redux - balanceActions.jsx
```javascript
generateExpense: async (fixedExpenseId, expenseData) => {
  const response = await api.post(
    `/fixed-expenses/${fixedExpenseId}/generate-expense`,
    expenseData
  );
  return response.data;
}
```

### 3. Backend - fixedExpenseController.generateExpenseFromFixed
```javascript
// 1. Valida que el FixedExpense existe y está activo
const fixedExpense = await FixedExpense.findByPk(fixedExpenseId);
if (!fixedExpense.isActive) {
  return res.status(400).json({ message: 'Gasto fijo inactivo' });
}

// 2. Verifica que NO exista ya un expense para el período
const { startOfPeriod, endOfPeriod } = calculatePeriodDates(fixedExpense.frequency);
const existingExpense = await Expense.findOne({
  where: {
    relatedFixedExpenseId: fixedExpense.idFixedExpense,
    date: { [Op.between]: [startOfPeriod, endOfPeriod] }
  }
});

if (existingExpense) {
  return res.status(400).json({ 
    message: 'Ya existe un gasto para este período',
    existingExpense 
  });
}

// 3. Crea el Expense
const newExpense = await Expense.create({
  date: paymentDate || new Date(),
  amount: fixedExpense.amount,
  typeExpense: 'Gasto Fijo',
  notes: notes || `Gasto automático: ${fixedExpense.name}`,
  staffId: fixedExpense.createdByStaffId,
  paymentMethod: fixedExpense.paymentMethod,
  paymentDetails: fixedExpense.paymentAccount,
  verified: false,
  relatedFixedExpenseId: fixedExpense.idFixedExpense,
  vendor: fixedExpense.vendor,
  workId: null // NO está asociado a una obra
});

// 4. Responde
res.status(201).json({
  message: 'Expense generado correctamente desde FixedExpense',
  expense: newExpense
});
```

### 4. ¿Dónde se muestra?
- **Summary.jsx**: El Expense aparece con typeExpense "Gasto Fijo"
- El campo `relatedFixedExpenseId` permite rastrear de qué gasto fijo vino
- FixedExpensesManager muestra `isPaidThisPeriod: true` y deshabilita el botón

---

## ⚠️ PUNTOS CRÍTICOS Y CONSIDERACIONES

### 1. **Receipts de Pago Inicial vs Pago Final**
**DIFERENCIA CLAVE**:
- **Pago Inicial**: El comprobante se guarda en `Budget.paymentInvoice` (NO en tabla Receipt)
- **Pago Final**: El comprobante se guarda en tabla `Receipt`, asociado al Income creado

**Razón**: Diseño legacy. El sistema originalmente guardaba el comprobante del pago inicial directamente en el Budget. Los pagos finales se implementaron después con el patrón Receipt.

**Implicación**: Al mostrar en Summary, el backend hace un merge manual:
```javascript
if (income.typeIncome === 'Factura Pago Inicial Budget' && income.work?.budget?.paymentInvoice) {
  receipts.push({
    idReceipt: `budget-${income.work.budget.idBudget}`,
    fileUrl: income.work.budget.paymentInvoice,
    source: 'budget'
  });
}
```

### 2. **Gastos Fijos sin Work**
Los Expenses generados desde FixedExpense tienen `workId: null` porque son gastos generales de la empresa.

**Implicación**:
- NO aparecen en consultas filtradas por `workId`
- En Summary aparecen solo si NO se filtra por obra
- En `getIncomesAndExpensesByWorkId` NO aparecerán

### 3. **Relaciones Polimórficas de Receipt**
La tabla `Receipt` usa `relatedModel` + `relatedId` (string) en lugar de FKs tradicionales.

**Pros**:
- Flexibilidad: Un receipt puede asociarse a Income, Expense, FinalInvoice, etc.

**Contras**:
- No se pueden hacer JOINs directos con Sequelize
- Hay que hacer queries separadas y asociar manualmente
- Riesgo de datos huérfanos si se borra un Income/Expense sin borrar sus Receipts

**Mitigación actual**:
```javascript
// ReceiptController.deleteReceipt - revierte Incomes si el Receipt era de FinalInvoice
if (receipt.relatedModel === 'FinalInvoice') {
  const incomeToRevert = await Income.findOne({
    where: { notes: { [Op.like]: `%Recibo ID: ${idReceipt}%` } }
  });
  if (incomeToRevert) {
    await incomeToRevert.destroy();
    // Revertir FinalInvoice.totalAmountPaid
  }
}
```

### 4. **ENUM paymentMethod - Sincronización**
Los 12 valores deben estar sincronizados en:
- `Income.paymentMethod` (modelo)
- `Expense.paymentMethod` (modelo)
- `FixedExpense.paymentMethod` (modelo)
- `Receipt.type` incluye tipos de expenses/incomes
- Frontend: `paymentConstants.js`

**Estado Actual**: ✅ SINCRONIZADO (después de las migraciones recientes)

### 5. **Verificación de Períodos (isPaidThisPeriod)**
La lógica calcula el rango de fechas del período actual según la frecuencia:
- `monthly`: Del 1 al último día del mes actual
- `biweekly`: Primera quincena (1-15) o segunda (16-fin de mes)
- `weekly`: De lunes a domingo de la semana actual
- `quarterly`: Del primer día del trimestre al último
- `semiannual`: Ene-Jun o Jul-Dic
- `annual`: Año actual (1 ene - 31 dic)
- `one_time`: Todo el rango histórico (1900-2100)

**⚠️ EDGE CASES**:
- Si se genera un gasto el día 31 de enero (monthly), el próximo período es febrero (solo 28/29 días)
- Para `biweekly`, el día 15 puede causar confusión si se genera en la primera o segunda quincena
- Para `weekly`, si hoy es domingo, el cálculo de "lunes de la semana actual" puede dar resultados inesperados

### 6. **Auto-generación de Expenses (autoCreateExpense)**
El campo `FixedExpense.autoCreateExpense` está definido pero **NO implementado**.

**Funcionalidad Planeada** (no existe aún):
- Un cron job que corre diariamente
- Busca FixedExpenses con `autoCreateExpense: true` y `nextDueDate <= hoy`
- Genera automáticamente el Expense
- Actualiza `nextDueDate` según la frecuencia

**Estado**: ❌ NO IMPLEMENTADO - Requiere:
1. Cron job en backend (ej. node-cron)
2. Función para calcular `nextDueDate` basado en frecuencia
3. Manejo de errores si la generación falla

---

## 🐛 BUGS CORREGIDOS RECIENTEMENTE

### BUG 1: Toggle Active Button No Funcionaba ✅ CORREGIDO
**Problema**: `toggleActive` no enviaba el parámetro `isActive` en el body.

**Solución**:
```javascript
// ANTES
toggleActive: async (id) => {
  const response = await api.patch(`/fixed-expenses/${id}/toggle-status`);
  // Backend esperaba { isActive: boolean } pero no se enviaba
}

// DESPUÉS
toggleActive: async (id, currentIsActive) => {
  const response = await api.patch(`/fixed-expenses/${id}/toggle-status`, {
    isActive: !currentIsActive // ✅ Ahora envía el body correcto
  });
}
```

### BUG 2: Duplicados en Summary ✅ CORREGIDO
**Problema**: Los movimientos aparecían múltiples veces en la tabla.

**Causa Raíz**: Array concatenation podía duplicar si los datos venían con duplicados del backend.

**Solución**:
```javascript
// ANTES
const allMovements = [
  ...incomes.map((m) => ({ ...m, movimiento: "Ingreso" })),
  ...expenses.map((m) => ({ ...m, movimiento: "Gasto" })),
];

// DESPUÉS - Usa Map para garantizar unicidad por ID
const movementsMap = new Map();
incomes.forEach((m) => {
  const key = `income-${m.idIncome}`;
  if (!movementsMap.has(key)) {
    movementsMap.set(key, { ...m, movimiento: "Ingreso" });
  }
});
expenses.forEach((m) => {
  const key = `expense-${m.idExpense}`;
  if (!movementsMap.has(key)) {
    movementsMap.set(key, { ...m, movimiento: "Gasto" });
  }
});
const allMovements = Array.from(movementsMap.values());
```

### BUG 3: "Gasto Fijo" No Aparecía en Summary ✅ VERIFICADO OK
**Problema Reportado**: Los gastos con typeExpense='Gasto Fijo' no se mostraban.

**Investigación**:
- ✅ `expenseController.getExpenseTypes` incluye "Gasto Fijo"
- ✅ Summary carga tipos dinámicamente desde `/expense/types`
- ✅ El filtro de `typeExpense` muestra todos los tipos cargados

**Resultado**: NO ERA UN BUG. El tipo "Gasto Fijo" sí aparecía, pero quizás:
1. No había gastos fijos generados aún
2. Los duplicados escondían los gastos fijos
3. Filtros aplicados ocultaban los resultados

Con la corrección de duplicados (BUG 2), ahora los gastos fijos deberían ser visibles.

---

## 📊 RECOMENDACIONES TÉCNICAS

### PRIORIDAD ALTA 🔴

1. **Implementar Auto-generación de FixedExpenses**
   - Agregar cron job con node-cron
   - Función `calculateNextDueDate(frequency, currentDate)`
   - Notificaciones cuando se genera automáticamente

2. **Unificar Almacenamiento de Receipts de Pago Inicial**
   - Migrar `Budget.paymentInvoice` a tabla `Receipt`
   - Crear migration que:
     - Lee todos los Budgets con paymentInvoice
     - Crea Receipt para cada uno con relatedModel='Income'
     - Limpia Budget.paymentInvoice después
   - Actualizar BudgetController para usar Receipt en lugar de guardar en Budget

3. **Agregar Cascade Deletes para Receipts**
   - Actualmente al borrar un Income/Expense, los Receipts quedan huérfanos
   - Opción 1: Trigger en base de datos
   - Opción 2: Hook de Sequelize `beforeDestroy`
   - Opción 3: Lógica manual en cada controller

### PRIORIDAD MEDIA 🟠

4. **Mejorar Manejo de Errores en ReceiptController**
   - Agregar try-catch más granular
   - Rollback de Cloudinary si falla la DB
   - Logging estructurado (Winston/Bunyan)

5. **Validaciones de Integridad de Datos**
   - Validar que `Receipt.relatedId` existe en la tabla correspondiente
   - Endpoint de auditoría: `GET /admin/audit/orphaned-receipts`

6. **Optimización de Queries en Summary**
   - Los queries de Receipts son N+1 (uno por cada Income/Expense)
   - Considerar una query más eficiente con UNION o subqueries

### PRIORIDAD BAJA 🟢

7. **Documentación de API**
   - Swagger/OpenAPI para todos los endpoints
   - Especialmente para Receipt (relaciones polimórficas complejas)

8. **Testing**
   - Unit tests para `calculatePeriodDates` (edge cases de fechas)
   - Integration tests para flujo completo de pago final
   - E2E tests para UploadInitialPay → Summary

9. **Refactorización de Constants**
   - Centralizar ENUM values en un solo archivo
   - Importar desde backend en lugar de duplicar en frontend

---

## 📈 MÉTRICAS DEL SISTEMA

### Tablas Principales
- **Income**: ~100-500 registros/mes (estimado)
- **Expense**: ~500-2000 registros/mes (estimado)
- **FixedExpense**: ~10-50 registros activos
- **Receipt**: ~500-1000 registros/mes

### Endpoints Más Usados
1. `GET /balance/generalBalance` (Summary)
2. `POST /receipts` (Subir comprobantes)
3. `GET /fixed-expenses` (Lista de gastos fijos)
4. `POST /budgets/:id/upload-invoice` (Pago inicial)

### Tamaño de Archivos
- Receipts: Promedio 500KB - 2MB
- Storage Cloudinary: ~10-50GB/año (estimado)

---

## 🔒 SEGURIDAD

### Autenticación
- Middleware `isAuth` en todas las rutas (comentado en algunos lugares)
- ⚠️ **ATENCIÓN**: Algunas rutas de FixedExpense NO tienen middleware de auth
  ```javascript
  // fixedExpenseRoutes.js - Todas las rutas sin middleware:
  router.post('/', createFixedExpense); // ⚠️ Sin isAuth
  router.get('/', getAllFixedExpenses);  // ⚠️ Sin isAuth
  ```

### Validación de Datos
- ✅ Validación de tipos de archivo en ReceiptController
- ✅ Validación de montos (no negativos, no exceder saldo)
- ✅ Validación de ENUM values
- ⚠️ Falta validación de staffId (puede ser cualquier UUID)

### Cloudinary
- ✅ Archivos públicos (access_mode: 'public')
- ✅ Cleanup al borrar Receipt (cloudinary.uploader.destroy)
- ⚠️ No hay límite de tamaño global (solo 5MB en frontend)

---

## 🎯 CONCLUSIONES

### ✅ Fortalezas del Sistema
1. **Separación de Responsabilidades**: Income, Expense, FixedExpense bien definidos
2. **Flexibilidad de Receipts**: Relación polimórfica permite adjuntar comprobantes a cualquier entidad
3. **Trazabilidad**: Campo `relatedFixedExpenseId` permite rastrear gastos generados automáticamente
4. **UI Completa**: FixedExpensesManager tiene todas las features necesarias

### ⚠️ Áreas de Mejora
1. **Inconsistencia en Almacenamiento de Receipts**: Pago inicial en Budget, pago final en Receipt
2. **Auto-generación Pendiente**: `autoCreateExpense` no implementado
3. **Relaciones Polimórficas Complejas**: Dificultan queries y pueden causar bugs
4. **Falta de Tests**: Sistema crítico sin cobertura de tests

### 🚀 Next Steps Recomendados
1. Implementar cron job para auto-generación
2. Migrar receipts de pago inicial a tabla Receipt
3. Agregar middleware de autenticación a todas las rutas
4. Escribir tests para flujos críticos
5. Documentar API con Swagger

---

**FIN DEL REPORTE TÉCNICO**

*Generado automáticamente el 9 de Octubre de 2025*
