# 🚀 Guía de Deployment a Producción

## 📋 Orden de Ejecución de Migraciones

### ✅ Paso 1: Cuentas Bancarias (Bank Accounts)

```bash
# 1.1 Crear tabla BankAccounts
node migrations/20251118-create-bank-accounts.js
```
**Qué hace:** Crea la tabla `BankAccounts` con todas las columnas necesarias.

---

### ✅ Paso 2: Transacciones Bancarias (Bank Transactions)

```bash
# 1.2 Crear tabla BankTransactions
node migrations/20251118-create-bank-transactions.js
```
**Qué hace:** Crea la tabla `BankTransactions` con relación a `BankAccounts`.

---

### ✅ Paso 3: Seed de Cuentas Iniciales

```bash
# 1.3 Crear las 4 cuentas principales (con balance en $0.00)
node seed-bank-accounts.js
```
**Qué hace:** 
- Crea las 4 cuentas bancarias principales
- Balance inicial: `$0.00` para todas
- Cuentas: Chase Bank, Cap Trabajos Septic, Capital Proyectos Septic, Caja Chica

---

### ⚠️ Paso 4: CONFIGURAR Balances Reales (CRÍTICO)

**ANTES de ejecutar el siguiente script:**

1. **Revisa los estados de cuenta bancarios ACTUALES**
2. **Cuenta el efectivo en Caja Chica**
3. **Edita el archivo `set-initial-bank-balances.js`**

```javascript
// EDITAR ESTAS LÍNEAS con los valores REALES:
const REAL_BALANCES = [
  {
    accountName: 'Chase Bank',
    realBalance: 15234.50,  // ⚠️ CAMBIAR POR EL VALOR REAL
    description: 'Balance inicial registrado al momento de implementar el sistema'
  },
  {
    accountName: 'Cap Trabajos Septic',
    realBalance: 8920.75,  // ⚠️ CAMBIAR POR EL VALOR REAL
    description: 'Balance inicial registrado al momento de implementar el sistema'
  },
  {
    accountName: 'Capital Proyectos Septic',
    realBalance: 22456.00,  // ⚠️ CAMBIAR POR EL VALOR REAL
    description: 'Balance inicial registrado al momento de implementar el sistema'
  },
  {
    accountName: 'Caja Chica',
    realBalance: 500.00,  // ⚠️ CAMBIAR POR EL VALOR REAL
    description: 'Efectivo inicial contado al momento de implementar el sistema'
  }
];
```

4. **Ejecutar el script:**

```bash
# 1.4 Establecer balances reales iniciales
node set-initial-bank-balances.js
```

**Qué hace:**
- Actualiza `currentBalance` de cada cuenta con el monto REAL
- Crea una transacción de tipo `initial_balance` para cada cuenta
- Establece el punto de partida del sistema de tracking

⚠️ **MUY IMPORTANTE:** Este script debe ejecutarse **UNA SOLA VEZ** en producción.

---

### ✅ Paso 5: Checklists de Works

```bash
# 1.5 Crear tabla WorkChecklists
node create-work-checklists-table.js
```
**Qué hace:** Crea la tabla `WorkChecklists` con relación a `Works` y `Staffs`.

---

## 📊 Resumen del Orden Completo

```bash
# 1. Tablas de cuentas bancarias
node migrations/20251118-create-bank-accounts.js

# 2. Tablas de transacciones bancarias
node migrations/20251118-create-bank-transactions.js

# 3. Seed de cuentas (balance $0.00)
node seed-bank-accounts.js

# 4. ⚠️ EDITAR set-initial-bank-balances.js CON VALORES REALES
# Luego ejecutar:
node set-initial-bank-balances.js

# 5. Crear tabla de checklists
node create-work-checklists-table.js
```

---

## 🧪 Prueba Local ANTES de Producción

### 1. Verificar que las tablas se crearon correctamente

Conectarse a PostgreSQL y ejecutar:

```sql
-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('BankAccounts', 'BankTransactions', 'WorkChecklists');

-- Ver cuentas bancarias
SELECT "accountName", "currentBalance", "isActive" 
FROM "BankAccounts";

-- Ver transacciones iniciales
SELECT bt."id", ba."accountName", bt."transactionType", bt."amount", bt."description"
FROM "BankTransactions" bt
JOIN "BankAccounts" ba ON bt."bankAccountId" = ba."id"
WHERE bt."transactionType" = 'initial_balance';

-- Ver checklists
SELECT COUNT(*) as total FROM "WorkChecklists";
```

