# 📊 Sistema de Comisiones y Cuentas por Cobrar - Guía de Implementación

## ✅ Cambios Implementados

### **Backend**

#### 1. **Nuevo Tipo de Gasto: "Comisión Vendedor"**
- **Archivo**: `BackZurcher/src/data/models/Expense.js`
- **Migración**: `BackZurcher/migrations/add-commission-expense-type.js`
- Agregado nuevo ENUM al typeExpense para registrar pagos de comisiones a vendedores

#### 2. **Controlador de Cuentas por Cobrar**
- **Archivo**: `BackZurcher/src/controllers/AccountsReceivableController.js`
- **Funcionalidades**:
  - `getAccountsReceivableSummary()`: Resumen completo de dinero por cobrar
  - `getWorkReceivableDetail()`: Detalle financiero de una obra específica
  - `getPendingCommissions()`: Comisiones pendientes de pago a vendedores

**Endpoints disponibles**:
- `GET /api/accounts-receivable/summary` - Resumen general
- `GET /api/accounts-receivable/work/:workId` - Detalle de una obra
- `GET /api/accounts-receivable/pending-commissions` - Comisiones pendientes

#### 3. **Rutas**
- **Archivo**: `BackZurcher/src/routes/accountsReceivableRoutes.js`
- **Archivo**: `BackZurcher/src/routes/index.js` (actualizado)
- Acceso: Roles `admin`, `owner`, `finance`

---

### **Frontend**

#### 1. **Componente Accounts Receivable**
- **Archivo**: `FrontZurcher/src/Components/AccountsReceivable.jsx`
- **Features**:
  - ✅ Dashboard con 4 tarjetas de resumen (Total, Budgets, Works, Comisiones)
  - ✅ 3 pestañas: Resumen General, Works en Progreso, Comisiones
  - ✅ Tabla de budgets aprobados sin work
  - ✅ Tabla de final invoices pendientes
  - ✅ Detalle financiero de works en progreso
  - ✅ Comisiones agrupadas por vendedor
  - ✅ Detalle completo de todas las comisiones pendientes

#### 2. **Actualización de Summary.jsx**
- **Archivo**: `FrontZurcher/src/Components/Summary.jsx`
- Agregado tipo de gasto "Comisión Vendedor" al select

#### 3. **Navegación**
- **Archivo**: `FrontZurcher/src/App.jsx`
- Ruta: `/accounts-receivable`
- Roles: `admin`, `owner`, `finance`

- **Archivo**: `FrontZurcher/src/Components/Dashboard/BarraLateral.jsx`
- Agregado enlace en sección "Financial"

---

## 🚀 Pasos para Activar en Producción

### **Paso 1: Ejecutar Migraciones**

```powershell
# 1. Detener el servidor backend
pm2 stop all   # o el comando que uses

# 2. Ejecutar migración de campos de comisión (si no se ha ejecutado)
node BackZurcher/run-migration.js add-commission-fields

# 3. Ejecutar migración de tipo de gasto
node BackZurcher/run-migration.js add-commission-expense-type

# 4. Reiniciar servidor
pm2 start all
```

### **Paso 2: Verificar en la Base de Datos**

```sql
-- Verificar campos de comisión en Budgets
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Budgets' 
AND column_name LIKE '%commission%' OR column_name LIKE '%sales%';

-- Verificar ENUM de typeExpense
SELECT unnest(enum_range(NULL::enum_Expenses_typeExpense));
```

### **Paso 3: Probar en Frontend**

1. Login como `owner`, `admin` o `finance`
2. Ir a sección "Financial" → "Accounts Receivable"
3. Verificar que se carguen los datos correctamente

---

## 📋 Casos de Uso

### **Caso 1: Registrar Pago de Comisión a Vendedor**

1. Ve a `/summary` (Income & Expenses)
2. Crea un nuevo Expense:
   - **Tipo**: "Comisión Vendedor"
   - **Monto**: $500 (o el monto correspondiente)
   - **Staff**: Selecciona el vendedor (sales_rep)
   - **Work**: Selecciona la obra relacionada (opcional)
   - **Notas**: Budget #123 - Comisión por venta
3. Guarda

### **Caso 2: Ver Comisiones Pendientes de Pago**

1. Ve a `/accounts-receivable`
2. Click en pestaña "Comisiones Vendedores"
3. Verás:
   - Tarjetas por vendedor con total de comisiones
   - Tabla detallada con todos los budgets que generan comisión
   - Estado del budget y work asociado

### **Caso 3: Seguimiento de Cuentas por Cobrar**

1. Ve a `/accounts-receivable`
2. En "Resumen General":
   - **Budgets sin Work**: Budgets aprobados pero no convertidos a obra
   - **Final Invoices Pendientes**: Obras completadas sin pago final
3. En "Works en Progreso":
   - Detalle completo de cada obra
   - Breakdown: Budget + Change Orders + Extras - Pagos

---

## 📊 Información que Muestra el Sistema

