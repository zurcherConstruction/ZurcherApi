# ⚡ Comandos Rápidos - Sistema de Mantenimiento

## 🚀 Iniciar Desarrollo

### Backend
```powershell
cd BackZurcher
npm start
# O con nodemon:
npm run dev
```

### Frontend Web
```powershell
cd FrontZurcher
npm run dev
# Abre en: http://localhost:5173
```

### App Móvil
```powershell
cd WorkTrackerApp
npm start
# Escanear QR con Expo Go
```

---

## 🗄️ Verificar Base de Datos

### Ejecutar migraciones
```powershell
cd BackZurcher
node run-maintenance-migrations.js
```

### Verificar estructura (desde psql o pgAdmin)
```sql
-- Copiar y pegar el contenido de verify-maintenance-database.sql
-- O ejecutar directamente:
\i verify-maintenance-database.sql
```

---

## 🧪 Pruebas Rápidas con cURL

### 1. Obtener visitas asignadas
```powershell
$staffId = "TU_STAFF_ID"
$token = "TU_JWT_TOKEN"

curl "http://localhost:3001/maintenance/assigned?workerId=$staffId" `
  -H "Authorization: Bearer $token"
```

### 2. Generar token de acceso
```powershell
$visitId = "TU_VISIT_ID"
$token = "TU_JWT_TOKEN"

curl -X POST "http://localhost:3001/maintenance/$visitId/generate-token" `
  -H "Authorization: Bearer $token"
```

### 3. Completar visita (simulación básica)
```powershell
$visitId = "TU_VISIT_ID"
$accessToken = "TOKEN_GENERADO"

curl -X POST "http://localhost:3001/maintenance/$visitId/complete?token=$accessToken" `
  -F "level_inlet=24.5" `
  -F "level_outlet=18.2" `
  -F "strong_odors=false" `
  -F "general_notes=Sistema funcionando correctamente"
```

---

## 📊 Consultas SQL Rápidas

### Ver visitas pendientes
```sql
SELECT 
    mv.id,
    mv.status,
    mv."scheduledDate",
    s.name as assigned_to,
    p.address
FROM "MaintenanceVisits" mv
LEFT JOIN "Staff" s ON mv."assignedToStaffId" = s.id
JOIN "Works" w ON mv."workId" = w.id
JOIN "Permits" p ON w."permitId" = p.id
WHERE mv.status = 'pending'
ORDER BY mv."scheduledDate";
```

### Ver trabajadores disponibles
```sql
SELECT 
    id,
    name,
    email,
    role
FROM "Staff"
WHERE role IN ('worker', 'maintenance')
ORDER BY name;
```

### Ver últimas visitas completadas
```sql
SELECT 
    mv.id,
    mv."completedAt",
    s.name as completed_by,
    p.address,
    (SELECT COUNT(*) FROM "MaintenanceMedia" WHERE "maintenanceVisitId" = mv.id) as files
FROM "MaintenanceVisits" mv
LEFT JOIN "Staff" s ON mv."completedByStaffId" = s.id
JOIN "Works" w ON mv."workId" = w.id
JOIN "Permits" p ON w."permitId" = p.id
WHERE mv.status = 'completed'
ORDER BY mv."completedAt" DESC
LIMIT 10;
```

---

## 🔍 Debugging

### Ver logs del backend en tiempo real
```powershell
cd BackZurcher
npm start | Select-String -Pattern "maintenance"
```

### Ver logs de React Native
```powershell
# Android
npx react-native log-android

# iOS
npx react-native log-ios
```

### Limpiar caché de Expo
```powershell
cd WorkTrackerApp
npx expo start --clear
```

### Verificar conexión a base de datos
```powershell
cd BackZurcher
node check-db-connection.js
```

---

## 📱 Obtener IP local para WebView

### Windows
```powershell
ipconfig
# Buscar "IPv4 Address" en tu adaptador Wi-Fi
```

### Actualizar URL en MaintenanceWebView.jsx
```javascript
const baseUrl = __DEV__ 
  ? 'http://TU_IP_AQUI:5173' // Ejemplo: http://192.168.1.100:5173
  : 'https://www.zurcherseptic.com';
```

---

## 🧹 Limpiar y Reinstalar

