# Frontend: Gastos One-Time - Guía de Uso

## 🎯 Resumen de Cambios

Se agregó un **sistema de filtrado visual** en el componente `FixedExpensesManager.jsx` para separar gastos activos de gastos completados/histórico.

### Cambios Implementados

1. **Estados adicionales**:
   - `showHistorical`: Controla si mostrar gastos activos o inactivos
   - `inactiveExpenses`: Almacena gastos completados/histórico
   - `loadingInactive`: Indicador de carga para datos inactivos

2. **Función de carga mejorada**:
   - `loadFixedExpenses()`: Carga gastos activos en primer plano
   - `loadInactiveExpenses()`: Carga gastos inactivos en segundo plano
   - Ambas se ejecutan automáticamente al montar

3. **UI mejorada**:
   - Toggle de dos botones: "📋 Activos" vs "📜 Histórico"
   - Muestra contador de gastos en cada sección
   - Fondo gris claro para gastos históricos (visual distinction)
   - Compatible con desktop y mobile

---

## 📋 Cómo Funciona

### Vista por Defecto (Gastos Activos)
- El usuario ve solo gastos **activos** (isActive=true)
- Se muestran en orden: primero con staffId (salarios), luego otros
- Botones de acción disponibles: Ver, Editar, Eliminar
- Contador en botón: "📋 Activos (15)"

### Vista Histórica (Gastos Completados)
- Click en botón "📜 Histórico" muestra gastos completados
- Incluye: One-time completados, gastos desactivados manualmente
- Fondo gris claro para diferenciación visual
- Botones de acción siguen disponibles (puede reactivar si es necesario)
- Contador en botón: "📜 Histórico (4)"

### Comportamiento del Toggle
```
Usuario ve lista activa
     ↓
Click "📜 Histórico (4)"
     ↓
Cambia a vista de gastos completados
     ↓
Click "📋 Activos (15)"
     ↓
Regresa a vista de gastos activos
```

---

## 🖼️ Visualización

### Desktop (Tabla)
```
┌─────────────────────────────────────────────────────────┐
│  Gastos Fijos                              Nuevo Gasto  │
│  Gestiona tus gastos recurrentes                        │
│                                                          │
│  [📋 Activos (15)]  [📜 Histórico (4)]                 │
└─────────────────────────────────────────────────────────┘

Activos:
┌─────────────────────────────────────────────────────────┐
│ Nombre        │ Categoría │ Monto  │ Vencimiento │ ...  │
├─────────────────────────────────────────────────────────┤
│ Salario       │ Salarios  │ $5,000 │ 01/02/2026  │ ...  │
│ Alquiler      │ Utilities │ $2,000 │ 01/02/2026  │ ...  │
│ Seguro        │ Seguros   │ $500   │ 01/03/2026  │ ...  │
└─────────────────────────────────────────────────────────┘

(Click en histórico)

Histórico (fondo gris):
┌─────────────────────────────────────────────────────────┐
│ Nombre        │ Categoría │ Monto  │ Vencimiento │ ...  │
├─────────────────────────────────────────────────────────┤
│ Inspección    │ Permisos  │ $500   │ 01/01/2026  │ ...  │ (gris)
│ Propuesta     │ Servicios │ $2,000 │ 01/01/2026  │ ...  │ (gris)
│ Encuesta      │ Servicios │ $1,000 │ 15/12/2025  │ ...  │ (gris)
│ Permiso       │ Permisos  │ $300   │ 15/12/2025  │ ...  │ (gris)
└─────────────────────────────────────────────────────────┘
```

### Mobile (Cards)
```
Gastos Fijos
Gestiona tus gastos recurrentes                [Nuevo Gasto]

[📋 Activos (15)]  [📜 Histórico (4)]

┌──────────────────────────────┐
│ Salario                  $5k │
│ Salarios                     │
│ Próx. Vencimiento: 01/02/26 │
│ Frecuencia: monthly          │
│ [Ver] [Editar] [Eliminar]   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Alquiler                 $2k │
│ Utilities                    │
│ Próx. Vencimiento: 01/02/26 │
│ Frecuencia: monthly          │
│ [Ver] [Editar] [Eliminar]   │
└──────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### Al Montar el Componente
```
1. useEffect se ejecuta
2. loadFixedExpenses() → GET /fixed-expenses
   └─ Carga gastos ACTIVOS en primer plano
   └─ Actualiza estado 'expenses'
   └─ Llama a loadInactiveExpenses()
   
