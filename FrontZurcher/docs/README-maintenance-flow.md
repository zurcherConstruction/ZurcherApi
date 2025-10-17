# Flujo de Mantenimiento - Guía Completa

## 📋 Cómo funciona el sistema de mantenimiento

### 1. **Creación del Work de Mantenimiento**
Cuando un trabajo (septic installation) se completa, el sistema lo marca como `status: 'maintenance'` y automáticamente programa 4 visitas de mantenimiento (cada 6 meses durante 2 años).

```javascript
// En WorkController.js - cuando se actualiza status a 'maintenance'
if (status === 'maintenance' && oldStatus !== 'maintenance') {
  await scheduleInitialMaintenanceVisits(idWork);
  // Esto crea 4 visitas automáticamente
}
```

### 2. **Asignación de Visitas a Staff**
Las visitas se pueden asignar a personal con rol `maintenance` o `worker`:

**Opción A - Desde el admin web:**
```javascript
// PUT /maintenance/:visitId
{
  "staffId": "uuid-del-worker-o-maintenance",
  "status": "assigned",
  "scheduledDate": "2025-10-20"
}
```

**Opción B - Asignación automática:**
Al crear una visita, si no se especifica `staffId`, se asigna al usuario actual.

### 3. **Worker ve sus tareas asignadas**
En la app móvil, el worker consulta:
```javascript
// GET /maintenance/assigned?workerId={staffId}
```

**Respuesta:**
```json
{
  "visits": [
    {
      "id": "visit-uuid",
      "visitNumber": 1,
      "scheduledDate": "2025-10-20",
      "status": "assigned",
      "work": {
        "idWork": "work-uuid",
        "status": "maintenance",
        "permit": {
          "propertyAddress": "123 Main St",
          "applicant": "John Doe",
          "systemType": "ATU PBTS"
        }
      }
    }
  ]
}
```

### 4. **Abrir formulario desde la app**
El worker toca la visita en la lista → la app genera un token corto:

```javascript
// POST /maintenance/:visitId/generate-token
// Respuesta:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "visitId": "visit-uuid",
  "expiresIn": 900 // 15 minutos
}
```

Luego abre el WebView con:
```
https://frontzurcher.com/maintenance-form?visitId={visitId}&token={token}
```

### 5. **Formulario Web**
El formulario:
- Carga datos del permit (dirección, tipo de sistema, etc.)
- Muestra secciones condicionales según `systemType`:
  - **Siempre:** Inspección General
  - **Si tiene "ATU":** Sección ATU
  - **Si tiene "Lift Station":** Sección Lift Station
  - **Si tiene "PBTS":** Sección PBTS con muestras de pozos
- Permite subir fotos/videos por cada observación
- Al enviar, hace POST a `/maintenance/:visitId/complete`

### 6. **Completar Mantenimiento**
El backend:
1. Valida que el worker tenga permisos
2. Guarda todos los campos del formulario en `MaintenanceVisit`
3. Sube archivos a Cloudinary
4. Asocia cada archivo con su campo específico (`fieldName`)
5. Actualiza `status: 'completed'` y `actualVisitDate`
6. (TODO) Envía notificación a supervisor

## 🚀 Pasos para probar

### Paso 1: Ejecutar migraciones
```powershell
cd BackZurcher
node run-maintenance-migrations.js
```

### Paso 2: Crear o encontrar un Work en mantenimiento
```sql
-- Ver works en mantenimiento
SELECT "idWork", "propertyAddress", status, "maintenanceStartDate"
FROM "Works"
WHERE status = 'maintenance';

-- O actualizar uno existente para testing
UPDATE "Works" 
SET status = 'maintenance', "maintenanceStartDate" = NOW()
WHERE "idWork" = 'tu-work-uuid';
```

### Paso 3: Verificar que se crearon las visitas
```sql
SELECT * FROM "MaintenanceVisits" 
WHERE "workId" = 'tu-work-uuid'
ORDER BY "visitNumber";
```

### Paso 4: Asignar una visita a un worker
**Opción A - Desde Postman/Thunder Client:**
```http
PUT http://localhost:3001/maintenance/{visitId}
Authorization: Bearer {tu-token}
Content-Type: application/json

{
  "staffId": "uuid-del-worker",
  "status": "assigned",
  "scheduledDate": "2025-10-25"
}
```

**Opción B - SQL directo para testing:**
```sql
UPDATE "MaintenanceVisits"
SET "staffId" = 'uuid-del-worker', 
    status = 'assigned'
WHERE id = 'visit-uuid';
```

### Paso 5: Probar endpoint de tareas asignadas
```http
GET http://localhost:3001/maintenance/assigned?workerId={uuid-del-worker}
Authorization: Bearer {token-del-worker}
```

### Paso 6: Generar token para formulario
```http
POST http://localhost:3001/maintenance/{visitId}/generate-token
Authorization: Bearer {token-del-worker}
```

### Paso 7: Abrir formulario web (cuando esté deployado)
```
http://localhost:5173/maintenance-form?visitId={visitId}&token={token-generado}
```

## 📱 Flujo en la App Móvil (próximo paso)

```
MaintenanceList (pantalla)
  ↓
  Consulta GET /maintenance/assigned?workerId={staffId}
  ↓
  Muestra lista de visitas asignadas
  ↓
  Worker toca una visita
  ↓
  POST /maintenance/:visitId/generate-token
  ↓
  Abre MaintenanceWebView con URL + token
  ↓
  Formulario web se carga prellenado
  ↓
  Worker completa y envía
  ↓
  POST /maintenance/:visitId/complete
  ↓
  WebView detecta éxito y cierra
  ↓
  App refresca lista (visita marcada como completed)
```

## 🔐 Roles y Permisos

- **admin/owner:** Puede ver, crear, asignar y eliminar todas las visitas
- **maintenance:** Puede ver, asignar y completar visitas
- **worker:** Solo puede ver sus visitas asignadas y completarlas

## 📊 Estados de una Visita

1. `pending_scheduling` - Creada automáticamente, sin fecha/worker asignado
2. `scheduled` - Tiene fecha pero no está asignada a nadie específico
3. `assigned` - Asignada a un worker específico
4. `completed` - Formulario completado
5. `skipped` - Omitida (no se realizó)

## 🛠️ Comandos útiles

```powershell
# Ejecutar migraciones
node run-maintenance-migrations.js

# Ver estructura de tabla
node -e "require('./src/data').sequelize.query('\\d \"MaintenanceVisits\"').then(([r]) => console.log(r))"

# Verificar visitas de un work
node -e "require('./src/data').MaintenanceVisit.findAll({where:{workId:'UUID'}}).then(v => console.log(JSON.stringify(v,null,2)))"
```

## ⚠️ Pendientes

- [ ] Crear middleware `validateMaintenanceToken.js` para validar tokens en endpoint `/complete`
- [ ] Implementar notificación a supervisor cuando se completa una visita
- [ ] Agregar ruta en el frontend para `/maintenance-form`
- [ ] Crear pantallas móviles (MaintenanceList y MaintenanceWebView)
- [ ] Tests E2E del flujo completo
