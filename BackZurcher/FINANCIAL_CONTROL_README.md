# 💰 Sistema de Control Financiero Detallado - Zurcher API

## 📋 Índice
- [Descripción General](#descripción-general)
- [Nuevas Funcionalidades](#nuevas-funcionalidades)
- [Métodos de Pago Disponibles](#métodos-de-pago-disponibles)
- [Gastos Fijos (Fixed Expenses)](#gastos-fijos-fixed-expenses)
- [API Endpoints](#api-endpoints)
- [Migración](#migración)
- [Uso en Frontend](#uso-en-frontend)

---

## 📝 Descripción General

Este sistema implementa un control financiero detallado que incluye:

✅ **Método de pago OBLIGATORIO** en todos los Income y Expense  
✅ **Gastos fijos recurrentes** (renta, servicios, seguros, etc.)  
✅ **Tracking de quien registra** cada transacción (staffId)  
✅ **Verificación de transacciones** (campo `verified`)  
✅ **Detalles adicionales** del método de pago (check #, últimos 4 dígitos, etc.)  
✅ **Estadísticas y reportes** por cuenta/método de pago

---

## 🆕 Nuevas Funcionalidades

### 1. **Métodos de Pago Estandarizados (ENUM)**

Ahora `Income.paymentMethod` y `Expense.paymentMethod` usan un ENUM con valores predefinidos:

#### Bancos/Cuentas:
- `Cap Trabajos Septic` - Cuenta de capital de trabajos
- `Capital Proyectos Septic` - Cuenta de capital de proyectos
- `Chase Bank` - Cuenta bancaria Chase

#### Tarjetas de Crédito:
- `AMEX` - American Express
- `Chase Credit Card` - Tarjeta de crédito Chase

#### Otros Métodos:
- `Cheque` - Pago con cheque
- `Transferencia Bancaria` - Transferencia bancaria
- `Efectivo` - Pago en efectivo
- `Zelle` - Pago por Zelle
- `Tarjeta Débito` - Tarjeta de débito
- `PayPal` - PayPal
- `Otro` - Otro método no listado

### 2. **Campo `paymentDetails`**

Campo adicional para especificar detalles del pago:
- Número de cheque: `"Check #1234"`
- Últimos 4 dígitos de tarjeta: `"**** 5678"`
- Referencia de transferencia: `"Ref: ABC123"`
- Etc.

### 3. **Gastos Fijos (FixedExpense)**

Nuevo modelo para gastos recurrentes con:
- Frecuencias: Semanal, Quincenal, Mensual, Trimestral, Semestral, Anual, Único
- Categorías: Renta, Servicios, Seguros, Salarios, etc.
- Auto-cálculo de próxima fecha de vencimiento
- Activación/Desactivación de gastos
- Opción de crear automáticamente Expenses cuando vencen

---

## 💳 Métodos de Pago Disponibles

### Uso en Frontend (React)

```javascript
import { PAYMENT_METHODS_ARRAY } from '../constants/paymentMethods';

// En un select
<select name="paymentMethod" required>
  <option value="">Seleccione método de pago</option>
  {PAYMENT_METHODS_ARRAY.map(method => (
    <option key={method.value} value={method.value}>
      {method.label}
    </option>
  ))}
</select>
```

### Constantes Disponibles

Archivo: `BackZurcher/src/constants/paymentMethods.js`

```javascript
const { PAYMENT_METHODS, PAYMENT_METHODS_ARRAY } = require('../constants/paymentMethods');

// Usar en validaciones
if (paymentMethod === PAYMENT_METHODS.CHASE_BANK) {
  // Lógica específica para Chase Bank
}
```

---

## 🔄 Gastos Fijos (Fixed Expenses)

### Modelo FixedExpense

```javascript
{
  idFixedExpense: UUID,
  name: 'Renta de Oficina',
  description: 'Renta mensual de oficina en Main St',
  amount: 1500.00,
  frequency: 'monthly', // weekly, biweekly, monthly, quarterly, semiannual, annual, one_time
  category: 'Renta', // Ver categorías completas abajo
  paymentMethod: 'Chase Bank',
  paymentAccount: '****1234', // Opcional
  startDate: '2025-01-01',
  endDate: null, // null = indefinido
  nextDueDate: '2025-11-01', // Auto-calculado
  isActive: true,
  autoCreateExpense: false, // Si es true, crea Expense automáticamente
  vendor: 'ABC Properties LLC',
  accountNumber: 'ACC-12345',
  notes: 'Contrato hasta Dic 2026',
  createdByStaffId: 'uuid-staff'
}
```

### Categorías de Gastos Fijos

- `Renta` - Renta de oficina/local
- `Servicios` - Luz, Agua, Gas, Internet
- `Seguros` - Seguros varios
- `Salarios` - Pagos de nómina
- `Equipamiento` - Equipos y herramientas
- `Software/Subscripciones` - Software, SaaS
- `Mantenimiento Vehicular` - Mantenimiento de vehículos
- `Combustible` - Gasolina, diesel
- `Impuestos` - Pagos de impuestos
- `Contabilidad/Legal` - Servicios profesionales
- `Marketing` - Publicidad y marketing
- `Telefonía` - Servicios de teléfono
- `Otros` - Otros gastos

### Frecuencias

```javascript
{
  weekly: 'Semanal',      // Cada 7 días
  biweekly: 'Quincenal',  // Cada 14 días
  monthly: 'Mensual',     // Cada mes
  quarterly: 'Trimestral', // Cada 3 meses
  semiannual: 'Semestral', // Cada 6 meses
  annual: 'Anual',        // Cada año
  one_time: 'Pago Único'  // No recurrente
}
```

---

## 🔌 API Endpoints

### Income (Ingresos)

```http
POST /api/income
Content-Type: application/json

{
  "date": "2025-10-09",
  "amount": 5000.00,
  "typeIncome": "Factura Pago Inicial Budget",
  "notes": "Pago inicial Budget #123",
  "workId": "uuid-work",
  "staffId": "uuid-staff",
  "paymentMethod": "Chase Bank", // ✅ OBLIGATORIO
  "paymentDetails": "Transferencia Ref: XYZ123", // Opcional
  "verified": false
}
```

### Expense (Gastos)

```http
POST /api/expense
Content-Type: application/json

{
  "date": "2025-10-09",
  "amount": 1200.00,
  "typeExpense": "Materiales",
  "notes": "Materiales para obra #456",
  "workId": "uuid-work",
  "staffId": "uuid-staff",
  "paymentMethod": "AMEX", // ✅ OBLIGATORIO
  "paymentDetails": "Tarjeta **** 5678", // Opcional
  "verified": false
}
```

### Fixed Expense (Gastos Fijos)

#### Crear Gasto Fijo
```http
POST /api/fixed-expense
Content-Type: application/json

{
  "name": "Renta de Oficina",
  "description": "Renta mensual de oficina principal",
  "amount": 1500.00,
  "frequency": "monthly",
  "category": "Renta",
  "paymentMethod": "Chase Bank",
  "paymentAccount": "Cuenta ****1234",
  "startDate": "2025-01-01",
  "vendor": "ABC Properties LLC",
  "notes": "Contrato renovable anualmente",
  "createdByStaffId": "uuid-staff"
}
```

#### Listar Gastos Fijos
```http
GET /api/fixed-expense?isActive=true&category=Renta
```

#### Obtener Gastos Próximos a Vencer
```http
GET /api/fixed-expense/upcoming?days=30
```

#### Activar/Desactivar Gasto Fijo
```http
PATCH /api/fixed-expense/:id/toggle-status
Content-Type: application/json

{
  "isActive": false
}
```

---

## 🔄 Migración

### Ejecutar Migración

```bash
cd BackZurcher
node migrate.js add-fixed-expenses-and-payment-methods
```

### Lo que hace la migración:

1. ✅ Convierte `paymentMethod` de STRING a ENUM en Income
2. ✅ Convierte `paymentMethod` de STRING a ENUM en Expense
3. ✅ Agrega campo `paymentDetails` a Income y Expense
4. ✅ Crea tabla `FixedExpenses`
5. ✅ Crea índices para mejorar rendimiento
6. ✅ Intenta mapear valores antiguos a los nuevos ENUMs

### Rollback (si es necesario)

```bash
# La migración tiene rollback automático
# Si hay error, revertirá todos los cambios
```

---

## 💻 Uso en Frontend

### 1. Componente de Select para Método de Pago

```jsx
// components/PaymentMethodSelect.jsx
import React from 'react';

const PAYMENT_METHODS = [
  { value: 'Cap Trabajos Septic', label: 'Cap de Trabajos Septic', icon: '🏦' },
  { value: 'Capital Proyectos Septic', label: 'Capital de Proyectos Septic', icon: '🏦' },
  { value: 'Chase Bank', label: 'Chase Bank', icon: '🏦' },
  { value: 'AMEX', label: 'AMEX', icon: '💳' },
  { value: 'Chase Credit Card', label: 'Chase Credit Card', icon: '💳' },
  { value: 'Cheque', label: 'Cheque', icon: '🧾' },
  { value: 'Transferencia Bancaria', label: 'Transferencia Bancaria', icon: '↔️' },
  { value: 'Efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'Zelle', label: 'Zelle', icon: '📱' },
  { value: 'Tarjeta Débito', label: 'Tarjeta Débito', icon: '💳' },
  { value: 'PayPal', label: 'PayPal', icon: '🅿️' },
  { value: 'Otro', label: 'Otro', icon: '📝' }
];

const PaymentMethodSelect = ({ value, onChange, required = true }) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Método de Pago {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Seleccione método de pago</option>
        {PAYMENT_METHODS.map(method => (
          <option key={method.value} value={method.value}>
            {method.icon} {method.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PaymentMethodSelect;
```

### 2. Formulario de Gasto con Método de Pago

```jsx
// Example usage in ExpenseForm
import PaymentMethodSelect from './PaymentMethodSelect';

const [expenseData, setExpenseData] = useState({
  date: '',
  amount: '',
  typeExpense: '',
  notes: '',
  paymentMethod: '', // ✅ OBLIGATORIO
  paymentDetails: ''
});

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!expenseData.paymentMethod) {
    alert('Debe seleccionar un método de pago');
    return;
  }
  
  try {
    await axios.post('/api/expense', expenseData);
    alert('Gasto registrado exitosamente');
  } catch (error) {
    if (error.response?.data?.error === 'El método de pago es obligatorio') {
      alert('Error: Debe seleccionar un método de pago');
    }
  }
};

return (
  <form onSubmit={handleSubmit}>
    {/* ... otros campos ... */}
    
    <PaymentMethodSelect
      value={expenseData.paymentMethod}
      onChange={(e) => setExpenseData({...expenseData, paymentMethod: e.target.value})}
      required
    />
    
    <div>
      <label>Detalles del Pago (opcional)</label>
      <input
        type="text"
        placeholder="Ej: Check #1234, Tarjeta **** 5678"
        value={expenseData.paymentDetails}
        onChange={(e) => setExpenseData({...expenseData, paymentDetails: e.target.value})}
      />
    </div>
    
    <button type="submit">Registrar Gasto</button>
  </form>
);
```

### 3. Dashboard de Gastos Fijos

```jsx
// components/FixedExpenseDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FixedExpenseDashboard = () => {
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFixedExpenses();
  }, []);

  const loadFixedExpenses = async () => {
    try {
      const response = await axios.get('/api/fixed-expense?isActive=true');
      setFixedExpenses(response.data.fixedExpenses);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error cargando gastos fijos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gastos Fijos</h1>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total de Gastos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.monthlyTotal)}</div>
          <div className="text-sm text-gray-600">Gastos Mensuales</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalCommitment)}</div>
          <div className="text-sm text-gray-600">Compromiso Mensual Total</div>
        </div>
      </div>

      {/* Lista de gastos fijos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próximo Pago</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método de Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fixedExpenses.map(expense => (
              <tr key={expense.idFixedExpense}>
                <td className="px-6 py-4">{expense.name}</td>
                <td className="px-6 py-4">{expense.category}</td>
                <td className="px-6 py-4">{formatCurrency(expense.amount)}</td>
                <td className="px-6 py-4">{expense.frequency}</td>
                <td className="px-6 py-4">{expense.nextDueDate}</td>
                <td className="px-6 py-4">{expense.paymentMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FixedExpenseDashboard;
```

---

## ✅ Checklist de Implementación

### Backend
- [x] Crear modelo FixedExpense
- [x] Crear constantes de paymentMethods
- [x] Actualizar modelos Income y Expense con ENUM
- [x] Crear migración
- [x] Crear controlador fixedExpenseController
- [x] Crear rutas fixedExpenseRoutes
- [x] Agregar validación de paymentMethod obligatorio
- [x] Actualizar balanceController para incluir paymentMethod

### Frontend (Pendiente)
- [ ] Crear componente PaymentMethodSelect
- [ ] Actualizar formularios de Income para incluir select de método de pago
- [ ] Actualizar formularios de Expense para incluir select de método de pago
- [ ] Crear componente FixedExpenseDashboard
- [ ] Crear formulario para crear/editar gastos fijos
- [ ] Agregar visualización de gastos próximos a vencer
- [ ] Agregar filtros por método de pago en reportes
- [ ] Agregar reportes por cuenta/método de pago

---

## 📊 Reportes Sugeridos

1. **Balance por Método de Pago**
   - Total de ingresos por cada cuenta
   - Total de gastos por cada cuenta
   - Balance neto por cuenta

2. **Gastos Fijos Próximos**
   - Alertas de gastos que vencen en los próximos 7/15/30 días
   - Total de compromisos próximos

3. **Transacciones No Verificadas**
   - Lista de Income/Expense con `verified: false`
   - Filtro por staff que registró

4. **Análisis de Gastos Fijos**
   - Gráfico de distribución por categoría
   - Proyección de gastos anuales
   - Comparativa mensual vs. gastos variables

---

## 🚨 Notas Importantes

1. **Migración Obligatoria**: Antes de usar el sistema, debes ejecutar la migración
2. **paymentMethod es OBLIGATORIO**: Todos los nuevos Income y Expense deben tener método de pago
3. **Datos Antiguos**: La migración intentará mapear datos antiguos, pero revisa los registros con `paymentMethod = 'Otro'`
4. **Gastos Fijos**: Considera configurar un cron job para auto-crear Expenses cuando `autoCreateExpense = true`

---

## 🆘 Soporte

Si tienes problemas:
1. Verifica que la migración se ejecutó correctamente
2. Revisa los logs del backend para errores de validación
3. Asegúrate de que el frontend está enviando `paymentMethod` en todas las requests

---

**Última actualización**: 2025-10-09  
**Versión**: 1.0.0