### Backend
```powershell
cd BackZurcher
Remove-Item -Recurse -Force node_modules
npm install
```

### Frontend
```powershell
cd FrontZurcher
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .vite
npm install
```

### App Móvil
```powershell
cd WorkTrackerApp
Remove-Item -Recurse -Force node_modules
npm install
npx expo prebuild --clean
```

---

## 🎯 Flujo de Prueba Rápido

### 1. Preparar datos
```sql
-- Verificar que existe un Work con status='maintenance'
SELECT id, title FROM "Works" WHERE status = 'maintenance' LIMIT 1;

-- Si no existe, actualizar uno:
UPDATE "Works" SET status = 'maintenance' WHERE id = 'TU_WORK_ID';
```

### 2. Crear visita de prueba
```sql
INSERT INTO "MaintenanceVisits" (
    id,
    "workId",
    status,
    "scheduledDate",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'TU_WORK_ID',
    'pending',
    NOW() + INTERVAL '1 day',
    NOW(),
    NOW()
)
RETURNING id, "workId", status, "scheduledDate";
```

### 3. Asignar desde el admin web
1. Ir a `http://localhost:5173/maintenance`
2. Buscar la visita creada
3. Hacer clic en "Asignar a trabajador"
4. Seleccionar un trabajador con rol `maintenance` o `worker`
5. Confirmar

### 4. Ver en la app móvil
1. Iniciar sesión con el usuario asignado
2. Ir al tab "Mantenimientos"
3. Verificar que aparece la visita
4. Hacer clic en "Ver Formulario"
5. Completar y enviar

---

## 🔐 Variables de Entorno

### BackZurcher/.env
```env
DATABASE_URL=postgresql://user:password@localhost:5432/zurcher_db
JWT_SECRET=tu_secreto_muy_seguro
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
PORT=3001
```

### FrontZurcher/.env
```env
VITE_API_URL=http://localhost:3001
# Producción:
# VITE_API_URL=https://zurcherapi.up.railway.app
```

### WorkTrackerApp (en axios.js)
```javascript
// Desarrollo:
const API_URL = 'http://TU_IP:3001';
// Producción:
// const API_URL = 'https://zurcherapi.up.railway.app';
```

---

## 📦 Dependencias Importantes

### Backend
- `express` - Servidor web
- `sequelize` - ORM
- `multer` - Carga de archivos
- `cloudinary` - Almacenamiento de medios
- `jsonwebtoken` - Autenticación

### Frontend Web
- `react` - UI
- `axios` - HTTP client
- `react-router-dom` - Routing

### App Móvil
- `react-native` - Framework móvil
- `react-native-webview` - WebView component
- `@react-navigation` - Navegación
- `@reduxjs/toolkit` - Estado global
- `expo` - Herramientas de desarrollo

---

## 🆘 Solución de Problemas Comunes

### "Cannot connect to backend"
1. Verificar que el backend está corriendo: `cd BackZurcher && npm start`
2. Verificar URL en axios.js (app móvil) o .env (frontend web)
3. Verificar que no hay firewall bloqueando el puerto 3001

### "Token expired"
- Los tokens duran 15 minutos
- Cerrar y volver a abrir el formulario desde la app
- Se generará un nuevo token automáticamente

### "WebView no carga"
1. Verificar que el frontend web está corriendo
2. Usar IP local en lugar de localhost
3. Verificar que el dispositivo está en la misma red

### "Archivos no se suben"
1. Verificar configuración de Cloudinary en .env
2. Verificar límite de archivos en multer (máximo 20)
3. Verificar tamaño de archivos (límite por defecto: 10MB)

---

## 📚 Documentación

- [MAINTENANCE_TESTING_GUIDE.md](./MAINTENANCE_TESTING_GUIDE.md) - Guía completa de pruebas
- [FrontZurcher/docs/maintenance-form-contract.md](./FrontZurcher/docs/maintenance-form-contract.md) - Contrato de API
- [FrontZurcher/docs/README-maintenance-flow.md](./FrontZurcher/docs/README-maintenance-flow.md) - Flujo del sistema
- [verify-maintenance-database.sql](./verify-maintenance-database.sql) - Verificación SQL

---

**Última actualización:** 16 de Enero 2025