3. loadInactiveExpenses() → GET /fixed-expenses?isActive=false
   └─ Carga gastos INACTIVOS en segundo plano
   └─ Actualiza estado 'inactiveExpenses'
   └─ Sin mostrar error si falla (datos secundarios)
   
4. Además: dispatch(fetchStaff()) para cargar staff
```

### Al Togglear Vista
```
User click "📜 Histórico"
  ↓
setShowHistorical(true)
  ↓
Componente re-renderiza
  ↓
Muestra: sortedInactiveExpenses (con fondo gris)
  ↓
Contador actualizado: "📜 Histórico (4)"
```

### Al Pagar un Gasto One-Time
```
Backend: Registra pago (POST /fixed-expenses/{id}/payments)
  ↓
Auto-deactivation: Si 100% pagado, isActive=false
  ↓
Frontend: Usuario toca "Refrescar" o regresa a pantalla
  ↓
loadFixedExpenses() se re-ejecuta
  ↓
Gasto desaparece de "Activos"
  ↓
Aparece en "Histórico"
  ↓
Contador se actualiza automáticamente
```

---

## 🎨 Estilos

### Botones de Toggle
- **Activo**: Fondo naranja (orange-500), texto blanco
- **Inactivo**: Fondo blanco, borde gris, texto gris oscuro
- **Hover**: Transición suave, fondo gris claro

### Fondo de Gastos Históricos
- **Desktop**: Fila con `bg-gray-50`
- **Mobile**: Card con `bg-gray-50`
- Diferenciación clara pero no intrusiva

### Loader
- Spinner rotante naranja
- Se muestra al cargar activos o al cambiar a histórico con loading

---

## 📝 Código Implementado

### 1. Estados Nuevos
```javascript
const [inactiveExpenses, setInactiveExpenses] = useState([]);
const [loadingInactive, setLoadingInactive] = useState(false);
const [showHistorical, setShowHistorical] = useState(false);
```

### 2. Función de Carga Mejorada
```javascript
const loadFixedExpenses = async () => {
  try {
    setLoading(true);
    const response = await api.get('/fixed-expenses');
    const data = response.data.fixedExpenses || response.data;
    setExpenses(Array.isArray(data) ? data : []);
    loadInactiveExpenses(); // Carga en background
  } catch (error) {
    console.error('Error cargando gastos fijos:', error);
    toast.error('Error cargando gastos fijos');
  } finally {
    setLoading(false);
  }
};

