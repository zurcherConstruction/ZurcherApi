# 🚀 Guía de Deployment: Chase Credit Card System

## ⚠️ IMPORTANTE - Leer Antes de Ejecutar

Este sistema permite tracking de gastos de Chase Credit Card con:
- Cargos automáticos (crean Expenses)
- Pagos con sistema FIFO (paga expenses más antiguos primero)
- Tracking de pagos parciales
- Balance en tiempo real

## 📋 Pre-Requisitos

### 1. Backup de Base de Datos ✅ CRÍTICO
```powershell
# Opción A: Desde Railway Dashboard
# 1. Ir a tu proyecto en Railway
# 2. Seleccionar PostgreSQL service
# 3. Data tab → Export Database

# Opción B: Usar script de backup (si está configurado)
cd BackZurcher
./backup-production.ps1
```

### 2. Verificar Estado Actual
```bash
cd BackZurcher
node verify-production-readiness.js
```

Este script te mostrará:
- ✅ Cuántos expenses con Chase Credit Card existen
- ✅ Sus estados actuales
- ✅ Qué migraciones necesitas ejecutar
- ✅ Impacto de cada migración

## 🔧 Deployment Step-by-Step

### PASO 1: Ejecutar Migraciones en Producción

**Opción A - Script Automático (RECOMENDADO):**
```bash
# Conectar a base de datos de producción
# Asegúrate que tu .env apunte a producción

node deploy-chase-credit-card.js
```

Este script:
- ✅ Ejecuta las 3 migraciones en orden
- ✅ Verifica cada una después de aplicarla
- ✅ Da pausas entre migraciones
- ✅ Muestra resumen final

**Opción B - Manual (Una por una):**
```bash
# 1. Campos de tarjeta en SupplierInvoices
node run-credit-card-migration.js

# 2. Campo paidAmount en Expenses
node run-paid-amount-migration.js

# 3. Valor 'partial' en ENUM
node run-partial-status-migration.js
```

### PASO 2: Deploy del Código

```bash
# 1. Asegúrate que estás en branch yani64
git status

# 2. Commit cualquier cambio pendiente
git add .
git commit -m "feat: Chase Credit Card tracking system with FIFO payments"

# 3. Merge a main
git checkout main
git merge yani64

# 4. Push a GitHub (Railway auto-deploys)
git push origin main
```

### PASO 3: Verificación Post-Deploy

#### 3.1 Verificar Deployment en Railway
1. Ir a Railway Dashboard
2. Verificar que deployment terminó exitosamente
3. Revisar logs en tiempo real

#### 3.2 Smoke Test - Backend
```bash
# Test 1: Verificar balance
curl -X GET "https://tu-api.railway.app/supplier-invoices/credit-card/balance" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Debe retornar:
# {
#   "success": true,
#   "currentBalance": 2755,
#   "statistics": {...},
#   "transactions": [...]
# }
```

#### 3.3 Smoke Test - Frontend
1. Login a la aplicación
2. Ir a "Cuentas por Pagar"
3. Click en tab "Chase Credit Card"
4. Verificar que muestra:
   - ✅ Balance actual
   - ✅ Estadísticas (total cargos, pagos, transacciones)
   - ✅ Lista de transacciones existentes

#### 3.4 Test de Transacción de Prueba
```bash
# Crear un cargo de $1 (prueba)
curl -X POST "https://tu-api.railway.app/supplier-invoices/credit-card/transaction" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionType": "charge",
    "description": "Test cargo - favor ignorar",
    "amount": 1,
    "vendor": "Test Vendor",
    "date": "2025-11-08"
  }'

# Verificar que balance incrementó en $1
# Verificar que se creó un Expense en la base de datos
```

## 🔍 Queries de Verificación

### Verificar Expenses con Chase Credit Card
```sql
SELECT 
  "idExpense",
  date,
  amount,
  "paidAmount",
  "paymentStatus",
  vendor,
  notes
FROM "Expenses"
WHERE "paymentMethod" = 'Chase Credit Card'
ORDER BY date DESC
LIMIT 10;
```

