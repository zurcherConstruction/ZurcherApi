# 🚀 Guía de Deploy: Sistema de Firmas Manuales

## 📋 Resumen de Cambios

Se implementó un sistema híbrido de firmas que permite:
- ✅ Firmas automáticas vía SignNow (existente)
- ✅ **Carga manual de PDFs firmados** (NUEVO)
- ✅ Tracking del método de firma usado

---

## 🗃️ MIGRACIÓN REQUERIDA PARA DEPLOY

### Archivo de Migración
**Ubicación:** `BackZurcher/migrations/add-manual-signature-fields.js`

### ¿Qué hace esta migración?

Agrega 3 nuevos campos a la tabla **Budgets**:

1. **`signatureMethod`** - ENUM('signnow', 'manual', 'legacy', 'none')
   - Identifica cómo se firmó el presupuesto
   - Default: 'none'

2. **`manualSignedPdfPath`** - VARCHAR(500)
   - URL de Cloudinary del PDF firmado manualmente
   - Nullable

3. **`manualSignedPdfPublicId`** - VARCHAR(200)
   - Public ID de Cloudinary para gestión del archivo
   - Nullable

### Migración de Datos Automática

La migración también actualiza los registros existentes:
- Budgets con `signNowDocumentId` → `signatureMethod = 'signnow'`
- Budgets con `legacySignedPdfUrl` → `signatureMethod = 'legacy'`
- Otros → `signatureMethod = 'none'` (default)

---

## 🔧 PASOS PARA EJECUTAR EN PRODUCCIÓN

### Opción A: Usando el script run-migration.js (Recomendado)

```bash
# 1. Conectarse al servidor de producción
ssh usuario@servidor-produccion

# 2. Navegar al directorio del backend
cd /path/to/ZurcherApi/BackZurcher

# 3. Ejecutar la migración
node run-migration.js add-manual-signature-fields

# 4. Verificar que se ejecutó correctamente
# Debe mostrar:
# ✅ Campo signatureMethod agregado a Budgets
# ✅ Campo manualSignedPdfPath agregado a Budgets
# ✅ Campo manualSignedPdfPublicId agregado a Budgets
# ✅ Budgets con SignNow actualizados a signatureMethod=signnow
# ✅ Budgets legacy actualizados a signatureMethod=legacy
```

### Opción B: SQL Directo (Si prefieres ejecutar manualmente)

```sql
-- 1. Agregar campo signatureMethod
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='Budgets' AND column_name='signatureMethod'
    ) THEN
        -- Crear el tipo ENUM si no existe
        CREATE TYPE "enum_Budgets_signatureMethod" AS ENUM('signnow', 'manual', 'legacy', 'none');
        
        -- Agregar la columna
        ALTER TABLE "Budgets" 
        ADD COLUMN "signatureMethod" "enum_Budgets_signatureMethod" DEFAULT 'none';
    END IF;
END $$;

-- 2. Agregar campo manualSignedPdfPath
ALTER TABLE "Budgets" 
ADD COLUMN IF NOT EXISTS "manualSignedPdfPath" VARCHAR(500);

-- 3. Agregar campo manualSignedPdfPublicId
ALTER TABLE "Budgets" 
ADD COLUMN IF NOT EXISTS "manualSignedPdfPublicId" VARCHAR(200);

-- 4. Actualizar registros existentes con SignNow
UPDATE "Budgets" 
SET "signatureMethod" = 'signnow' 
WHERE "signNowDocumentId" IS NOT NULL 
AND "signatureMethod" = 'none';

-- 5. Actualizar registros legacy
UPDATE "Budgets" 
SET "signatureMethod" = 'legacy' 
WHERE "legacySignedPdfUrl" IS NOT NULL 
AND "signatureMethod" = 'none';

-- 6. Verificar los cambios
SELECT 
    "signatureMethod", 
    COUNT(*) as total
FROM "Budgets"
GROUP BY "signatureMethod";
```

---

## 📂 ARCHIVOS MODIFICADOS EN EL DEPLOY

### Backend (BackZurcher/)

