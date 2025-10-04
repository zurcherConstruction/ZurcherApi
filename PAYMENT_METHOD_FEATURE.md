# 💳 Feature: Método de Pago para Ingresos y Gastos

## 📋 Overview

Se agregó el campo `paymentMethod` a las tablas **Incomes** y **Expenses** para rastrear cómo se recibió o pagó el dinero en cada transacción.

Este campo ayuda con:
- ✅ **Reconciliación bancaria** más fácil
- ✅ **Tracking por método de pago** (cash, checks, transfers, etc.)
- ✅ **Auditoría financiera** mejorada
- ✅ **Reportes por forma de pago**

---

## 🔧 Cambios Realizados

### 1. **Backend - Modelos Actualizados**

#### Income Model (`BackZurcher/src/data/models/Income.js`)
```javascript
paymentMethod: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: 'Método de pago o cuenta por la que ingresó el dinero'
}
```

**Ejemplos de valores:**
- `"Zelle"`
- `"Cash"`
- `"Check #1234"`
- `"Bank Transfer - Chase"`
- `"PayPal"`
- `"Wire Transfer"`
- `"Credit Card - Business Visa"`

#### Expense Model (`BackZurcher/src/data/models/Expense.js`)
```javascript
paymentMethod: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: 'Método de pago o cuenta por la que se realizó el gasto'
}
```

**Ejemplos de valores:**
- `"Zelle"`
- `"Cash"`
- `"Check #5678"`
- `"Bank Transfer - Chase"`
- `"Credit Card - Visa ending 4532"`
- `"Debit Card - Chase"`
- `"PayPal"`

---

### 2. **Migración Creada**

📄 `BackZurcher/migrations/add-payment-method.js`

**Características:**
- ✅ **Idempotente** (puede ejecutarse múltiples veces)
- ✅ Verifica si las columnas ya existen antes de agregarlas
- ✅ Transaccional (rollback automático en caso de error)
- ✅ Incluye función `down()` para revertir cambios

**Comando para ejecutar:**
```powershell
node run-migration.js add-payment-method
```

**Salida esperada:**
```
🚀 Iniciando migración: Agregar campo paymentMethod...

📝 Paso 1: Verificando columna paymentMethod en Incomes...
   ✅ Agregada columna "paymentMethod" a Incomes

📝 Paso 2: Verificando columna paymentMethod en Expenses...
   ✅ Agregada columna "paymentMethod" a Expenses

✅ ¡Migración completada exitosamente!

📊 Resumen:
   • Incomes: Agregado campo "paymentMethod"
   • Expenses: Agregado campo "paymentMethod"

💡 Ahora puedes registrar el método de pago para cada transacción
```

---

### 3. **Frontend - Componente Actualizado**

📄 `FrontZurcher/src/Components/Seguimiento/AttachInvoice.jsx`

**Cambios:**
1. ✅ Nuevo estado: `paymentMethod`
2. ✅ Input para capturar método de pago
3. ✅ Validación y limpieza de formulario
4. ✅ Envío del campo al backend

**UI del campo:**
```jsx
{/* Payment Method */}
{type && type !== "Factura Pago Final Budget" && (
  <div>
    <label htmlFor="paymentMethod">
      <CurrencyDollarIcon className="h-5 w-5" />
      Método de Pago (Opcional)
    </label>
    <input
      id="paymentMethod"
      type="text"
      value={paymentMethod}
      onChange={(e) => setPaymentMethod(e.target.value)}
      placeholder="Ej: Zelle, Cash, Check #1234, Bank Transfer - Chase"
    />
    <p className="text-xs text-gray-500">
      Especifica cómo se recibió/pagó el dinero
    </p>
  </div>
)}
```

**Cuándo aparece:**
- ✅ Para todos los tipos de gastos generales
- ✅ Para todos los tipos de ingresos generales
- ❌ **NO** aparece para "Factura Pago Final Budget" (tiene su propia lógica)

---

### 4. **Estados Permitidos para Pago Inicial - ACTUALIZADOS**

#### Backend (`BudgetController.js`)

```javascript
const allowedStatesForPayment = [
  'created',              // ✅ Cuando se crea
  'send',                 // ✅ Enviado al cliente
  'sent_for_signature',   // ✅ En proceso de firma
  'signed',               // ✅ Firmado
  'client_approved',      // ✅ Aprobado por cliente
  'pending_review'        // ✅ En revisión
];
```

