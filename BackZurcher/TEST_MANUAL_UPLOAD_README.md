# 🧪 Testing del Endpoint: Upload Manual de PDF Firmado

## 🚀 Opción 1: Test Automático (Recomendado)

### Paso único:
```powershell
# 1. Configurar token
$env:API_TOKEN = "tu_token_de_autenticacion"

# 2. Ejecutar test completo
.\test-complete.ps1
```

Esto hará automáticamente:
- ✅ Verificar token
- ✅ Generar PDF de prueba
- ✅ Buscar un Budget sin firmar
- ✅ Subir el PDF
- ✅ Mostrar resultados

---

## 🔧 Opción 2: Test Manual (Paso a Paso)

### Paso 1: Obtener token de autenticación
```powershell
# Configura tu token en una variable de entorno
$env:API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Paso 2: Generar PDF de prueba
```powershell
node test-generate-pdf.js
# Genera: test-budget.pdf
```

### Paso 3: Obtener Budget ID
```powershell
node get-test-budget-id.js
# Output: ID del Budget a usar
```

### Paso 4: Ejecutar upload
```powershell
.\test-manual-upload.ps1 -BudgetId 123 -PdfPath "test-budget.pdf"
# Usa el token de $env:API_TOKEN
```

**O con token explícito:**
```powershell
.\test-manual-upload.ps1 -BudgetId 123 -PdfPath "test-budget.pdf" -Token "tu_token"
```

---

## 📋 Scripts Disponibles

### `test-complete.ps1` - Test automático completo
```powershell
.\test-complete.ps1
```
Ejecuta todo el flujo de testing automáticamente.

### `test-manual-upload.ps1` - Upload individual
```powershell
.\test-manual-upload.ps1 -BudgetId <ID> -PdfPath <PATH> [-Token <TOKEN>]
```
Sube un PDF específico a un Budget específico.

**Parámetros:**
- `-BudgetId` (requerido): ID del Budget
- `-PdfPath` (requerido): Ruta al archivo PDF
- `-Token` (opcional): Token de auth (usa `$env:API_TOKEN` si no se proporciona)
- `-ApiUrl` (opcional): URL de la API (default: `http://localhost:3001`)

### `test-generate-pdf.js` - Generar PDF de prueba
```powershell
node test-generate-pdf.js
```
Genera `test-budget.pdf` para testing.

### `get-test-budget-id.js` - Obtener Budget ID
```powershell
node get-test-budget-id.js
```
Busca un Budget sin firmar y muestra su ID.

---

## ✅ Respuesta Exitosa

```json
{
  "success": true,
  "message": "PDF firmado cargado exitosamente",
  "budget": {
    "idBudget": 123,
    "invoiceNumber": "INV-0045",
    "status": "signed",
    "signatureMethod": "manual",
    "manualSignedPdfPath": "https://res.cloudinary.com/...",
    "signedAt": "2025-01-15T10:30:00.000Z"
  },
  "pdfUrl": "https://res.cloudinary.com/..."
}
```

---

## ❌ Errores Comunes

### Error 401: Unauthorized
```json
{
  "error": "Token no válido"
}
```
**Solución:** Verifica que el token sea correcto y esté en el header Authorization.

### Error 400: No file provided
```json
{
  "error": "No se proporcionó ningún archivo PDF"
}
```
**Solución:** Asegúrate de que el campo se llama "file" en el form-data.

### Error 400: Invalid file type
```json
{
  "error": "El archivo debe ser un PDF",
  "mimeTypeReceived": "image/jpeg"
}
```
**Solución:** Sube solo archivos con mimetype `application/pdf`.

### Error 404: Budget not found
```json
{
  "error": "Presupuesto no encontrado"
}
```
**Solución:** Verifica que el Budget ID existe en la base de datos.

---

## 🔍 Verificación Manual

Después de un upload exitoso, verifica en:

### 1. Base de Datos
```sql
SELECT 
  "idBudget", 
  "invoiceNumber", 
  "status", 
  "signatureMethod", 
  "manualSignedPdfPath",
  "signedAt"
FROM "Budgets"
WHERE "idBudget" = 123;
```

Debe mostrar:
- `status`: 'signed'
- `signatureMethod`: 'manual'
- `manualSignedPdfPath`: URL de Cloudinary
- `signedAt`: Timestamp

### 2. Cloudinary
1. Ir a: https://cloudinary.com/console
2. Media Library → Buscar: `budget-{id}-manual-signed`
3. Verificar tags:
   - `invoice-{number}` o `budget-{id}`
   - `property-{address}`
   - `manual-signature`
   - `signed-budget`
4. Verificar metadata:
   - `budget_id`
   - `invoice_number`
   - `property_address`
   - `uploaded_by`
   - `signature_method`: 'manual'

---

## 📊 Casos de Prueba

### Test 1: Upload exitoso
- Budget sin firmar
- PDF válido
- Token válido
- **Esperado**: Status 200, budget actualizado

### Test 2: Archivo no PDF
- Subir `.jpg` o `.txt`
- **Esperado**: Status 400, error "El archivo debe ser un PDF"

### Test 3: Sin archivo
- Request sin campo "file"
- **Esperado**: Status 400, error "No se proporcionó ningún archivo"

### Test 4: Budget inexistente
- Budget ID = 99999
- **Esperado**: Status 404, error "Presupuesto no encontrado"

### Test 5: Sin token
- Request sin header Authorization
- **Esperado**: Status 401, error de autenticación

### Test 6: Reemplazar PDF
- Budget ya con PDF manual
- Subir nuevo PDF
- **Esperado**: Status 200, PDF anterior eliminado, nuevo subido

---

## 🎯 Siguiente Paso

Una vez que el test sea exitoso:

✅ **Backend completo**  
⏳ **Frontend pendiente** → Ver `MANUAL_SIGNATURE_IMPLEMENTATION_STATUS.md`

---

## 📚 Documentación Adicional

- **Guía Completa**: `MANUAL_SIGNATURE_UPLOAD_GUIDE.md`
- **Estado de Implementación**: `MANUAL_SIGNATURE_IMPLEMENTATION_STATUS.md`
- **Mejoras de SignNow**: `SIGNNOW_IMPROVEMENTS_SUMMARY.md`