#### Nuevos Archivos:
1. `migrations/add-manual-signature-fields.js` - Migración de BD ✅

#### Archivos Modificados:
1. `src/data/models/Budget.js` - Agregados 3 campos nuevos
2. `src/controllers/BudgetController.js` - Agregado método `uploadManualSignedPdf`
3. `src/routes/BudgetRoutes.js` - Agregada ruta POST `/:idBudget/upload-manual-signed`
4. `src/controllers/signNowController.js` - Corregido import de cloudinary
5. `src/services/checkPendingSignatures.js` - Corregido import de cloudinary

#### Documentación:
- `MANUAL_SIGNATURE_UPLOAD_GUIDE.md`
- `MANUAL_SIGNATURE_IMPLEMENTATION_STATUS.md`
- `DEPLOY_MANUAL_SIGNATURE.md` (este archivo)

---

## ✅ CHECKLIST PRE-DEPLOY

### Antes de hacer deploy:

- [ ] **Backup de BD** - Hacer backup completo de la base de datos
  ```bash
  pg_dump -U postgres -d zurcher_db > backup_before_manual_signature_$(date +%Y%m%d).sql
  ```

- [ ] **Variables de entorno** - Verificar que Cloudinary esté configurado
  ```bash
  # En el servidor, verificar que estas variables existan:
  echo $CLOUDINARY_CLOUD_NAME
  echo $CLOUDINARY_API_KEY
  echo $CLOUDINARY_API_SECRET
  ```

- [ ] **Permisos de roles** - Confirmar roles permitidos
  - admin ✅
  - owner ✅
  - recept ✅ (puede subir PDFs firmados)

- [ ] **Testing local** - Verificar que todo funcione en local
  ```bash
  npm run dev
  # Probar el endpoint manualmente
  ```

---

## 🚀 SECUENCIA DE DEPLOY

### 1. Preparación
```bash
# Crear backup
pg_dump -U postgres -d zurcher_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verificar que el backup se creó
ls -lh backup_*.sql
```

### 2. Deploy del código
```bash
# En el servidor de producción
cd /path/to/ZurcherApi

# Pull de los cambios (asumiendo que están en branch yani48)
git fetch origin
git checkout yani48
git pull origin yani48

# Instalar dependencias (por si hay nuevas)
cd BackZurcher
npm install
```

### 3. Ejecutar migración
```bash
# Ejecutar la migración
node run-migration.js add-manual-signature-fields

# Debe mostrar:
# ✅ Conexión a PostgreSQL establecida
# ✅ Campo signatureMethod agregado a Budgets
# ✅ Campo manualSignedPdfPath agregado a Budgets
# ✅ Campo manualSignedPdfPublicId agregado a Budgets
# ✅ Budgets con SignNow actualizados
# ✅ Budgets legacy actualizados
# 🎉 Migración completada exitosamente!
```

### 4. Reiniciar servidor
```bash
# Con PM2
pm2 restart zurcher-api

# O con systemd
sudo systemctl restart zurcher-api

# Verificar que inició correctamente
pm2 logs zurcher-api --lines 50
```

### 5. Verificación post-deploy
```bash
# Verificar que la API responde
curl http://localhost:3001/health

# Verificar estructura de BD
psql -U postgres -d zurcher_db -c "\d \"Budgets\"" | grep signature
```

---

## 🧪 TESTING POST-DEPLOY

### Test 1: Verificar endpoint
```bash
# Obtener token (reemplazar credenciales)
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zurcher.com","password":"tu_password"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# Probar upload (necesitas un PDF de prueba)
curl -X POST http://localhost:3001/budget/[BUDGET_ID]/upload-manual-signed \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Debe responder:
# {
#   "success": true,
#   "message": "PDF firmado cargado exitosamente",
#   ...
# }
```