**Estados NO permitidos:**
- ❌ `draft` - Aún es borrador
- ❌ `approved` - Ya fue aprobado (comprobante ya existe)
- ❌ `rejected` - Rechazado
- ❌ `notResponded` - No respondió

#### Frontend (`UploadInitialPay.jsx`)

```javascript
const allowedStatesForPayment = [
  'created',
  'send',
  'sent_for_signature',
  'signed',
  'client_approved',
  'pending_review'
];

const sendBudgets = budgets.filter(b => 
  allowedStatesForPayment.includes(b.status)
);
```

**Actualizado UI:**
- ✅ Label actualizado: "Estados permitidos: Created, Enviado, Firmado, Aprobado por Cliente"
- ✅ Muestra etiqueta visual del estado actual
- ✅ Colores según estado (verde para signed, azul para client_approved, etc.)

---

## 📊 Casos de Uso

### Caso 1: Registrar Ingreso con Método de Pago

**Escenario:** Cliente pagó el pago inicial con Zelle

```javascript
// Datos que se envían al backend
{
  type: "Comprobante Ingreso",
  amount: 5000.00,
  workId: "uuid-del-work",
  staffId: "uuid-del-staff",
  notes: "Pago inicial del proyecto",
  paymentMethod: "Zelle"  // 🆕 Nuevo campo
}
```

### Caso 2: Registrar Gasto con Método de Pago

**Escenario:** Se pagó a un worker en efectivo

```javascript
{
  typeExpense: "Workers",
  amount: 1200.00,
  staffId: "uuid-del-staff",
  notes: "Pago semanal Juan Pérez",
  paymentMethod: "Cash"  // 🆕 Nuevo campo
}
```

### Caso 3: Gasto con Check

**Escenario:** Se pagaron materiales con cheque

```javascript
{
  typeExpense: "Materiales",
  amount: 3500.00,
  workId: "uuid-del-work",
  staffId: "uuid-del-staff",
  notes: "Materiales para plomería",
  paymentMethod: "Check #5234"  // 🆕 Incluye número de cheque
}
```

---

## 🎯 Flujo de Usuario Actualizado

### Agregar Ingreso/Gasto con Método de Pago

1. Usuario navega a **"Adjuntar Comprobante"**
2. Selecciona tipo (ej: "Comisión Vendedor")
3. **Opción A:** Marca como transacción general (sin Work)
4. **Opción B:** Selecciona Work específico
5. Ingresa monto
6. **🆕 NUEVO:** Ingresa método de pago (opcional)
   - Placeholder sugiere ejemplos: "Zelle, Cash, Check #1234, etc."
7. Adjunta comprobante (PDF o imagen)
8. Agrega notas (opcional)
9. Envía formulario

**Resultado:**
```json
{
  "typeExpense": "Comisión Vendedor",
  "amount": 500.00,
  "staffId": "...",
  "paymentMethod": "Bank Transfer - Chase",
  "notes": "Comisión Budget #1234",
  "file": "comprobante.pdf"
}
```

---

## 🚀 Migración en Producción

### Pasos para Ejecutar

```powershell
# 1. Navegar al directorio del backend
cd C:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi\BackZurcher

# 2. Ejecutar migración
node run-migration.js add-payment-method
```

### Verificar Cambios

```sql
-- Verificar que las columnas existen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('Incomes', 'Expenses')
AND column_name = 'paymentMethod';

-- Resultado esperado: 2 filas
-- Incomes.paymentMethod (character varying, YES)
-- Expenses.paymentMethod (character varying, YES)
```

### Probar en la Aplicación

1. ✅ Crear un gasto tipo "Workers" con paymentMethod = "Cash"
2. ✅ Crear un ingreso tipo "Comprobante Ingreso" con paymentMethod = "Zelle"
3. ✅ Verificar en BD que los valores se guardaron correctamente

```sql
-- Ver últimos 5 gastos con método de pago
SELECT 
  "idExpense",
  "typeExpense",
  amount,
  "paymentMethod",
  date
FROM "Expenses"
WHERE "paymentMethod" IS NOT NULL
ORDER BY date DESC
LIMIT 5;

-- Ver últimos 5 ingresos con método de pago
SELECT 
  "idIncome",
  "typeIncome",
  amount,
  "paymentMethod",
  date
FROM "Incomes"
WHERE "paymentMethod" IS NOT NULL
ORDER BY date DESC
LIMIT 5;
```

