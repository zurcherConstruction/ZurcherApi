# 📦 Sistema de Migraciones - Resumen Completo

## 🎯 Archivos Creados

### 1. **Script de Migración Principal**
📄 `BackZurcher/migrations/complete-enum-migration.js`

**Propósito**: Migración completa que actualiza todos los ENUMs y agrega columnas necesarias.

**Cambios que aplica**:
- ✅ Agrega `sales_rep` a `Staff.role`
- ✅ Agrega `Comisión Vendedor` a `Expense.typeExpense`
- ✅ Agrega `Comisión Vendedor` a `Receipt.type`
- ✅ Agrega 8 columnas al modelo `Budget` para el sistema de comisiones
- ✅ Crea ENUM `enum_Budgets_leadSource`

**Características**:
- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin causar errores
- ✅ **Verificación previa**: Chequea si los valores ya existen antes de agregarlos
- ✅ **Transaccional**: Todo se aplica o se revierte (rollback automático en caso de error)
- ✅ **Logs detallados**: Muestra progreso paso a paso

---

### 2. **Script de Ejecución**
📄 `BackZurcher/run-migration.js` (actualizado)

**Propósito**: Runner para ejecutar cualquier migración disponible.

**Uso**:
```powershell
node run-migration.js complete-enum-migration
```

**Migraciones disponibles**:
- `add-budget-workflow-fields`
- `add-review-fields`
- `add-supplier-name-to-line-items`
- `add-legacy-fields`
- `add-sales-rep-role`
- `add-commission-fields`
- `add-commission-expense-type`
- `complete-enum-migration` ⭐ **RECOMENDADO**

---

### 3. **Script de Verificación**
📄 `BackZurcher/verify-migration.js`

**Propósito**: Verificar que la migración se ejecutó correctamente.

**Uso**:
```powershell
node verify-migration.js
```

**Qué verifica**:
- ✅ Existencia de `sales_rep` en Staff.role
- ✅ Existencia de `Comisión Vendedor` en Expense.typeExpense
- ✅ Existencia de `Comisión Vendedor` en Receipt.type
- ✅ Existencia de 8 columnas nuevas en Budget
- ✅ Existencia de ENUM `enum_Budgets_leadSource`
- ✅ Foreign Keys correctamente definidas
- 📊 Estadísticas de uso (Staff por rol, Gastos por tipo, etc.)

**Salida esperada**:
```
✅ ¡VERIFICACIÓN EXITOSA! Todos los cambios están aplicados correctamente.

🎉 Tu base de datos está lista para usar:
   • Crear usuarios con rol "sales_rep"
   • Registrar gastos tipo "Comisión Vendedor"
   • Rastrear comisiones en presupuestos
   • Adjuntar comprobantes de comisiones
```

---

### 4. **Guía de Migración**
📄 `MIGRATION_GUIDE.md`

**Propósito**: Documentación completa para ejecutar la migración.

**Contenido**:
- ⚠️ Prerrequisitos (backup, verificaciones)
- 🚀 Instrucciones paso a paso
- ✅ Checklist de verificación
- 🔄 Instrucciones de rollback
- 📊 Comparación antes/después de cada tabla
- 🐛 Solución de problemas comunes
- 📞 Información de soporte

---

### 5. **Guía de Feature Opcional**
📄 `OPTIONAL_WORK_FEATURE.md`

**Propósito**: Documentación del sistema de Work opcional para gastos/ingresos.

**Contenido**:
- 📋 Explicación de qué tipos pueden ser generales
- 🎨 Ejemplos de uso (UX)
- 🧪 Checklist de testing
- 🎯 Configuración para agregar más tipos generales

---

## 🔄 Flujo de Ejecución Recomendado

### Paso 1: Preparación
```powershell
# Backup de la base de datos
pg_dump -U postgres -d zurcher_db > backup_antes_migracion.sql

# Navegar al directorio del backend
cd C:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi\BackZurcher
```

### Paso 2: Ejecutar Migración
```powershell
# Ejecutar la migración completa
node run-migration.js complete-enum-migration
```

