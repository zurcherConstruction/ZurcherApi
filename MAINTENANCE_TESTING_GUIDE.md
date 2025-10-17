# 🧪 Guía de Pruebas - Flujo Completo de Mantenimiento

## 📋 Resumen de Implementación

Se ha implementado un sistema completo de formularios de mantenimiento que permite a los trabajadores (con rol `maintenance` o `worker`) completar inspecciones detalladas desde una aplicación móvil.

### ✅ Componentes Implementados

#### Backend (BackZurcher)
- ✅ Migraciones ejecutadas (40+ campos agregados a MaintenanceVisit)
- ✅ MaintenanceMedia.fieldName agregado
- ✅ 3 endpoints nuevos:
  - `GET /maintenance/assigned?workerId=X` - Lista visitas asignadas
  - `POST /maintenance/:visitId/generate-token` - Genera token JWT de 15 min
  - `POST /maintenance/:visitId/complete` - Completa visita con archivos

#### Frontend Web (FrontZurcher)
- ✅ Ruta pública `/maintenance-form` agregada
- ✅ MaintenanceForm.jsx con secciones condicionales (ATU, Lift Station, PBTS)
- ✅ Comunicación con React Native WebView vía postMessage
- ✅ VisitForm actualizado para asignar a roles `maintenance` y `worker`

#### App Móvil (WorkTrackerApp)
- ✅ Tab "Mantenimientos" agregado al BottomTabNavigator
- ✅ MaintenanceList.jsx - Lista de visitas asignadas con refresh
- ✅ MaintenanceWebView.jsx - WebView que abre el formulario web
- ✅ maintenanceSlice.js extendido con thunks y estado

---

## 🔧 Configuración Inicial

### 1. Variables de Entorno

**Backend (BackZurcher/.env)**
```env
JWT_SECRET=tu_secreto_jwt
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**Frontend Web (FrontZurcher/.env)**
```env
VITE_API_URL=http://localhost:3001
# Para producción:
# VITE_API_URL=https://zurcherapi.up.railway.app
```

**App Móvil (WorkTrackerApp/src/utils/axios.js)**
- Desarrollo: `http://localhost:3001`
- Producción: URL de tu API en Railway

### 2. Instalar Dependencias

```bash
# Backend
cd BackZurcher
npm install

# Frontend
cd ../FrontZurcher
npm install

# Mobile App
cd ../WorkTrackerApp
npm install
```

---

## 🧪 Plan de Pruebas

### Fase 1: Verificar Base de Datos

#### 1.1 Verificar migraciones
```bash
cd BackZurcher
node run-maintenance-migrations.js
```

**Resultado esperado:**
```
✅ Campos del formulario de mantenimiento agregados a MaintenanceVisits
✅ Campo fieldName agregado a MaintenanceMedia
✅ Columnas de MaintenanceVisits:
  - level_inlet (double precision)
  - level_outlet (double precision)
  - strong_odors (boolean)
  - needs_pumping (boolean)
  - blower_working (boolean)
  - alarm_panel_working (boolean)
  - well_samples (jsonb)
  - general_notes (text)
  - signature_url (character varying)
  - completed_by_staff_id (uuid)
  ... y más
```

#### 1.2 Verificar datos de prueba
```sql
-- Verificar que existen obras con status='maintenance'
SELECT id, title, status, "permitId" 
FROM "Works" 
WHERE status = 'maintenance';

-- Verificar visitas de mantenimiento
SELECT 
  mv.id,
  mv."workId",
  mv.status,
  mv."assignedToStaffId",
  mv."scheduledDate",
  w.title as work_title,
  p.address as property_address
FROM "MaintenanceVisits" mv
JOIN "Works" w ON mv."workId" = w.id
JOIN "Permits" p ON w."permitId" = p.id
ORDER BY mv."scheduledDate" DESC;
```

---

### Fase 2: Pruebas Backend