---

## 📈 Beneficios del Feature

### 1. **Reconciliación Bancaria Mejorada**
Ahora puedes filtrar transacciones por método de pago:

```sql
-- Todos los ingresos por Zelle
SELECT SUM(amount) as total_zelle
FROM "Incomes"
WHERE "paymentMethod" ILIKE '%zelle%';

-- Todos los gastos en efectivo
SELECT SUM(amount) as total_cash
FROM "Expenses"
WHERE "paymentMethod" ILIKE '%cash%';
```

### 2. **Reportes Financieros por Método**

```sql
-- Resumen de ingresos por método de pago
SELECT 
  "paymentMethod",
  COUNT(*) as transactions,
  SUM(amount) as total_amount
FROM "Incomes"
WHERE "paymentMethod" IS NOT NULL
GROUP BY "paymentMethod"
ORDER BY total_amount DESC;
```

### 3. **Auditoría y Compliance**
- Rastrear todas las transacciones en efectivo (para compliance IRS)
- Identificar checks por número
- Reconciliar transferencias bancarias

### 4. **Tracking de Comisiones**
```sql
-- Todas las comisiones pagadas por Zelle
SELECT 
  amount,
  "paymentMethod",
  date,
  notes
FROM "Expenses"
WHERE "typeExpense" = 'Comisión Vendedor'
AND "paymentMethod" ILIKE '%zelle%';
```

---

## 🔧 Mantenimiento Futuro

### Agregar Método de Pago Predefinido (Opcional)

Si en el futuro quieres convertir `paymentMethod` a un ENUM con valores predefinidos:

```javascript
// Migration futura (opcional)
paymentMethod: {
  type: DataTypes.ENUM(
    'Cash',
    'Check',
    'Zelle',
    'Bank Transfer',
    'Wire Transfer',
    'Credit Card',
    'Debit Card',
    'PayPal',
    'Venmo',
    'Other'
  ),
  allowNull: true
}
```

**Ventajas:**
- ✅ Datos más consistentes
- ✅ Reportes más fáciles
- ✅ Validación automática

**Desventajas:**
- ❌ Menos flexible (no puedes poner "Check #1234")
- ❌ Requiere migración para agregar nuevos métodos

**Recomendación:** Mantener como `STRING` por flexibilidad.

---

## ✅ Checklist de Implementación

### Backend
- [x] Modelo Income actualizado con `paymentMethod`
- [x] Modelo Expense actualizado con `paymentMethod`
- [x] Migración `add-payment-method.js` creada
- [x] run-migration.js actualizado con nueva migración
- [ ] Migración ejecutada en base de datos de producción

### Frontend
- [x] AttachInvoice.jsx actualizado con campo `paymentMethod`
- [x] Estado `paymentMethod` agregado
- [x] Input con placeholder explicativo
- [x] Validación y limpieza de formulario
- [x] Envío del campo al backend

### Estados de Budget
- [x] Backend actualizado con validación de estados permitidos
- [x] Frontend (UploadInitialPay.jsx) actualizado
- [x] Label actualizado con estados permitidos
- [x] Etiqueta visual del estado actual agregada

### Testing
- [ ] Crear gasto con paymentMethod
- [ ] Crear ingreso con paymentMethod
- [ ] Verificar en BD que se guarda correctamente
- [ ] Probar con diferentes métodos de pago
- [ ] Verificar que es opcional (funciona sin paymentMethod)

---

## 📞 Preguntas Frecuentes

### ¿Es obligatorio el campo paymentMethod?
**No**, es completamente opcional. Puedes crear ingresos/gastos sin especificar el método.

### ¿Qué formato debo usar?
Formato libre. Recomendaciones:
- `"Zelle"` - Simple
- `"Check #1234"` - Con número de referencia
- `"Bank Transfer - Chase"` - Con banco
- `"Credit Card - Visa ending 4532"` - Con últimos dígitos

### ¿Se puede cambiar después de creado?
Sí, si agregas funcionalidad de edición de Incomes/Expenses.

### ¿Afecta a transacciones existentes?
No, las transacciones existentes tendrán `paymentMethod = null`. Puedes editarlas manualmente en la BD si es necesario.

---

**Status:** ✅ Feature Completo - Listo para Testing y Despliegue  
**Migración Requerida:** ✅ Sí - `add-payment-method`  
**Breaking Changes:** ❌ No