**Salida esperada**:
```
✅ Conexión a PostgreSQL establecida
🚀 Iniciando migración: complete-enum-migration...

📝 Paso 1: Actualizando Staff.role...
   ✅ Agregado valor "sales_rep" a Staff.role

📝 Paso 2: Actualizando Expense.typeExpense...
   ✅ Agregado valor "Comisión Vendedor" a Expense.typeExpense

📝 Paso 3: Actualizando Receipt.type...
   ✅ Agregado valor "Comisión Vendedor" a Receipt.type

📝 Paso 4: Verificando columnas de comisiones en Budget...
   ✅ Agregada columna "leadSource"
   ✅ Agregada columna "createdByStaffId"
   ✅ Agregada columna "salesCommissionAmount"
   ✅ Agregada columna "clientTotalPrice"
   ✅ Agregada columna "commissionPercentage"
   ✅ Agregada columna "commissionAmount"
   ✅ Agregada columna "commissionPaid"
   ✅ Agregada columna "commissionPaidDate"

✅ ¡Migración completa exitosa!
```

### Paso 3: Verificar Cambios
```powershell
# Ejecutar script de verificación
node verify-migration.js
```

**Salida esperada**:
```
🔍 Iniciando verificación de migración...

✅ Conexión a PostgreSQL establecida

📝 1. Verificando Staff.role...
   Roles encontrados: admin, finance, maintenance, owner, recept, sales_rep, worker
   ✅ Rol "sales_rep" existe

📝 2. Verificando Expense.typeExpense...
   Tipos encontrados: Comisión Vendedor, Comprobante Gasto, Diseño, ...
   ✅ Tipo "Comisión Vendedor" existe

📝 3. Verificando Receipt.type...
   Tipos encontrados: Comisión Vendedor, Comprobante Gasto, ...
   ✅ Tipo "Comisión Vendedor" existe

📝 4. Verificando columnas de Budget...
   ✅ leadSource              (USER-DEFINED)
   ✅ createdByStaffId        (uuid)
   ✅ salesCommissionAmount   (numeric)
   ✅ clientTotalPrice        (numeric)
   ✅ commissionPercentage    (numeric)
   ✅ commissionAmount        (numeric)
   ✅ commissionPaid          (boolean)
   ✅ commissionPaidDate      (date)

📝 5. Verificando Budget.leadSource ENUM...
   Valores encontrados: direct_client, referral, sales_rep, social_media, web
   ✅ Todos los valores de leadSource existen

✅ ¡VERIFICACIÓN EXITOSA! Todos los cambios están aplicados correctamente.
```

### Paso 4: Probar en la Aplicación
```powershell
# Reiniciar el servidor backend
cd C:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi\BackZurcher
npm run dev
```

**Tests a realizar**:
1. ✅ Crear usuario con rol "sales_rep"
2. ✅ Crear presupuesto con leadSource = "sales_rep" y asignar vendedor
3. ✅ Verificar que la comisión de $500 se calcula automáticamente
4. ✅ Crear gasto tipo "Comisión Vendedor"
5. ✅ Marcar gasto como "transacción general" (sin Work)
6. ✅ Adjuntar comprobante de comisión

---

## 📊 Cambios en la Base de Datos

### Staff Table
```sql
-- NUEVO VALOR EN ENUM
role ENUM(
    'recept',
    'admin',
    'owner',
    'worker',
    'finance',
    'maintenance',
    'sales_rep'  -- 🆕 NUEVO
)
```

### Expense Table
```sql
-- NUEVO VALOR EN ENUM
typeExpense ENUM(
    'Materiales',
    'Diseño',
    'Workers',
    'Imprevistos',
    'Comprobante Gasto',
    'Gastos Generales',
    'Materiales Iniciales',
    'Inspección Inicial',
    'Inspección Final',
    'Comisión Vendedor'  -- 🆕 NUEVO
)
```

### Receipt Table
```sql
-- NUEVO VALOR EN ENUM
type ENUM(
    'Factura Pago Inicial Budget',
    'Factura Pago Final Budget',
    'Materiales',
    'Diseño',
    'Workers',
    'Comisión Vendedor',  -- 🆕 NUEVO
    'Imprevistos',
    'Comprobante Gasto',
    'Comprobante Ingreso',
    'Gastos Generales',
    'Materiales Iniciales',
    'Inspección Inicial',
    'Inspección Final'
)
```

### Budget Table
```sql
-- 8 NUEVAS COLUMNAS

-- Sistema de Lead Source
leadSource ENUM('web', 'direct_client', 'social_media', 'referral', 'sales_rep')
    DEFAULT 'web',

-- Relación con vendedor
createdByStaffId UUID
    REFERENCES Staffs(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

-- Montos de comisión
salesCommissionAmount DECIMAL(10, 2) DEFAULT 0.00,
clientTotalPrice DECIMAL(10, 2),
commissionPercentage DECIMAL(5, 2) DEFAULT 0.00,
commissionAmount DECIMAL(10, 2) DEFAULT 0.00,

-- Control de pago de comisión
commissionPaid BOOLEAN DEFAULT false,
commissionPaidDate DATE
```