#### 2.1 Obtener visitas asignadas
```bash
# Reemplaza STAFF_ID con un ID real de Staff con rol 'worker' o 'maintenance'
curl http://localhost:3001/maintenance/assigned?workerId=STAFF_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta esperada:**
```json
{
  "visits": [
    {
      "id": "uuid-visit-1",
      "workId": "uuid-work-1",
      "status": "pending",
      "scheduledDate": "2025-01-20T10:00:00Z",
      "Work": {
        "title": "Septic System Maintenance",
        "Permit": {
          "address": "123 Main St",
          "applicantName": "John Doe",
          "systemType": "ATU"
        }
      }
    }
  ]
}
```

#### 2.2 Generar token de acceso
```bash
curl -X POST http://localhost:3001/maintenance/VISIT_ID/generate-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "visitId": "uuid-visit-1",
  "expiresIn": "15m"
}
```

#### 2.3 Completar visita (usando token)
```bash
curl -X POST "http://localhost:3001/maintenance/VISIT_ID/complete?token=TOKEN" \
  -F "level_inlet=24.5" \
  -F "level_outlet=18.2" \
  -F "strong_odors=false" \
  -F "blower_working=true" \
  -F "general_notes=Sistema funcionando correctamente" \
  -F "maintenanceFiles=@/path/to/photo1.jpg" \
  -F "maintenanceFiles=@/path/to/photo2.jpg" \
  -F 'fileFieldMapping={"photo1.jpg":"blower_working","photo2.jpg":"general"}'
```

**Respuesta esperada:**
```json
{
  "message": "Maintenance visit completed successfully",
  "visit": {
    "id": "uuid-visit-1",
    "status": "completed",
    "level_inlet": 24.5,
    "level_outlet": 18.2,
    "strong_odors": false,
    "blower_working": true,
    "general_notes": "Sistema funcionando correctamente",
    "completedAt": "2025-01-16T20:30:00Z",
    "mediaCount": 2
  }
}
```

---

### Fase 3: Pruebas Frontend Web

#### 3.1 Asignar visita desde el admin
1. Navegar a `http://localhost:5173/maintenance` (ruta interna)
2. Ver lista de visitas de mantenimiento
3. Hacer clic en "Asignar a trabajador"
4. **Verificar que el dropdown muestra trabajadores con rol `maintenance` Y `worker`**
5. Seleccionar un trabajador y asignar

#### 3.2 Abrir formulario público
1. Generar un token (desde backend o desde la app móvil)
2. Abrir: `http://localhost:5173/maintenance-form?visitId=VISIT_ID&token=TOKEN`
   - En producción: `https://www.zurcherseptic.com/maintenance-form?visitId=VISIT_ID&token=TOKEN`
3. **Verificar que el formulario carga los datos de la visita**
4. Verificar que se muestran:
   - Información del permiso (dirección, sistema)
   - Secciones condicionales según `systemType`:
     - ATU: Inspección General + Sección ATU
     - Lift Station: Inspección General + Lift Station
     - PBTS: Sección de muestras de pozo

#### 3.3 Completar formulario
1. Rellenar campos numéricos (levels)
2. Marcar checkboxes (strong_odors, needs_pumping, etc.)
3. Agregar observaciones en los campos que lo requieran
4. Subir fotos/videos usando MediaUpload
5. Agregar video general del sistema (opcional)
6. Firmar (opcional)
7. Hacer clic en "Enviar Formulario de Mantenimiento"
8. **Verificar mensaje de éxito**

---

### Fase 4: Pruebas App Móvil

#### 4.1 Configuración inicial
```bash
cd WorkTrackerApp

# Desarrollo con dispositivo físico
npm start
# Escanear QR con Expo Go

# O desarrollo con emulador
npm run android
# o
npm run ios
```

#### 4.2 Verificar navegación
1. Iniciar sesión con un usuario con rol `worker` o `maintenance`
2. **Verificar que aparece el tab "Mantenimientos" con icono de herramienta**
3. Hacer clic en el tab "Mantenimientos"

