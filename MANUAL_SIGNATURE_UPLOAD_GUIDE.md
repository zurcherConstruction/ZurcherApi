# 📤 Guía: Carga Manual de PDFs Firmados

## 🎯 Propósito
Sistema híbrido de firmas que permite tanto firmas automáticas vía SignNow como carga manual de PDFs ya firmados externamente.

---

## 📊 Sistema de Tracking de Firmas

### Campo: `signatureMethod`
Indica el método usado para obtener la firma del presupuesto:

| Valor | Descripción |
|-------|-------------|
| `signnow` | Firmado automáticamente a través de SignNow |
| `manual` | PDF firmado subido manualmente por staff |
| `legacy` | Presupuestos antiguos migrados con firma |
| `none` | Sin firma (estado por defecto) |

### Campos Relacionados

**Para SignNow:**
- `signNowDocumentId` - ID del documento en SignNow
- `signedPdfPath` - URL de Cloudinary del PDF firmado vía SignNow
- `signedPdfPublicId` - Public ID de Cloudinary para SignNow

**Para Manual:**
- `manualSignedPdfPath` - URL de Cloudinary del PDF subido manualmente
- `manualSignedPdfPublicId` - Public ID de Cloudinary para manual

**Comunes:**
- `status` - Se actualiza a `'signed'` cuando hay firma
- `signedAt` - Timestamp de cuándo se firmó

---

## 🔌 Backend Endpoint

### **POST** `/api/budgets/:idBudget/upload-manual-signed`

#### Autenticación
- **Roles permitidos:** `admin`, `owner`, `recept`
- **Header requerido:** `Authorization: Bearer <token>`

#### Request (multipart/form-data)
```javascript
{
  file: <PDF_FILE> // Campo "file" con el PDF firmado
}
```

#### Validaciones
✅ Verifica que se envió un archivo  
✅ Verifica que el archivo es PDF (mimetype: application/pdf)  
✅ Verifica que el Budget existe  
✅ Elimina PDF manual anterior si existe (para reemplazos)  

#### Proceso
1. **Validar archivo PDF**
2. **Buscar Budget** con información del Permit
3. **Crear tags de identificación:**
   - `invoice-{invoiceNumber}` (o `budget-{id}` si no tiene invoice)
   - `property-{address-normalizada}`
   - `manual-signature`
   - `signed-budget`
4. **Eliminar PDF manual anterior** de Cloudinary (si existe)
5. **Subir nuevo PDF** a Cloudinary en folder `signed_budgets`
6. **Actualizar Budget:**
   - `signatureMethod = 'manual'`
   - `manualSignedPdfPath = <cloudinary_url>`
   - `manualSignedPdfPublicId = <cloudinary_public_id>`
   - `status = 'signed'`
   - `signedAt = new Date()`
7. **Enviar notificación** (BUDGET_MANUAL_SIGNED)

#### Response Success (200)
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

#### Response Errors

**400 - No file provided**
```json
{
  "error": "No se proporcionó ningún archivo PDF"
}
```

**400 - Invalid file type**
```json
{
  "error": "El archivo debe ser un PDF",
  "mimeTypeReceived": "image/jpeg"
}
```

**404 - Budget not found**
```json
{
  "error": "Presupuesto no encontrado"
}
```

**500 - Server error**
```json
{
  "error": "Error al subir el PDF firmado",
  "details": "Error message..."
}
```

---

## 🧪 Testing con Postman/Thunder Client

### 1. Preparar el Request

**URL:** `http://localhost:3001/api/budgets/123/upload-manual-signed`  
**Method:** POST  
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Body (form-data)
| Key | Type | Value |
|-----|------|-------|
| file | File | budget_firmado.pdf |

### 3. Expected Flow
1. ✅ PDF se sube a Cloudinary
2. ✅ Budget se actualiza con `signatureMethod='manual'`
3. ✅ Status cambia a `'signed'`
4. ✅ Se registra `signedAt` timestamp
5. ✅ Se almacenan URLs de Cloudinary

