# Implementación del Rol "Follow-up"

## 📋 Resumen
Se ha implementado exitosamente el nuevo rol **"follow-up"** para personal de seguimiento de clientes con acceso limitado al sistema.

---

## ✅ Cambios Realizados

### 🔧 Backend

#### 1. Modelo de Datos
- **Archivo**: `BackZurcher/src/data/models/Staff.js`
- **Cambio**: Agregado `"follow-up"` al ENUM de roles
```javascript
role: {
  type: DataTypes.ENUM("recept", "admin", "owner", "worker", "finance", "maintenance", "sales_rep", "follow-up"),
  allowNull: false,
}
```

#### 2. Middleware de Autenticación
- **Archivo**: `BackZurcher/src/middleware/byRol.js`
- **Cambio**: Agregado `'follow-up'` a la lista de roles válidos en `isStaff`

#### 3. Rutas de Budgets
- **Archivo**: `BackZurcher/src/routes/BudgetRoutes.js`
- **Permisos agregados**:
  - ✅ `GET /all` - Ver todos los budgets (ya incluido en `isStaff`)
  - ✅ `GET /export/excel` - Exportar a Excel
  - ✅ `GET /:idBudget/signature-status` - Ver estado de firma
  - ✅ `GET /:idBudget/download-signed` - Descargar PDF firmado
  - ✅ `GET /:idBudget/view-signed` - Ver PDF firmado
  - ✅ `GET /:idBudget/view-manual-signed` - Ver PDF firmado manual
  - ❌ **NO** tiene acceso a POST, PUT, DELETE

#### 4. Rutas de Notas de Budget
- **Archivo**: `BackZurcher/src/routes/BudgetNoteRoutes.js`
- **Acceso**: Completo (crear, leer, actualizar notas de seguimiento)
- Todas las rutas están protegidas con `verifyToken` pero no tienen restricción de rol específica

---

### 🎨 Frontend

#### 1. Menú de Navegación
- **Archivo**: `FrontZurcher/src/Components/Dashboard/BarraLateral.jsx`
- **Menú del rol follow-up**:
```javascript
{
  name: "Client Follow-up",
  icon: FaFolderOpen,
  color: "text-purple-400",
  items: [
    { name: "Gestion Budgets", path: "/gestionBudgets", icon: FaCog },
  ],
}
```

#### 2. Protección de Acciones en GestionBudgets
- **Archivo**: `FrontZurcher/src/Components/Budget/GestionBudgets.jsx`
- **Funciones actualizadas**:
```javascript
const canEdit = (budget) => {
  if (userRole === 'follow-up') return false; // ❌ No puede editar
  return !['approved', 'signed'].includes(budget.status);
};

const canDelete = (budget) => {
  if (userRole === 'follow-up') return false; // ❌ No puede eliminar
  return userRole === 'owner';
};
```

#### 3. Formulario de Registro de Staff
- **Archivo**: `FrontZurcher/src/Components/Auth/Register.jsx`
- **Agregado**: Opción "Follow-up" en el select de roles

---

### 📱 App Móvil

#### 1. Validación de Roles
- **Archivo**: `WorkTrackerApp/src/utils/validation.js`
- **Actualizado**: Array de roles válidos incluye `"follow-up"`

---

## 🗄️ Migración de Base de Datos

### Archivos Creados

#### 1. Script SQL
- **Archivo**: `BackZurcher/migrations/add-follow-up-role.sql`
- **Propósito**: Agregar el rol 'follow-up' al ENUM en PostgreSQL

#### 2. Script de Ejecución
- **Archivo**: `BackZurcher/add-follow-up-role.js`
- **Uso**: Ejecutar la migración de forma segura
```bash
node add-follow-up-role.js
```

---

## 🎯 Permisos del Rol "Follow-up"

### ✅ TIENE ACCESO A:
- Ver Gestión de Budgets (GestionBudgets)
- Descargar Excel de budgets
- Ver detalles completos de budgets
- Ver PDFs firmados (SignNow y manuales)
- Acceso al chat interno (BudgetNotes)
- Crear notas de seguimiento
- Ver estadísticas de seguimiento
- Mencionar a otros usuarios en notas
- Filtrar y buscar budgets

### ❌ NO TIENE ACCESO A:
- Editar budgets
- Eliminar budgets
- Crear nuevos budgets
- Enviar budgets a firma
- Subir comprobantes de pago
- Acceso a otras secciones del sistema (Works, Permits, Financial, etc.)
- Panel de administración
- Gestión de staff

---

## 🚀 Pasos para Desplegar a Producción

### 1. Ejecutar Migración en Producción
```bash
cd BackZurcher
node add-follow-up-role.js
```

### 2. Verificar que el Rol se Agregó
El script mostrará todos los roles disponibles y confirmará si "follow-up" se agregó correctamente.

### 3. Crear Usuario con Rol Follow-up
- Ir a la sección "Staff" en el panel administrativo
- Crear nuevo usuario
- Seleccionar rol "Follow-up"
- Guardar

### 4. Probar Permisos
- Iniciar sesión con el usuario follow-up
- Verificar que solo vea "Gestion Budgets"
- Verificar que NO pueda editar/eliminar
- Verificar que SÍ pueda exportar a Excel
- Verificar que SÍ pueda usar el chat/notas

---

## 📝 Notas Adicionales

- El rol sigue el mismo patrón de seguridad que los demás roles
- Las validaciones están tanto en backend como frontend
- El middleware de autenticación valida el token y el rol en cada petición
- Las rutas protegidas devuelven 403 Forbidden si el usuario no tiene permisos

---

## 🔍 Archivos Modificados

### Backend
1. `src/data/models/Staff.js`
2. `src/middleware/byRol.js`
3. `src/routes/BudgetRoutes.js`
4. `src/routes/BudgetNoteRoutes.js`

### Frontend
1. `src/Components/Dashboard/BarraLateral.jsx`
2. `src/Components/Budget/GestionBudgets.jsx`
3. `src/Components/Auth/Register.jsx`

### App Móvil
1. `src/utils/validation.js`

### Migraciones
1. `migrations/add-follow-up-role.sql` (nuevo)
2. `add-follow-up-role.js` (nuevo)

---

## ✨ Fecha de Implementación
**29 de Octubre, 2025**
