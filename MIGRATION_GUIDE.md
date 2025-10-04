# 🚀 Guía de Ejecución: Migración Completa de ENUMs

## 📋 Resumen

Esta migración sincroniza la base de datos con los modelos actualizados, agregando:

1. **Nuevo rol en Staff**: `sales_rep` (Representante de Ventas)
2. **Nuevo tipo de gasto**: `Comisión Vendedor` (en Expense y Receipt)
3. **Sistema de comisiones en Budget**: 8 nuevas columnas para rastrear vendedores y comisiones

---

## ⚠️ IMPORTANTE - Antes de Ejecutar

### Prerrequisitos

1. **Backup de la base de datos**
   ```powershell
   # Crear backup de PostgreSQL
   pg_dump -U postgres -d zurcher_db > backup_antes_migracion.sql
   ```

2. **Verificar conexión a la base de datos**
   - Asegúrate de que el archivo `.env` tenga las credenciales correctas
   - El servidor PostgreSQL debe estar en ejecución

3. **Cerrar todas las conexiones activas**
   - Detén el servidor backend si está corriendo
   - Cierra cualquier cliente SQL (pgAdmin, DBeaver, etc.)

---

## 🎯 Ejecución de la Migración

### Opción 1: Migración Completa (RECOMENDADO)

Esta es la forma más simple y segura de aplicar todos los cambios de una sola vez.

```powershell
# Navegar al directorio del backend
cd C:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi\BackZurcher

# Ejecutar la migración completa
node run-migration.js complete-enum-migration
```

### Opción 2: Migraciones Individuales (Avanzado)

Si prefieres ejecutar las migraciones por separado:

```powershell
# 1. Agregar rol sales_rep a Staff
node run-migration.js add-sales-rep-role

# 2. Agregar campos de comisiones a Budget
node run-migration.js add-commission-fields

# 3. Agregar tipo de gasto "Comisión Vendedor"
node run-migration.js add-commission-expense-type
```

---

## ✅ Verificación Post-Migración

### 1. Verificar que la migración fue exitosa

Deberías ver un mensaje similar a:

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

📊 Resumen:
   • Staff.role: Agregado "sales_rep"
   • Expense.typeExpense: Agregado "Comisión Vendedor"
   • Receipt.type: Agregado "Comisión Vendedor"
   • Budget: Agregadas 8 columnas de sistema de comisiones
```

### 2. Verificar los cambios en la base de datos

Conecta a PostgreSQL y ejecuta estas consultas:

```sql
-- 1. Verificar nuevo rol en Staff
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'enum_Staffs_role'
);
-- Deberías ver: recept, admin, owner, worker, finance, maintenance, sales_rep

-- 2. Verificar nuevo tipo de gasto en Expense
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'enum_Expenses_typeExpense'
);
-- Deberías ver "Comisión Vendedor" en la lista

-- 3. Verificar nuevo tipo en Receipt
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'enum_Receipts_type'
);
-- Deberías ver "Comisión Vendedor" en la lista

-- 4. Verificar nuevas columnas en Budget
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Budgets'
AND column_name IN (
    'leadSource',
    'createdByStaffId',
    'salesCommissionAmount',
    'clientTotalPrice',
    'commissionPercentage',
    'commissionAmount',
    'commissionPaid',
    'commissionPaidDate'
)
ORDER BY column_name;
-- Deberías ver las 8 columnas nuevas
```

### 3. Probar la funcionalidad

#### Test 1: Crear usuario con rol sales_rep

```sql
-- En la aplicación, intenta crear un nuevo Staff con rol "sales_rep"
-- O ejecuta manualmente:
INSERT INTO "Staffs" (id, name, email, password, role, "isActive")
VALUES (
    gen_random_uuid(),
    'Vendedor Test',
    'vendedor.test@zurcher.com',
    '$2b$10$hashedPassword', -- Usa un hash real en producción
    'sales_rep',
    true
);
```

#### Test 2: Crear gasto tipo "Comisión Vendedor"

```sql
-- Desde la aplicación (AttachInvoice):
-- 1. Selecciona tipo: "Comisión Vendedor"
-- 2. Marca como transacción general (sin Work)
-- 3. Ingresa monto: 500.00
-- 4. Adjunta comprobante
-- 5. Envía
```

#### Test 3: Crear presupuesto con comisión

```sql
-- Desde CreateBudget:
-- 1. Selecciona leadSource: "sales_rep"
-- 2. Selecciona un vendedor
-- 3. El sistema debería calcular automáticamente la comisión de $500
```

---

## 🔄 Rollback (En caso de problemas)

Si algo sale mal y necesitas revertir los cambios:

```powershell
# Restaurar desde backup
psql -U postgres -d zurcher_db < backup_antes_migracion.sql
```

**NOTA IMPORTANTE**: PostgreSQL NO permite eliminar valores de ENUMs una vez agregados. El script de rollback solo eliminará las columnas nuevas de Budget, pero los valores `sales_rep` y `Comisión Vendedor` permanecerán en la base de datos.

---

## 📊 Cambios Detallados

### Staff Table

**ANTES:**
```sql
role ENUM('recept', 'admin', 'owner', 'worker', 'finance', 'maintenance')
```

**DESPUÉS:**
```sql
role ENUM('recept', 'admin', 'owner', 'worker', 'finance', 'maintenance', 'sales_rep')
```

### Expense Table

**ANTES:**
```sql
typeExpense ENUM(
    'Materiales',
    'Diseño',
    'Workers',
    'Imprevistos',
    'Comprobante Gasto',
    'Gastos Generales',
    'Materiales Iniciales',
    'Inspección Inicial',
    'Inspección Final'
)
```

**DESPUÉS:**
```sql
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