---

## 💻 Ejemplo de Uso Frontend (React)

```jsx
// En EditBudget.jsx o componente similar

const [uploadingPdf, setUploadingPdf] = useState(false);
const [uploadError, setUploadError] = useState(null);

const handleManualSignedUpload = async (event) => {
  const file = event.target.files[0];
  
  if (!file) return;
  
  // Validar que es PDF
  if (file.type !== 'application/pdf') {
    setUploadError('Solo se permiten archivos PDF');
    return;
  }

  setUploadingPdf(true);
  setUploadError(null);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_URL}/api/budgets/${budgetId}/upload-manual-signed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir el PDF');
    }

    const data = await response.json();
    
    // Actualizar estado local
    setBudget({
      ...budget,
      status: 'signed',
      signatureMethod: 'manual',
      manualSignedPdfPath: data.pdfUrl,
      signedAt: data.budget.signedAt
    });

    alert('✅ PDF firmado subido exitosamente');
    
  } catch (error) {
    console.error('Error al subir PDF:', error);
    setUploadError(error.message);
  } finally {
    setUploadingPdf(false);
  }
};

return (
  <div>
    <h3>Subir Presupuesto Firmado</h3>
    
    <input
      type="file"
      accept=".pdf,application/pdf"
      onChange={handleManualSignedUpload}
      disabled={uploadingPdf}
    />
    
    {uploadingPdf && <p>⏳ Subiendo PDF...</p>}
    {uploadError && <p style={{color: 'red'}}>❌ {uploadError}</p>}
    
    {budget.signatureMethod === 'manual' && (
      <div>
        <p>✅ Firmado manualmente</p>
        <a href={budget.manualSignedPdfPath} target="_blank">
          Ver PDF Firmado
        </a>
      </div>
    )}
  </div>
);
```

---

## 🔄 Workflow de Firmas Híbrido

### Opción 1: SignNow (Automático)
```
1. Staff crea Budget
2. Staff envía a SignNow → signNowDocumentId creado
3. Cliente firma en SignNow
4. Cron detecta firma (cada 2 horas)
5. Cron descarga PDF → sube a Cloudinary
6. Budget.signatureMethod = 'signnow'
7. Budget.status = 'signed'
```

### Opción 2: Manual Upload
```
1. Staff crea Budget
2. Cliente firma externamente (papel, PDF externo, etc.)
3. Staff sube PDF firmado vía endpoint
4. Backend sube a Cloudinary con metadata
5. Budget.signatureMethod = 'manual'
6. Budget.status = 'signed'
```

### Opción 3: Legacy (Migración)
```
1. Sistema detecta presupuestos antiguos
2. Si tienen legacySignedPdfUrl → signatureMethod = 'legacy'
3. Mantienen su status original
```

---

## 🔍 Consultas Útiles

### Listar Budgets por Método de Firma
```javascript
// SignNow
const signNowBudgets = await Budget.findAll({
  where: { signatureMethod: 'signnow' }
});

// Manual
const manualBudgets = await Budget.findAll({
  where: { signatureMethod: 'manual' }
});

// Todos los firmados (cualquier método)
const signedBudgets = await Budget.findAll({
  where: { 
    status: 'signed',
    signatureMethod: { [Op.not]: 'none' }
  }
});
```

### Obtener URL del PDF Firmado (sin importar método)
```javascript
function getSignedPdfUrl(budget) {
  if (budget.signatureMethod === 'signnow') {
    return budget.signedPdfPath;
  }
  if (budget.signatureMethod === 'manual') {
    return budget.manualSignedPdfPath;
  }
  if (budget.signatureMethod === 'legacy') {
    return budget.legacySignedPdfUrl;
  }
  return null; // No firmado
}
```

---

## 🛡️ Validaciones Futuras