#### 4.3 Probar MaintenanceList
1. Verificar que se muestra:
   - Lista de visitas asignadas al usuario
   - Tarjetas con:
     - Estado (badge con color)
     - Dirección de la propiedad
     - Tipo de sistema
     - Fecha programada
     - Botón "Ver Formulario" o "Ver Detalles"
2. Hacer pull-to-refresh para actualizar
3. Si no hay visitas, debe mostrar mensaje "No tienes mantenimientos asignados"

#### 4.4 Abrir WebView
1. Hacer clic en una tarjeta de visita pendiente
2. **Verificar que se muestra loading "Generando acceso seguro..."**
3. Verificar que se abre el WebView con el formulario web
4. Verificar que el formulario está funcional dentro del WebView:
   - Se pueden rellenar campos
   - Se pueden subir archivos (cámara/galería)
   - Se puede hacer scroll

#### 4.5 Completar desde móvil
1. Rellenar el formulario dentro del WebView
2. Subir al menos 2 fotos (desde cámara o galería del dispositivo)
3. Hacer clic en "Enviar"
4. **Verificar que se muestra alert "Formulario de mantenimiento enviado correctamente"**
5. Hacer clic en "OK"
6. **Verificar que regresa a MaintenanceList**
7. **Verificar que la visita completada ya no aparece en pending**

---

### Fase 5: Verificación de Datos

#### 5.1 Verificar en la base de datos
```sql
-- Ver la visita completada
SELECT 
  mv.*,
  s.name as completed_by,
  s.role
FROM "MaintenanceVisits" mv
LEFT JOIN "Staff" s ON mv."completedByStaffId" = s.id
WHERE mv.id = 'VISIT_ID_COMPLETED';

-- Ver los archivos adjuntos
SELECT 
  mm.id,
  mm."fieldName",
  mm."fileUrl",
  mm."fileType",
  mm."createdAt"
FROM "MaintenanceMedia" mm
WHERE mm."maintenanceVisitId" = 'VISIT_ID_COMPLETED'
ORDER BY mm."createdAt";
```

**Verificar:**
- ✅ `status = 'completed'`
- ✅ `completedAt` tiene timestamp
- ✅ `completedByStaffId` está poblado
- ✅ Campos del formulario tienen valores correctos
- ✅ `well_samples` tiene JSON válido si se rellenó
- ✅ Archivos en `MaintenanceMedia` tienen `fieldName` correcto

#### 5.2 Verificar archivos en Cloudinary
1. Ir a tu dashboard de Cloudinary
2. Navegar a la carpeta `maintenance/`
3. **Verificar que los archivos se subieron correctamente**
4. Verificar que los nombres tienen el formato: `visit-{visitId}-{timestamp}-{originalname}`

---

## 🐛 Problemas Comunes y Soluciones

### Error: "Cannot find module 'react-native-webview'"
```bash
cd WorkTrackerApp
npm install react-native-webview
npx expo prebuild
```

### Error: Token expirado
- Los tokens duran 15 minutos
- Si demoras más, la app generará uno nuevo automáticamente al recargar

### Error: CORS en desarrollo
En `BackZurcher/src/index.js`, verificar:
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

### WebView no carga el formulario
1. Verificar que FrontZurcher está corriendo en puerto 5173
2. Verificar que `VITE_API_URL` está configurado correctamente
3. En desarrollo, cambiar la URL en `MaintenanceWebView.jsx`:
```javascript
const baseUrl = __DEV__ 
  ? 'http://TU_IP_LOCAL:5173' // Usar IP de tu computadora, no localhost
  : 'https://www.zurcherseptic.com';
```

Para encontrar tu IP:
```bash
# Windows
ipconfig
# Buscar "IPv4 Address" en tu adaptador de red

# Mac/Linux
ifconfig
# Buscar inet en tu adaptador de red activo
```