### Verificar Balance Calculado
```sql
-- Balance = Suma de (amount - paidAmount)
SELECT 
  COUNT(*) as total_expenses,
  SUM(amount) as total_charges,
  SUM("paidAmount") as total_paid,
  SUM(amount - "paidAmount") as current_balance
FROM "Expenses"
WHERE "paymentMethod" = 'Chase Credit Card';
```

### Verificar Transacciones de Tarjeta
```sql
SELECT 
  "idSupplierInvoice",
  "transactionType",
  "issueDate",
  "totalAmount",
  "balanceAfter",
  notes
FROM "SupplierInvoices"
WHERE "isCreditCard" = true
ORDER BY "issueDate" DESC;
```

## 🐛 Troubleshooting

### Error: "enum_Expenses_paymentStatus no existe"
**Solución:** Ejecutar migración 3
```bash
node run-partial-status-migration.js
```

### Error: "paidAmount column does not exist"
**Solución:** Ejecutar migración 2
```bash
node run-paid-amount-migration.js
```

### Balance no cuadra
**Diagnóstico:**
```bash
node check-chase-balance.js
```
Este script muestra:
- Todos los expenses con Chase Credit Card
- Sus montos y estados
- Cálculo detallado del balance

### Transacciones no aparecen en UI
**Verificar:**
1. Backend logs en Railway
2. Console del navegador (F12)
3. Endpoint: `GET /credit-card/balance` retorna data
4. Componente frontend sin errores

## 📊 Impacto de las Migraciones

### Migración 1: add-credit-card-transaction-fields
- **Tabla:** SupplierInvoices
- **Cambios:** Agrega 3 campos nuevos
- **Impacto:** ✅ BAJO - No modifica datos existentes
- **Rollback:** Difícil (requiere drop columns)

### Migración 2: add-paid-amount-to-expenses
- **Tabla:** Expenses
- **Cambios:** 
  - Agrega campo `paidAmount`
  - Actualiza expenses con status 'paid' o 'paid_via_invoice'
- **Impacto:** ⚠️ MEDIO - Modifica expenses pagados
- **Datos modificados:** ~X expenses (ver verify-production-readiness.js)
- **Rollback:** Difícil (requiere drop column)

### Migración 3: add-partial-payment-status
- **Tabla:** Expenses (ENUM)
- **Cambios:** Agrega valor 'partial' al ENUM
- **Impacto:** ✅ BAJO - No modifica datos existentes
- **Rollback:** Imposible (PostgreSQL no permite eliminar valores de ENUM)

## 🔒 Seguridad

### Datos que NO se modifican:
- ✅ Expenses existentes mantienen sus montos originales
- ✅ Estados de payment no cambian (salvo si se crean pagos nuevos)
- ✅ SupplierInvoices existentes no se tocan

### Datos que SÍ se modifican:
- ⚠️ Expenses con status 'paid' o 'paid_via_invoice' → `paidAmount` se setea = `amount`
- ⚠️ Expenses con status 'unpaid' → `paidAmount` se setea = 0

## 📞 Soporte

Si algo sale mal:
1. **NO PÁNICO** - Tienes backup
2. Revisar logs de Railway
3. Ejecutar queries de verificación
4. Si es necesario, restaurar backup
5. Contactar al equipo

## ✅ Checklist Final

Antes de dar por terminado:
- [ ] Backup de base de datos creado
- [ ] Migraciones ejecutadas exitosamente
- [ ] Código deployed a producción
- [ ] Smoke tests pasaron
- [ ] Balance es correcto
- [ ] Transacción de prueba funciona
- [ ] Logs sin errores
- [ ] Equipo notificado del cambio

---

**Fecha de creación:** 2025-11-08  
**Branch:** yani64  
**Autor:** Sistema de Tracking Chase Credit Card
