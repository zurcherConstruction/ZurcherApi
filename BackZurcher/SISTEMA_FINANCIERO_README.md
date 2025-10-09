# 💰 Sistema de Control Financiero Detallado - Zurcher Construction

## ✅ Migración Ejecutada Exitosamente

### 📊 Resumen de Cambios

#### 1. **Modelos Actualizados**

##### Income (Ingresos)
```javascript
paymentMethod: ENUM {
  'Cap Trabajos Septic',
  'Capital Proyectos Septic',
  'Chase Bank',
  'AMEX',
  'Chase Credit Card',
  'Cheque',
  'Transferencia Bancaria',
  'Efectivo',
  'Zelle',
  'Tarjeta Débito',
  'PayPal',
  'Otro'
}
paymentDetails: STRING (opcional) - Detalles adicionales
verified: BOOLEAN (default: false) - Verificación financiera
```

##### Expense (Gastos)
```javascript
typeExpense: ENUM {
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
}

paymentMethod: ENUM (mismo que Income)
paymentDetails: STRING (opcional)
verified: BOOLEAN (default: false)
```

##### Receipt (Comprobantes)
```javascript
type: ENUM {
  'Factura Pago Inicial Budget',
  'Factura Pago Final Budget',
  'Materiales',
  'Diseño',
  'Workers',
  'Comisión Vendedor',
  'Imprevistos',
  'Comprobante Gasto',
  'Comprobante Ingreso',
  'Gastos Generales',
  'Materiales Iniciales',
  'Inspección Inicial',
  'Inspección Final',
  'Gasto Fijo' // 🆕 NUEVO - coincide con Expense
}
```

#### 2. **Nuevo Modelo: FixedExpense (Gastos Fijos)**

```javascript
{
  idFixedExpense: UUID (PK),
  name: STRING (required) - "Alquiler Oficina", "Seguro Vehículo"
  description: TEXT (opcional),
  amount: DECIMAL(10,2) (required),
  
  frequency: ENUM {
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time'
  } DEFAULT 'monthly',
  
  paymentMethod: ENUM (mismo que Income/Expense),
  paymentDetails: STRING (opcional),
  
  category: ENUM {
    'Alquiler',
    'Servicios Públicos',
    'Seguros',
    'Salarios',
    'Suscripciones',
    'Mantenimiento',
    'Impuestos',
    'Otro'
  } DEFAULT 'Otro',
  
  nextDueDate: DATE (opcional),
  isActive: BOOLEAN DEFAULT true,
  autoGenerate: BOOLEAN DEFAULT false,
  notes: TEXT (opcional)
}
```

---

## 🎯 Métodos de Pago Disponibles

### Cuentas Bancarias
- **Cap Trabajos Septic** - Cuenta capital de trabajos
- **Capital Proyectos Septic** - Cuenta capital de proyectos
- **Chase Bank** - Cuenta bancaria Chase

### Tarjetas
- **AMEX** - American Express
- **Chase Credit Card** - Tarjeta de crédito Chase
- **Tarjeta Débito** - Tarjeta de débito genérica

### Otros Métodos
- **Cheque** - Pago con cheque
- **Transferencia Bancaria** - Wire transfer / ACH
- **Efectivo** - Cash
- **Zelle** - Pago por Zelle
- **PayPal** - Pago por PayPal
- **Otro** - Otros métodos (especificar en paymentDetails)

---

## 📝 Cómo Usar el Sistema

### 1. **Crear un Ingreso**
```javascript
POST /api/incomes
{
  "date": "2025-10-09",
  "amount": 5000.00,
  "typeIncome": "Factura Pago Inicial Budget",
  "paymentMethod": "Chase Bank", // ✅ AHORA OBLIGATORIO
  "paymentDetails": "Transfer #123456", // Opcional
  "notes": "Pago inicial Budget #2286",
  "workId": "uuid-del-trabajo",
  "staffId": "uuid-del-staff",
  "verified": false
}
```

### 2. **Crear un Gasto**
```javascript
POST /api/expenses
{
  "date": "2025-10-09",
  "amount": 1500.00,
  "typeExpense": "Materiales",
  "paymentMethod": "AMEX", // ✅ AHORA OBLIGATORIO
  "paymentDetails": "Card ending in 1234", // Opcional
  "notes": "Materiales para Work #123",
  "workId": "uuid-del-trabajo",
  "staffId": "uuid-del-staff",
  "verified": false
}
```

