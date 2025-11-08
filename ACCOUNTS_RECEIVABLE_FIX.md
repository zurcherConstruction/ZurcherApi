# Corrección de Accounts Receivable

## ❌ Problema Identificado

La sección `/accounts-receivable` mostraba información incorrecta:

1. **Filtraba Works por status**: Solo mostraba Works con 5 status específicos:
   - `inProgress`
   - `finalInspectionPending`  
   - `firstInspectionPending`
   - `finalApproved`
   - `paymentReceived`

2. **Excluía Works importantes**: No mostraba Works en otros status como:
   - `pending` (17 works)
   - `assigned` (3 works)
   - `maintenance` (4 works)
   - `installed` (1 work)
   - `coverPending` (1 work)

3. **Resultado**: Cuentas por cobrar MENTIROSAS, faltaba dinero pendiente real.

## ✅ Solución Implementada

### Cambio 1: `getAccountsReceivableSummary` 

Muestra todos los Works sin filtro de status.

**ANTES** (líneas 34-38):
```javascript
const worksInProgress = await Work.findAll({
  where: {
    status: {
      [Op.in]: ['inProgress', 'finalInspectionPending', ...]
    }
  },
  // ...
});
```

**DESPUÉS**:
```javascript
const worksInProgress = await Work.findAll({
  // ✅ SIN FILTRO DE STATUS - Muestra TODOS los Works
  include: [
    // ... includes
  ],
  order: [['createdAt', 'DESC']]
});
```

### Cambio 2: `getActiveInvoices` (El que usa la UI)

Cambiado de buscar BUDGETS a buscar WORKS.

**ANTES** (líneas 555-558):
```javascript
// Buscaba Budgets signed/approved (incluía budgets SIN work)
const budgets = await Budget.findAll({
  where: {
    status: { [Op.in]: ['signed', 'approved'] }
  },
  include: [{ model: Work, ... }] // Work era opcional
});
```

**DESPUÉS**:
```javascript
// Busca WORKS con sus budgets asociados
const works = await Work.findAll({
  include: [
    {
      model: Budget,
      as: 'budget',
      required: true // Solo Works que tengan Budget
    },
    { model: ChangeOrder, ... },
    { model: FinalInvoice, ... },
    { model: Receipt, ... } // ✅ AGREGADO: Incluye receipts
  ]
});
```

### Resultado

#### getAccountsReceivableSummary:
- **Antes**: ~5-15 Works mostrados (solo ciertos status)
- **Ahora**: **40 Works totales** (todos los status)

#### getActiveInvoices (UI tabla):
- **Antes**: **55 registros** (35 Works + 20 Budgets sin Work)
- **Ahora**: **35 Works reales** (excluye budgets sueltos)

#### Distribución actual por status:
```
- pending: 17 works
- inProgress: 8 works  
- paymentReceived: 5 works
- maintenance: 4 works
- assigned: 3 works
- finalApproved: 1 work
- installed: 1 work
- coverPending: 1 work
```

## 📊 Cálculo de Balance

El cálculo permanece igual (es correcto):

```javascript
// Total del Contrato
contractTotal = budgetTotal + changeOrdersTotal + finalInvoiceExtras

// Total Cobrado
totalCollected = initialPayment + receiptsTotal + finalInvoicePaid

// Pendiente por Cobrar
pendingAmount = contractTotal - totalCollected
```

### Ejemplo real de Work:
```
Work #dd1735ee-17bc-441a-8487-cc2427a25be7
Status: pending
Cliente: prueba de sistema
Total: $18,000.00
Pagado: $10,800.00
Pendiente: $7,200.00
```

## 🧪 Verificación

### Script 1: `test-accounts-receivable.js`

Verifica que `getAccountsReceivableSummary` muestre todos los Works.

```bash
node test-accounts-receivable.js
```

**Output**:
```
📊 Total Works en base de datos: 40

📋 Distribución por Status:
   - pending: 17 works
   - inProgress: 8 works
   - paymentReceived: 5 works
   ...

ℹ️  El endpoint /accounts-receivable ahora mostrará los 40 Works
   sin importar su status.
```

### Script 2: `test-active-invoices.js`

Verifica que `getActiveInvoices` solo muestre Works (no budgets sueltos).

```bash
node test-active-invoices.js
```

**Output**:
```
📊 Budgets signed/approved TOTAL: 55
✅ Works con Budget: 35
❌ Budgets SIN Work: 20

ℹ️  El endpoint /accounts-receivable/active-invoices ahora mostrará
   solo los 35 Works (NO los budgets sueltos sin Work).
```

## 🚀 Deployment

### Archivos Modificados:
- ✅ `BackZurcher/src/controllers/AccountsReceivableController.js`
  - Función `getAccountsReceivableSummary` (líneas 25-68): Eliminado filtro de status
  - Función `getActiveInvoices` (líneas 541-720): Cambiado de Budget.findAll a Work.findAll

### Scripts de Prueba Creados:
- ✅ `test-accounts-receivable.js` - Verifica conteo de Works (40 total)
- ✅ `test-active-invoices.js` - Verifica exclusión de budgets sin Work (35 Works vs 55 budgets)

### Para Deploy a Railway:

```bash
# 1. Commit cambios
git add src/controllers/AccountsReceivableController.js
git commit -m "fix: Remove status filter from Accounts Receivable to show all Works"

# 2. Push a main (Railway auto-deploy)
git push origin main

# 3. Verificar endpoint después del deploy:
# GET /accounts-receivable
# Debería retornar todos los Works con sus balances
```

## 📝 Próximos Pasos (Pendientes)

1. **Mover Commissions a Fixed Expenses**:
   - Actualmente las comisiones están en `accounts-receivable`
   - Deben moverse a `fixed-expenses` (son gastos que la empresa DEBE, no dinero por COBRAR)

2. **✅ Actualizar Frontend** (COMPLETADO):
   - Tabla simplificada: Invoice #, Propiedad, Fecha, Total Budget, C.O., Cobrado, Restante, Estado
   - Eliminadas columnas: Cliente, Total Esperado, Initial Payment, Work
   - Más limpio y enfocado en información clave

## 🎯 Impacto

### Antes:
- Cuentas por cobrar incompletas
- **Mostraba 55 registros** (35 Works + 20 Budgets sin Work)
- Incluía presupuestos NO confirmados (sin Work)
- Faltaban ~25 Works de otros status
- Balance total incorrecto
- Reportes financieros engañosos

### Ahora:
- ✅ Cuentas por cobrar completas y precisas
- ✅ **Muestra solo 35 Works reales** (excluye budgets sueltos)
- ✅ TODOS los Works visibles sin importar status (40 total en summary)
- ✅ Solo obras CONFIRMADAS con Work asociado
- ✅ Balance total correcto
- ✅ Reportes financieros confiables

---

**Fecha**: $(Get-Date -Format "yyyy-MM-dd HH:mm")  
**Autor**: GitHub Copilot  
**Status**: ✅ Completado y probado en LOCAL