### Test 2: Verificar base de datos
```sql
-- Verificar que los campos existen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Budgets'
AND column_name IN ('signatureMethod', 'manualSignedPdfPath', 'manualSignedPdfPublicId');

-- Verificar distribución de signatureMethod
SELECT 
    "signatureMethod", 
    COUNT(*) as total,
    COUNT(CASE WHEN "status" = 'signed' THEN 1 END) as signed_count
FROM "Budgets"
GROUP BY "signatureMethod";

-- Ver un ejemplo de Budget con cada método
SELECT 
    "idBudget",
    "invoiceNumber",
    "status",
    "signatureMethod",
    "manualSignedPdfPath",
    "signNowDocumentId"
FROM "Budgets"
WHERE "signatureMethod" != 'none'
LIMIT 5;
```

### Test 3: Verificar Cloudinary
```bash
# Verificar que los PDFs se suben correctamente
# Después de hacer un upload manual, revisar en:
# https://cloudinary.com/console/media_library

# Buscar: folder:signed_budgets tag:manual-signature
```

---

## 🔄 ROLLBACK (Si algo sale mal)

### Opción 1: Revertir migración
```sql
-- Eliminar los campos agregados
ALTER TABLE "Budgets" DROP COLUMN IF EXISTS "signatureMethod";
ALTER TABLE "Budgets" DROP COLUMN IF EXISTS "manualSignedPdfPath";
ALTER TABLE "Budgets" DROP COLUMN IF EXISTS "manualSignedPdfPublicId";

-- Eliminar el tipo ENUM
DROP TYPE IF EXISTS "enum_Budgets_signatureMethod";
```

### Opción 2: Restaurar backup
```bash
# Detener la aplicación
pm2 stop zurcher-api

# Restaurar backup
psql -U postgres -d zurcher_db < backup_[TIMESTAMP].sql

# Revertir código
git checkout main
git pull origin main

# Reiniciar
pm2 restart zurcher-api
```

---

## 📊 MÉTRICAS POST-DEPLOY

Después del deploy, monitorear:

1. **Logs del servidor**
   ```bash
   pm2 logs zurcher-api --lines 100
   # Buscar errores relacionados con "signature" o "manual"
   ```

2. **Uso de Cloudinary**
   - Folder `signed_budgets` debe aparecer
   - Verificar que los tags se aplican correctamente

3. **Base de datos**
   ```sql
   -- Monitorear uso de la nueva funcionalidad
   SELECT DATE("signedAt") as date, COUNT(*) as manual_signatures
   FROM "Budgets"
   WHERE "signatureMethod" = 'manual'
   GROUP BY DATE("signedAt")
   ORDER BY date DESC;
   ```

---

## 📚 DOCUMENTACIÓN ADICIONAL

- **Guía Completa de Uso**: `MANUAL_SIGNATURE_UPLOAD_GUIDE.md`
- **Estado de Implementación**: `MANUAL_SIGNATURE_IMPLEMENTATION_STATUS.md`
- **Mejoras de SignNow**: `SIGNNOW_IMPROVEMENTS_SUMMARY.md`

---

## 🆘 TROUBLESHOOTING

### Error: "Cannot find module cloudinary"
**Solución**: Verificar imports en:
- `src/controllers/signNowController.js`
- `src/services/checkPendingSignatures.js`

Debe ser:
```javascript
const { cloudinary } = require('../utils/cloudinaryConfig');
```

### Error: "enum_Budgets_signatureMethod already exists"
**Solución**: El ENUM ya existe, la migración es idempotente, no hay problema.

### Error: "No se proporcionó ningún archivo PDF"
**Solución**: Verificar que el campo del form-data se llame "file":
```javascript
formData.append('file', pdfFile);
```

### Error 404 en la ruta
**Solución**: La ruta correcta es `/budget/:id/upload-manual-signed` (sin `/api`)

---

## ✅ CONFIRMACIÓN DE DEPLOY EXITOSO

El deploy fue exitoso si:

- [ ] La migración se ejecutó sin errores
- [ ] El servidor reinició correctamente
- [ ] El endpoint responde (probado con curl/Postman)
- [ ] Los PDFs se suben a Cloudinary
- [ ] Los campos se actualizan en la BD
- [ ] No hay errores en los logs

---

**Fecha de implementación**: Octubre 2025  
**Versión**: 1.0.0  
**Branch**: yani48  
**Desarrollador**: Zurcher Construction Team