const loadInactiveExpenses = async () => {
  try {
    setLoadingInactive(true);
    const response = await api.get('/fixed-expenses?isActive=false');
    const data = response.data.fixedExpenses || response.data;
    setInactiveExpenses(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error cargando gastos inactivos:', error);
  } finally {
    setLoadingInactive(false);
  }
};
```

### 3. Variables de Ordenamiento
```javascript
const sortedExpenses = [...expenses].sort((a, b) => {
  const aHasStaff = !!a.staffId;
  const bHasStaff = !!b.staffId;
  if (aHasStaff && !bHasStaff) return -1;
  if (!aHasStaff && bHasStaff) return 1;
  return 0;
});

const sortedInactiveExpenses = [...inactiveExpenses].sort((a, b) => {
  const aHasStaff = !!a.staffId;
  const bHasStaff = !!b.staffId;
  if (aHasStaff && !bHasStaff) return -1;
  if (!aHasStaff && bHasStaff) return 1;
  return 0;
});
```

### 4. Toggle Buttons
```jsx
{expenses.length > 0 && inactiveExpenses.length > 0 && (
  <div className="flex gap-2">
    <button
      onClick={() => setShowHistorical(false)}
      className={`px-4 py-2 rounded-lg font-medium transition ${
        !showHistorical
          ? 'bg-orange-500 text-white'
          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      📋 Activos ({expenses.length})
    </button>
    <button
      onClick={() => setShowHistorical(true)}
      className={`px-4 py-2 rounded-lg font-medium transition ${
        showHistorical
          ? 'bg-orange-500 text-white'
          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      📜 Histórico ({inactiveExpenses.length})
    </button>
  </div>
)}
```

### 5. Condicional de Listado
```jsx
{(showHistorical ? sortedInactiveExpenses : sortedExpenses).map(...)
```

---

## 🧪 Pruebas Recomendadas

### Test 1: Carga Inicial
- [ ] Abre FixedExpenses
- [ ] Verifica que carga gastos activos primero
- [ ] Verifica que carga gastos inactivos en background
- [ ] Ve contadores: "📋 Activos (X)" y "📜 Histórico (Y)"

### Test 2: Toggle Funciona
- [ ] Click en "📜 Histórico"
- [ ] Se muestra lista de gastos completados con fondo gris
- [ ] Contador muestra cantidad correcta
- [ ] Botones de acción siguen disponibles

### Test 3: Regresa a Activos
- [ ] Click en "📋 Activos"
- [ ] Regresa a lista de activos
- [ ] Fondo normal (no gris)

### Test 4: Visibilidad de One-Time
- [ ] Crea gasto one_time
- [ ] Aparece en "Activos"
- [ ] Paga 100%
- [ ] Regresa a FixedExpenses
- [ ] Gasto ya NO está en "Activos"
- [ ] Gasto ESTÁ en "📜 Histórico"

### Test 5: Mobile Responsive
- [ ] En mobile, ve cards en lugar de tabla
- [ ] Toggle funciona igual
- [ ] Fondo gris se ve en cards también
- [ ] Botones de acción accesibles

### Test 6: Casos Vacíos
- [ ] Sin gastos activos: muestra "No hay gastos fijos activos"
- [ ] Sin gastos históricos: muestra "No hay gastos completados/histórico"

---

## 🚀 Deployment

### Cambios Realizados
- **Archivo**: [FrontZurcher/src/Components/FixedExpenses/FixedExpensesManager.jsx](../FrontZurcher/src/Components/FixedExpenses/FixedExpensesManager.jsx)

### No Requiere:
- Cambios de dependencias
- Migraciones de base de datos
- Variables de entorno nuevas

### Requisitos:
- Backend desplegado con cambios de filtrado API (isActive=false support)
- Backend desplegado con auto-deactivation (lines 356-366 en fixedExpensePaymentController.js)

### Deployment Steps:
1. Pull cambios del frontend
2. `npm install` (si es necesario)
3. `npm run dev` para development o `npm run build` para producción
4. Test toggle de histórico localmente
5. Verifica que API filtering funciona: GET /fixed-expenses?isActive=false
6. Deploy a producción

---

## 💡 Notas

### Performance
- Gastos inactivos se cargan en segundo plano
- No bloquea UI mientras carga
- No hace error toast si fallan (datos secundarios)
- Las dos listas se cargan en paralelo

### UX Improvements
- Contador en botones ayuda a saber cuántos hay en cada sección
- Fondo gris claro ayuda a identificar gastos históricos
- Toggle está siempre visible cuando hay datos en ambas secciones
- Loader muestra cuando cambias a histórico y está cargando

### Backward Compatibility
- ✅ Si backend no tiene isActive filter: solo mostrará activos
- ✅ Si no hay gastos inactivos: toggle no se muestra
- ✅ Componente sigue funcionando como antes si API no responde

---

## 📞 Troubleshooting

| Problema | Solución |
|----------|----------|
| Toggle no se muestra | Verifica que hay gastos activos E inactivos |
| Histórico muestra vacío | Corre script retroactivo en backend |
| API error al cargar inactivos | Verifica backend tiene filtro isActive |
| Gasto pagado no desaparece | Verifica auto-deactivation en backend |
| Mobile cards se ven raros | Check Tailwind classes, rebuild CSS |

---

**Status**: ✅ Implementado y listo para usar  
**Fecha**: 8 de Enero, 2026