---

## 🎯 Casos de Uso

### 1. Crear Usuario Sales Rep
```javascript
// Frontend o SQL
{
  name: "Juan Vendedor",
  email: "juan@zurcher.com",
  role: "sales_rep",  // 🆕 Ahora disponible
  phone: "555-1234"
}
```

### 2. Crear Presupuesto con Comisión
```javascript
// Al crear budget desde CreateBudget.jsx
{
  // ... otros campos
  leadSource: "sales_rep",  // 🆕
  createdByStaffId: "uuid-del-vendedor",  // 🆕
  salesCommissionAmount: 500.00,  // 🆕
  clientTotalPrice: totalPrice + 500,  // 🆕 (cliente paga más)
  // ...
}
```

### 3. Registrar Pago de Comisión
```javascript
// Desde AttachInvoice.jsx
{
  type: "Comisión Vendedor",  // 🆕 Nuevo tipo disponible
  amount: 500.00,
  isGeneralTransaction: true,  // Sin Work específico
  file: comprobanteFile,
  notes: "Comisión de Budget #1234"
}
```

---

## 🔧 Mantenimiento

### Agregar Nuevos Valores a ENUMs

Si en el futuro necesitas agregar más valores a los ENUMs, usa este patrón:

```javascript
// Verificar si existe
const [check] = await queryInterface.sequelize.query(`
  SELECT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'NUEVO_VALOR' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'enum_TABLA_COLUMNA'
    )
  ) AS exists;
`, { transaction });

// Agregar solo si no existe
if (!check[0].exists) {
  await queryInterface.sequelize.query(`
    ALTER TYPE "enum_TABLA_COLUMNA" 
    ADD VALUE IF NOT EXISTS 'NUEVO_VALOR';
  `, { transaction });
}
```

### Agregar Nuevas Columnas

```javascript
// Verificar si existe
const [columns] = await queryInterface.sequelize.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'TABLA' AND column_name = 'nueva_columna';
`, { transaction });

// Agregar solo si no existe
if (columns.length === 0) {
  await queryInterface.addColumn('TABLA', 'nueva_columna', {
    type: DataTypes.STRING,
    allowNull: true
  }, { transaction });
}
```

---

## ⚠️ Notas Importantes

### PostgreSQL y ENUMs
- ⚠️ **No se pueden eliminar valores de ENUMs** una vez agregados
- ⚠️ Para eliminar un valor ENUM, debes recrear la tabla completa
- ✅ Los valores agregados son permanentes
- ✅ La migración es **idempotente** (se puede ejecutar múltiples veces)

### Rollback Limitado
El script de rollback (`down()`) puede:
- ✅ Eliminar columnas agregadas a Budget
- ✅ Eliminar el ENUM `enum_Budgets_leadSource`
- ❌ **NO puede** eliminar valores de ENUMs existentes (staff_role, typeExpense, receipt_type)

### Backups
- 🔴 **SIEMPRE haz backup** antes de ejecutar migraciones
- 🔴 Verifica que el backup sea válido antes de continuar
- 🔴 Guarda el backup en un lugar seguro

---

## 📞 Soporte y Troubleshooting

### Error Común 1: "permission denied"
**Solución**:
```sql
GRANT ALL PRIVILEGES ON DATABASE zurcher_db TO tu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tu_usuario;
```

### Error Común 2: "relation does not exist"
**Solución**:
```powershell
# Sincronizar modelos primero
npm run dev
# Espera a que Sequelize cree las tablas, luego ejecuta la migración
```

### Error Común 3: "enum value already exists"
**Esto es normal**: La migración verifica antes de agregar. Puedes ignorar este mensaje.

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] Backup de la base de datos creado y verificado
- [ ] Migración ejecutada sin errores
- [ ] Script de verificación ejecutado exitosamente
- [ ] Test manual: crear usuario sales_rep
- [ ] Test manual: crear presupuesto con comisión
- [ ] Test manual: crear gasto tipo "Comisión Vendedor"
- [ ] Test manual: marcar gasto como transacción general
- [ ] Frontend funciona correctamente
- [ ] Backend inicia sin errores
- [ ] Logs revisados

---

**🎉 ¡Migración completa! El sistema de comisiones está listo para usar.**