**ANTES:**
```sql
type ENUM(
    'Factura Pago Inicial Budget',
    'Factura Pago Final Budget',
    'Materiales',
    'Diseño',
    'Workers',
    'Imprevistos',
    'Comprobante Gasto',
    'Comprobante Ingreso',
    'Gastos Generales',
    'Materiales Iniciales',
    'Inspección Inicial',
    'Inspección Final'
)
```

**DESPUÉS:**
```sql
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

### Budget Table - Nuevas Columnas

```sql
-- Sistema de Lead Source
leadSource ENUM('web', 'direct_client', 'social_media', 'referral', 'sales_rep')
    DEFAULT 'web'

-- Relación con vendedor
createdByStaffId UUID
    REFERENCES Staffs(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL

-- Montos de comisión
salesCommissionAmount DECIMAL(10, 2) DEFAULT 0.00
clientTotalPrice DECIMAL(10, 2)
commissionPercentage DECIMAL(5, 2) DEFAULT 0.00
commissionAmount DECIMAL(10, 2) DEFAULT 0.00

-- Control de pago de comisión
commissionPaid BOOLEAN DEFAULT false
commissionPaidDate DATE
```

---

## 🐛 Solución de Problemas

### Error: "relation does not exist"

**Causa**: Las tablas no existen en la base de datos.

**Solución**:
```powershell
# Sincronizar modelos primero
cd BackZurcher
npm run dev
# Espera a que Sequelize cree las tablas, luego ejecuta la migración
```

### Error: "enum value already exists"

**Causa**: La migración ya se ejecutó anteriormente.

**Solución**: Esto es normal. La migración verifica antes de agregar valores. Puedes ignorar este mensaje.

### Error: "could not create unique index"

**Causa**: Hay valores duplicados en las columnas que intentan ser únicas.

**Solución**:
```sql
-- Verificar duplicados
SELECT "createdByStaffId", COUNT(*) 
FROM "Budgets" 
WHERE "createdByStaffId" IS NOT NULL
GROUP BY "createdByStaffId"
HAVING COUNT(*) > 1;
```

### Error: "permission denied"

**Causa**: El usuario de PostgreSQL no tiene permisos suficientes.

**Solución**:
```sql
-- Conecta como superusuario y otorga permisos
GRANT ALL PRIVILEGES ON DATABASE zurcher_db TO tu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tu_usuario;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tu_usuario;
```

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. **Copia el mensaje de error completo**
2. **Verifica los logs de PostgreSQL**:
   ```powershell
   # Ubicación típica en Windows
   C:\Program Files\PostgreSQL\14\data\log\
   ```
3. **Consulta el estado de las tablas**:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_schema = 'public';
   ```

---

## ✅ Checklist de Ejecución

- [ ] Backup de la base de datos creado
- [ ] Servidor backend detenido
- [ ] Clientes SQL cerrados
- [ ] Variables de entorno verificadas
- [ ] Migración ejecutada exitosamente
- [ ] Verificación SQL completada
- [ ] Tests de funcionalidad realizados
- [ ] Servidor backend reiniciado
- [ ] Frontend testeado

---

**¡Listo! Ahora tu base de datos está sincronizada con el sistema de comisiones y vendedores.** 🎉