### 2. Verificar desde la aplicación

1. **Backend:** Reiniciar servidor
```bash
npm run dev
```

2. **Frontend:** Abrir en navegador y verificar:
   - ✅ Progress Tracker muestra badges de checklist
   - ✅ Modal de checklist funciona
   - ✅ Solo owner puede editar
   - ✅ (Cuando implementes frontend de bancos) Ver cuentas bancarias con balances correctos

---

## 🔍 Validaciones Pre-Producción

### Checklist de Verificación:

- [ ] Todas las migraciones ejecutadas sin errores
- [ ] `BankAccounts` tiene 4 cuentas
- [ ] Balances de cuentas coinciden con estados de cuenta reales
- [ ] `BankTransactions` tiene 4 transacciones de tipo `initial_balance`
- [ ] `WorkChecklists` tabla creada correctamente
- [ ] Backend reiniciado y funciona sin errores
- [ ] Frontend carga checklists correctamente
- [ ] Permisos de owner funcionan correctamente

---

## 🚨 Troubleshooting

### Error: "Table already exists"
```bash
# Verificar si la tabla existe
psql -U postgres -d ZurcherConstruction -c "\dt"

# Si existe y quieres recrearla (⚠️ CUIDADO - solo en desarrollo):
# DROP TABLE "NombreTabla" CASCADE;
```

### Error: "Column does not exist"
```bash
# Verificar estructura de tabla
psql -U postgres -d ZurcherConstruction -c "\d+ BankAccounts"
```

### Balances no coinciden
1. Revisar transacciones creadas:
```sql
SELECT * FROM "BankTransactions" WHERE "transactionType" = 'initial_balance';
```

2. Verificar si se ejecutó dos veces:
```sql
SELECT "bankAccountId", COUNT(*) 
FROM "BankTransactions" 
WHERE "transactionType" = 'initial_balance'
GROUP BY "bankAccountId"
HAVING COUNT(*) > 1;
```

### Checklists no aparecen en frontend
1. Hard refresh: `Ctrl + Shift + R`
2. Verificar Redux DevTools
3. Revisar consola del navegador
4. Verificar que backend responda: `GET /works/{workId}/checklist`

---

## 📝 Notas Importantes

### Sobre set-initial-bank-balances.js

- ⚠️ Ejecutar **UNA SOLA VEZ** en producción
- ✅ Tiene protección contra ejecución duplicada (warning de 5 segundos)
- ✅ Usa transacciones SQL (rollback si hay error)
- ✅ Crea registro auditable de balances iniciales

### Sobre los Balances

El script crea transacciones de tipo `initial_balance` que:
- Sirven como punto de partida para reconciliación
- Son auditables (quién, cuándo, cuánto)
- Permiten rastrear el historial completo desde el inicio

### Sistema de Tracking Bancario

Después de ejecutar estos scripts:
- ✅ Todas las transacciones nuevas deben registrarse en el sistema
- ✅ Los balances se actualizarán automáticamente
- ✅ Puedes reconciliar con estados de cuenta bancarios
- ✅ Tienes un historial completo desde el día 1

---

## 🎯 Resultado Esperado

Al finalizar todos los pasos, deberías tener:

```
Database: ZurcherConstruction (Producción)
├── BankAccounts (4 registros)
│   ├── Chase Bank              → $XX,XXX.XX (balance real)
│   ├── Cap Trabajos Septic     → $XX,XXX.XX (balance real)
│   ├── Capital Proyectos Septic → $XX,XXX.XX (balance real)
│   └── Caja Chica              → $XXX.XX (balance real)
│
├── BankTransactions (4+ registros)
│   ├── Initial Balance - Chase
│   ├── Initial Balance - Cap Trabajos
│   ├── Initial Balance - Capital Proyectos
│   └── Initial Balance - Caja Chica
│
└── WorkChecklists (0 registros, se crearán al usar)
    └── (Se crean automáticamente al abrir cada work)
```

---

## 📞 Soporte

Si encuentras algún error durante el deployment:
1. **NO continuar** con los siguientes scripts
2. Revisar logs del error
3. Verificar estado de la base de datos
4. Consultar sección de Troubleshooting

---

**✅ Sistema listo para producción cuando todos los pasos estén completos**