### 3. **Crear un Gasto Fijo**
```javascript
POST /api/fixed-expenses
{
  "name": "Alquiler Oficina",
  "description": "Alquiler mensual de oficina principal",
  "amount": 2000.00,
  "frequency": "monthly",
  "paymentMethod": "Cap Trabajos Septic",
  "paymentDetails": "Auto-debit on 1st",
  "category": "Alquiler",
  "nextDueDate": "2025-11-01",
  "isActive": true,
  "autoGenerate": false,
  "notes": "Renovar contrato en Diciembre"
}
```

### 4. **Crear un Comprobante**
```javascript
POST /api/receipts
{
  "relatedModel": "Expense",
  "relatedId": "uuid-del-expense",
  "type": "Materiales", // ✅ Debe coincidir con typeExpense
  "notes": "Factura de Home Depot",
  // + archivo adjunto (PDF/imagen)
}
```

---

## 🔍 Verificación Financiera

### Marcar como Verificado
```javascript
PATCH /api/incomes/:id
{
  "verified": true
}

PATCH /api/expenses/:id
{
  "verified": true
}
```

### Filtrar por Estado de Verificación
```javascript
GET /api/incomes?verified=false  // Ingresos no verificados
GET /api/expenses?verified=true  // Gastos verificados
```

---

## 📊 Reportes y Consultas

### Balance General
```javascript
GET /api/balance/general
// Retorna todos los ingresos y gastos con sus métodos de pago
```

### Gastos Fijos Activos
```javascript
GET /api/fixed-expenses?isActive=true
```

### Gastos Fijos Próximos a Vencer
```javascript
GET /api/fixed-expenses/upcoming
// Retorna gastos fijos cuya nextDueDate sea dentro de los próximos 7 días
```

---

## 🎨 Próximos Pasos Frontend

### 1. **Agregar Selector de Método de Pago**
```jsx
<select name="paymentMethod" required>
  <optgroup label="Cuentas Bancarias">
    <option value="Cap Trabajos Septic">Cap Trabajos Septic</option>
    <option value="Capital Proyectos Septic">Capital Proyectos Septic</option>
    <option value="Chase Bank">Chase Bank</option>
  </optgroup>
  <optgroup label="Tarjetas">
    <option value="AMEX">AMEX</option>
    <option value="Chase Credit Card">Chase Credit Card</option>
    <option value="Tarjeta Débito">Tarjeta Débito</option>
  </optgroup>
  <optgroup label="Otros">
    <option value="Cheque">Cheque</option>
    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
    <option value="Efectivo">Efectivo</option>
    <option value="Zelle">Zelle</option>
    <option value="PayPal">PayPal</option>
    <option value="Otro">Otro</option>
  </optgroup>
</select>

<input 
  type="text" 
  name="paymentDetails" 
  placeholder="Check #, últimos 4 dígitos, etc." 
/>
```

### 2. **Dashboard de Gastos Fijos**
- Listado de gastos fijos activos
- Próximos pagos (calendario)
- Botón "Generar Gasto" que crea un Expense desde el FixedExpense
- Historial de pagos

### 3. **Panel de Verificación Financiera**
- Vista de ingresos/gastos no verificados
- Checkbox para marcar como verificado
- Filtros por método de pago
- Reportes por cuenta/tarjeta

---

## ✅ Estado Actual

- ✅ Modelos actualizados con ENUM de paymentMethod
- ✅ Campo `verified` agregado a Income y Expense
- ✅ Tabla FixedExpenses creada
- ✅ ENUMs sincronizados entre Income, Expense y Receipt
- ✅ Migración ejecutada exitosamente en la base de datos

---

## 🚨 Importante

1. **TODOS** los ingresos y gastos nuevos **DEBEN** especificar `paymentMethod`
2. Los gastos fijos se crean en `FixedExpenses` y cuando se pagan, se crea un `Expense` con `typeExpense: 'Gasto Fijo'`
3. Los comprobantes deben tener un `type` que coincida con el `typeExpense` o `typeIncome` correspondiente
4. El campo `verified` ayuda al equipo de finanzas a revisar y aprobar transacciones

---

## 📞 Soporte

Si necesitas agregar más métodos de pago o categorías de gastos fijos, solo necesitas:
1. Agregar el valor al ENUM en el modelo
2. Crear y ejecutar una migración con `ALTER TYPE ... ADD VALUE`