### **Dashboard Principal**
- ✅ Total por Cobrar (general)
- ✅ Budgets sin Work (dinero aprobado pero no iniciado)
- ✅ Works en Progreso (dinero en obras activas)
- ✅ Comisiones Pendientes (dinero que se debe a vendedores)

### **Budgets sin Work**
- Budget ID
- Propiedad
- Cliente
- Total del presupuesto
- Pago inicial recibido
- Monto pendiente
- Estado del budget

### **Works en Progreso**
- Work ID
- Propiedad
- Cliente
- Total del budget
- Change Orders (incrementos)
- Extras de Final Invoice
- Total por cobrar
- Estado de Final Invoice

### **Comisiones**
- Agrupado por vendedor:
  - Nombre del vendedor
  - Total de comisiones pendientes
  - Número de budgets
- Detalle por budget:
  - Budget ID
  - Propiedad
  - Vendedor
  - Monto de comisión
  - Estado del budget
  - Estado del work

---

## 🔍 Diferencias con el Sistema Actual

### **Antes**
- ❌ No había forma de rastrear comisiones pendientes
- ❌ No había vista consolidada de cuentas por cobrar
- ❌ Difícil saber cuánto dinero está pendiente en obras en progreso
- ❌ No se podía identificar fácilmente qué comisiones pagar

### **Ahora**
- ✅ Dashboard completo de cuentas por cobrar
- ✅ Vista de comisiones agrupadas por vendedor
- ✅ Seguimiento de budgets aprobados sin work
- ✅ Detalle financiero de obras en progreso
- ✅ Tipo de gasto específico para comisiones
- ✅ Relación clara: Expense → Staff (vendedor)

---

## 🎯 Flujo Completo: Budget con Comisión → Pago de Comisión

### **1. Cliente solicita presupuesto a través de vendedor**
- Se crea Budget con:
  - `leadSource`: "sales_rep"
  - `createdByStaffId`: ID del vendedor
  - `salesCommissionAmount`: 500
  - `clientTotalPrice`: Total + 500 (cliente paga más)

### **2. Budget aprobado/firmado**
- Aparece en `/accounts-receivable` en "Comisiones Vendedores"
- Muestra como comisión pendiente de pago

### **3. Se inicia la obra (Work creado)**
- Budget sigue apareciendo en comisiones pendientes
- Work aparece en "Works en Progreso"

### **4. Pagar comisión al vendedor**
- Ir a `/summary`
- Crear Expense:
  - Tipo: "Comisión Vendedor"
  - Monto: $500
  - Staff: Vendedor
  - Work: Obra relacionada
  - Notas: "Budget #123 - Comisión"

### **5. Marcar comisión como pagada (opcional - futuro)**
- En Budget, actualizar:
  - `commissionPaid`: true
  - `commissionPaidDate`: fecha actual
- Esto removería el budget de las comisiones pendientes

---

## 🛠️ Mejoras Futuras Sugeridas

### **1. Marcar Comisión como Pagada**
- Endpoint: `PUT /api/budgets/:id/mark-commission-paid`
- Botón en la tabla de comisiones
- Actualiza campos `commissionPaid` y `commissionPaidDate`

### **2. Exportar Reportes**
- Excel de cuentas por cobrar
- PDF de comisiones por vendedor
- Reporte mensual de comisiones

### **3. Alertas Automáticas**
- Notificación cuando un budget aprobado no se convierte en work en X días
- Recordatorio de Final Invoices pendientes
- Alerta de comisiones acumuladas por vendedor

### **4. Gráficos y Analytics**
- Gráfico de evolución de cuentas por cobrar
- Top vendedores por comisiones
- Tiempo promedio de cobro

---

## 📝 Notas Importantes

1. **Comisiones se calculan automáticamente** cuando se crea un budget con `leadSource = 'sales_rep'`

2. **No afecta PDFs existentes**: El campo `totalPrice` sigue siendo el que se usa en PDFs

3. **Acceso restringido**: Solo `admin`, `owner`, `finance` pueden ver cuentas por cobrar

4. **Staff debe tener rol `sales_rep`**: Para que aparezca en el dropdown de vendedores

5. **Migración reversible**: Todas las migraciones tienen método `down()` para revertir cambios

---

## 🐛 Troubleshooting

### **"No se ven datos en Accounts Receivable"**
- Verificar que las migraciones se ejecutaron
- Verificar permisos del usuario (debe ser admin/owner/finance)
- Abrir consola del navegador para ver errores

### **"Error al crear Expense con tipo Comisión Vendedor"**
- Ejecutar migración: `add-commission-expense-type`
- Verificar que el ENUM se actualizó en la base de datos

### **"No aparecen vendedores en el dropdown"**
- Verificar que hay staff con `role = 'sales_rep'`
- Ejecutar migración: `add-sales-rep-role`

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del backend (`pm2 logs` o consola)
2. Revisa la consola del navegador (F12)
3. Verifica que todas las migraciones se ejecutaron exitosamente
4. Contacta al equipo de desarrollo

---

**Última actualización**: 4 de Octubre, 2025
**Versión**: 1.0.0