### Los archivos no se suben
1. Verificar límite de archivos en multer (backend):
```javascript
upload.array('maintenanceFiles', 20) // Máximo 20 archivos
```
2. Verificar que Cloudinary está configurado correctamente
3. Verificar tamaño máximo de archivos (configurado en multer)

---

## 📊 Checklist de Aceptación

### ✅ Backend
- [ ] Migraciones ejecutadas sin errores
- [ ] GET /maintenance/assigned retorna visitas
- [ ] POST /maintenance/:id/generate-token crea token válido
- [ ] POST /maintenance/:id/complete acepta FormData
- [ ] Archivos se suben a Cloudinary con fieldName

### ✅ Frontend Web
- [ ] Ruta /maintenance-form es pública
- [ ] Formulario carga datos con visitId + token
- [ ] Secciones condicionales funcionan (ATU, Lift Station, PBTS)
- [ ] MediaUpload permite subir archivos
- [ ] Formulario envía postMessage al WebView
- [ ] VisitForm muestra trabajadores con rol maintenance y worker

### ✅ App Móvil
- [ ] Tab "Mantenimientos" visible en navegación
- [ ] MaintenanceList muestra visitas asignadas
- [ ] Pull-to-refresh funciona
- [ ] Al hacer clic en tarjeta, genera token y abre WebView
- [ ] WebView carga formulario correctamente
- [ ] Se pueden subir archivos desde el dispositivo
- [ ] Al completar, muestra alert y regresa a la lista
- [ ] Lista se actualiza después de completar

### ✅ Flujo Completo
- [ ] Admin asigna visita a worker/maintenance desde web
- [ ] Worker ve visita en app móvil
- [ ] Worker abre formulario desde app
- [ ] Worker completa formulario con fotos
- [ ] Formulario se envía correctamente
- [ ] Visita cambia a status='completed'
- [ ] Archivos aparecen en Cloudinary
- [ ] MaintenanceMedia tiene fieldName correcto
- [ ] Worker ya no ve la visita en pending

---

## 🚀 Deploy a Producción

### 1. Backend (Railway)
```bash
cd BackZurcher
git push railway main
```

**URL de producción:** `https://zurcherapi.up.railway.app`

Verificar variables de entorno en Railway:
- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 2. Frontend (Vercel/Netlify)
```bash
cd FrontZurcher
npm run build
# Deploy según tu hosting
```

Configurar variable de entorno:
- `VITE_API_URL=https://zurcherapi.up.railway.app`

### 3. App Móvil (Expo)

**Actualizar URL de producción:**
```javascript
// WorkTrackerApp/src/utils/axios.js
const API_URL = 'https://zurcherapi.up.railway.app';
```

**Build y deploy:**
```bash
cd WorkTrackerApp
eas build --platform android
# o
eas build --platform ios
```

---

## 📚 Documentación Adicional

- [maintenance-form-contract.md](FrontZurcher/docs/maintenance-form-contract.md) - Contrato de API
- [README-maintenance-flow.md](FrontZurcher/docs/README-maintenance-flow.md) - Flujo completo
- [MAINTENANCE_API.md](pendiente) - Documentación de endpoints

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisar logs del backend: `cd BackZurcher && npm start`
2. Revisar consola del frontend: Abrir DevTools en navegador
3. Revisar logs de React Native: `npx react-native log-android` o `log-ios`
4. Verificar que todas las migraciones corrieron
5. Verificar que los tokens no están expirados

---

## 🎯 Próximos Pasos (Opcional)

- [ ] Agregar notificaciones push cuando se asigna una visita
- [ ] Agregar firma digital con canvas
- [ ] Agregar modo offline (guardar borrador localmente)
- [ ] Agregar reportes PDF de visitas completadas
- [ ] Agregar dashboard con métricas de mantenimiento
- [ ] Tests unitarios y E2E

---

**Última actualización:** 16 de Enero 2025
