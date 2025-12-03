# PLAN DE DEPLOYMENT - FIXES DE DASHBOARD FINANCIERO
**Fecha**: 2025-12-03
**Rama**: yani79

## CAMBIOS IMPLEMENTADOS

### 1. Expenses con pago en efectivo/cuentas bancarias → automáticamente 'paid'
- **Archivo**: `expenseController.js`
- **Cambio**: Cuando se crea BankTransaction, marcar Expense como `paymentStatus='paid'`
- **Razón**: Dashboard solo cuenta Expenses con status 'paid'

### 2. Pagos a proveedores → vincular a invoice para evitar doble conteo
- **Archivos**: `supplierInvoiceController.js`
- **Cambio**: Establecer `supplierInvoiceItemId` al crear Expense desde pago de proveedor
- **Razón**: Dashboard estaba contando Expense + SupplierInvoice = doble gasto

### 3. Pagos de tarjetas → vincular BankTransaction a SupplierInvoice
- **Cambio**: BankTransactions de pagos Chase/AMEX deben tener `relatedCreditCardPaymentId`
- **Razón**: Dashboard cuenta estos pagos para mostrar separadamente

### 4. Fix frontend - Works no cargaban en PayInvoiceModal
- **Archivo**: `PayInvoiceModal.jsx`
- **Cambio**: Manejar respuesta paginada del endpoint `/work`

### 5. Actualizar modelo de datos
- **Archivo**: `Expense.js`
- **Cambio**: Foreign key `supplierInvoiceItemId` debe apuntar a `SupplierInvoices` en vez de `SupplierInvoiceItems`

---

## MIGRACIONES NECESARIAS EN PRODUCCIÓN

### ⚠️ ORDEN DE EJECUCIÓN (IMPORTANTE)

**PASO 1: Backup**
```bash
# En servidor de producción
pg_dump $DATABASE_URL > backup_dashboard_fix_$(date +%Y%m%d_%H%M%S).sql
```

**PASO 2: Migrar Foreign Key de Expenses**
```bash
cd BackZurcher
node migrate-supplier-invoice-fk.js
```
Esto:
- Limpia valores actuales de `supplierInvoiceItemId`
- Elimina constraint que apunta a `SupplierInvoiceItems`
- Crea nuevo constraint apuntando a `SupplierInvoices`

**PASO 3: Vincular Expenses a SupplierInvoices**
```bash
node update-supplier-expense-links.js
```
Esto vincula todos los Expenses que fueron creados desde pagos de proveedores a sus respectivos invoices.

**PASO 4: Vincular pagos de tarjetas**
```bash
node link-credit-card-payments.js
```
Esto vincula BankTransactions de pagos Chase/AMEX a sus SupplierInvoices correspondientes.

**PASO 5: Verificar resultado**
```bash
node verify-production-migration-needs.js
```
Debe mostrar: "✅ No se requieren migraciones"

---

## DEPLOYMENT DE CÓDIGO

### Archivos modificados:

**Backend:**
- `src/controllers/expenseController.js`
- `src/controllers/supplierInvoiceController.js`
- `src/data/models/Expense.js` ⚠️ **IMPORTANTE: Actualizar foreign key reference**

**Frontend:**
- `src/Components/SupplierInvoices/PayInvoiceModal.jsx`

### Commits a mergear:
```bash
git log --oneline origin/main..yani79
```

---

## ACTUALIZAR MODELO EXPENSE.JS

⚠️ **CRÍTICO**: Antes de deployar, actualizar el modelo:

```javascript
// En src/data/models/Expense.js
supplierInvoiceItemId: {
  type: DataTypes.UUID,
  allowNull: true,
  references: {
    model: 'SupplierInvoices',  // ← CAMBIAR de 'SupplierInvoiceItems'
    key: 'idSupplierInvoice'    // ← CAMBIAR de 'idItem'
  },
}
```

---

## VERIFICACIÓN POST-DEPLOYMENT

### 1. Crear gasto en efectivo
```
- Crear expense de $100 en "Efectivo"
- Verificar que aparece en dashboard inmediatamente
- Verificar BankTransaction creado en Caja Chica
```

### 2. Pagar proveedor
```
- Pagar invoice de $500 con "Chase Bank"
- Verificar que dashboard muestra $500 UNA SOLA VEZ
- NO debe duplicar (era el bug principal)
```

### 3. Pagar tarjeta de crédito
```
- Hacer pago de Chase Credit Card
- Verificar que aparece en "Pago Chase Credit Card" en dashboard
- Verificar BankTransaction tiene relatedCreditCardPaymentId
```

### 4. Verificar totales
```
- Dashboard debe mostrar totales correctos por método de pago
- Balance debe coincidir con BankAccounts
```

---

## ROLLBACK (si algo sale mal)

```bash
# Restaurar backup
psql $DATABASE_URL < backup_dashboard_fix_YYYYMMDD_HHMMSS.sql

# Revertir código
git checkout main
git push origin main --force
```

---

## SCRIPTS DE VERIFICACIÓN DISPONIBLES

- `verify-production-migration-needs.js` - Verifica qué migraciones se necesitan
- `check-supplier-payment-double-count.js` - Verifica doble conteo de proveedores
- `check-expense-payment-status.js` - Verifica paymentStatus de Expenses
- `check-efectivo-dashboard.js` - Verifica gastos en efectivo

---

## NOTAS IMPORTANTES

1. ✅ Los cambios son retrocompatibles - el código viejo seguirá funcionando durante la migración
2. ✅ Las migraciones son idempotentes - se pueden ejecutar múltiples veces sin problemas
3. ⚠️ El orden de ejecución es importante - seguir los pasos en orden
4. ✅ Fecha mínima del dashboard sigue siendo 2025-12-01 (no afecta datos anteriores)

---

## TIMELINE ESTIMADO

- Backup: 2 minutos
- Migraciones: 5 minutos total
- Deployment código: 3 minutos
- Verificación: 5 minutos
- **TOTAL: ~15 minutos**

---

## CONTACTO EN CASO DE PROBLEMAS

- Si falla migración de FK → restaurar backup y revisar constraint actual
- Si hay doble conteo → verificar que supplierInvoiceItemId esté poblado
- Si gastos no aparecen → verificar que paymentStatus sea 'paid'