### En Work Creation (PRÓXIMO)
```javascript
// WorkController.createWork
if (!budget.status === 'signed' || budget.signatureMethod === 'none') {
  return res.status(400).json({
    error: 'No se puede crear un Work sin presupuesto firmado',
    budgetStatus: budget.status,
    signatureMethod: budget.signatureMethod
  });
}
```

### En InitialPayment (PRÓXIMO)
```javascript
// Filtrar solo direcciones con presupuesto firmado
const worksWithSignedBudgets = await Work.findAll({
  include: [{
    model: Budget,
    where: { 
      status: 'signed',
      signatureMethod: { [Op.not]: 'none' }
    }
  }]
});
```

---

## 📋 Checklist de Implementación

### Backend ✅
- [x] Migración `add-manual-signature-fields.js`
- [x] Campos en Budget model
- [x] Método `BudgetController.uploadManualSignedPdf`
- [x] Ruta POST `/api/budgets/:id/upload-manual-signed`
- [x] Validaciones de archivo PDF
- [x] Integración con Cloudinary
- [x] Sistema de tags y metadata

### Frontend ⏳
- [ ] Botón de carga en EditBudget.jsx
- [ ] Input de archivo (accept=".pdf")
- [ ] Indicador de carga (loading state)
- [ ] Mensajes de éxito/error
- [ ] Visualización del PDF cargado
- [ ] Badge de método de firma

### Validaciones ⏳
- [ ] Work creation check (signature required)
- [ ] InitialPayment filtering (signed only)
- [ ] Frontend disable create Work if not signed

### Testing ⏳
- [ ] Subir PDF válido → Success
- [ ] Subir no-PDF → Error 400
- [ ] Budget inexistente → Error 404
- [ ] Sin archivo → Error 400
- [ ] Reemplazar PDF manual → Old deleted, new uploaded
- [ ] Verificar tags en Cloudinary
- [ ] Verificar metadata en Cloudinary

---

## 🎨 UI Recomendaciones

### Badge de Estado de Firma
```jsx
{budget.signatureMethod === 'signnow' && (
  <span className="badge badge-success">✓ SignNow</span>
)}
{budget.signatureMethod === 'manual' && (
  <span className="badge badge-info">✓ Manual</span>
)}
{budget.signatureMethod === 'legacy' && (
  <span className="badge badge-secondary">Legacy</span>
)}
{budget.signatureMethod === 'none' && (
  <span className="badge badge-warning">Sin Firmar</span>
)}
```

### Botón de Carga Condicional
```jsx
{budget.status !== 'signed' && (
  <button onClick={() => fileInputRef.current.click()}>
    📤 Subir Presupuesto Firmado
  </button>
)}

{budget.status === 'signed' && (
  <button onClick={() => fileInputRef.current.click()}>
    🔄 Reemplazar Presupuesto Firmado
  </button>
)}
```

---

## 🚨 Troubleshooting

### Error: "No se proporcionó ningún archivo PDF"
- Verificar que el input tiene `name="file"`
- Verificar que FormData usa `append('file', archivo)`

### Error: "El archivo debe ser un PDF"
- Verificar mimetype del archivo
- Algunos PDFs tienen mimetype incorrecto → verificar extensión también

### PDF no aparece en Cloudinary
- Verificar credenciales de Cloudinary en `.env`
- Verificar que `resource_type: 'raw'` está configurado
- Verificar logs del servidor para errores de upload

### Budget no se actualiza
- Verificar que transaction no está fallando
- Revisar logs de consola en el backend
- Verificar permisos del usuario (rol admin/owner/recept)

---

## 📚 Recursos Relacionados

- `SIGNNOW_IMPROVEMENTS_SUMMARY.md` - Mejoras de SignNow
- `migrations/add-manual-signature-fields.js` - Migración de campos
- `src/models/Budget.js` - Definición del modelo
- `src/controllers/BudgetController.js` - Líneas ~4380+ uploadManualSignedPdf
- `src/routes/BudgetRoutes.js` - Ruta de upload

---

**✨ Sistema listo para soportar firmas híbridas: SignNow + Manual + Legacy**
