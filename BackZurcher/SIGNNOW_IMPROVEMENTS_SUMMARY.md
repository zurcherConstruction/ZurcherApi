# SignNow - Mejoras Implementadas

## 📊 Estado Actual del Sistema

### ¿Cómo Funciona?
1. **Envío a Firma**: Budget/CO se envía a SignNow → se guarda `signNowDocumentId`
2. **Verificación Automática**: Cron job cada 2 horas verifica si están firmados
3. **Actualización**: Si firmado → status cambia a 'signed' y `signedAt` se registra

### ❌ Problemas Identificados
- **No descarga automática**: Los PDFs firmados quedan en SignNow, no se guardan en Cloudinary
- **Sin retry manual**: Si falla una descarga, no hay forma de reintentar
- **Sin identificación**: Los documentos en SignNow no muestran invoice# o dirección
- **Docs manuales invisibles**: Los subidos manualmente en SignNow no aparecen en el sistema

---

## ✅ Mejoras Implementadas

### 1. **Descarga Automática a Cloudinary** 🔄
- **Qué hace**: Cuando el cron detecta un documento firmado, automáticamente:
  - Descarga el PDF de SignNow
  - Lo sube a Cloudinary con metadata (invoice#, address)
  - Actualiza `signedPdfPath` en la BD
  - Borra el archivo temporal local

- **Ubicación**: 
  - `checkPendingSignatures.js` - líneas agregadas después de detectar firma
  - `ServiceSignNow.js` - método `downloadSignedDocument()`
  
- **Beneficio**: Ya no necesitas descargar manualmente, todo es automático

---

### 2. **Endpoint de Reintento Manual** 🔁
```http
POST /api/budgets/:idBudget/retry-signed-download
```

- **Qué hace**: Permite reintentar la descarga de un documento firmado que falló
- **Cuándo usar**: 
  - Si el cron falló al descargar
  - Si quieres forzar una re-descarga
  - Para actualizar el PDF firmado en Cloudinary

- **Respuesta**:
```json
{
  "success": true,
  "message": "PDF firmado descargado y guardado correctamente",
  "signedPdfPath": "https://res.cloudinary.com/..."
}
```

- **Beneficio**: Control manual para casos de error

---

### 3. **Listar Todos los Documentos de SignNow** 📋
```http
GET /api/signnow/documents
GET /api/signnow/documents?page=1&per_page=20
```

- **Qué hace**: Lista TODOS los documentos en tu cuenta SignNow, incluyendo:
  - Documentos enviados desde el sistema
  - Documentos subidos manualmente en SignNow
  - Estado de firma de cada uno
  - Metadata (nombre, fecha, firmantes)

- **Respuesta**:
```json
{
  "documents": [
    {
      "id": "abc123",
      "document_name": "Budget_Invoice_1234_Property_Address.pdf",
      "created": "2025-10-17T10:30:00Z",
      "isSigned": true,
      "signers": ["client@email.com"],
      "linkedBudget": 1234  // Si existe en nuestra BD
    }
  ],
  "pagination": { ... }
}
```

- **Beneficio**: Ves todo lo que hay en SignNow, no solo lo del sistema

---

### 4. **Metadata con Invoice# y Dirección** 🏷️
- **Al subir documento**: El nombre del archivo incluye:
  ```
  Budget_Invoice_12345_123_Main_Street.pdf
  Change_Order_CO_001_789_Oak_Ave.pdf
  ```

- **En Cloudinary**: Tags automáticos:
  - `invoice-12345`
  - `property-123-main-street`
  - `budget` o `change-order`
  - `signed`

- **Beneficio**: Fácil identificación y búsqueda visual

---

## 🛠️ Nuevas Funcionalidades

### A. Sincronizar Documento Manual de SignNow
```http
POST /api/budgets/:idBudget/sync-manual-signnow
Body: { "signNowDocumentId": "abc123xyz" }
```

**Caso de uso**: Subiste un PDF firmado manualmente en SignNow y quieres vincularlo al Budget

**Qué hace**:
1. Verifica que el documento existe en SignNow
2. Descarga el PDF firmado
3. Lo sube a Cloudinary
4. Actualiza el Budget con el `signNowDocumentId` y `signedPdfPath`
5. Cambia status a 'signed'

---

### B. Verificar Estado de Documento Específico
```http
GET /api/signnow/document/:documentId/status
```

**Respuesta**:
```json
{
  "documentId": "abc123",
  "isSigned": true,
  "status": "signed",
  "signatures": 1,
  "invites": [
    {
      "email": "client@email.com",
      "status": "signed",
      "signed_at": "2025-10-17T12:00:00Z"
    }
  ]
}
```

---

### C. Re-descargar Todos los Firmados Pendientes
```http
POST /api/signnow/batch-download-signed
```

**Qué hace**: Busca todos los Budgets/COs con status 'signed' pero sin `signedPdfPath` y los descarga

**Beneficio**: Útil para recuperar documentos después de un error masivo

---

## 📝 Campos Nuevos en la Base de Datos

### Budget / ChangeOrder
```javascript
{
  signNowDocumentId: STRING,      // ID del documento en SignNow
  signedPdfPath: STRING,          // URL de Cloudinary del PDF firmado
  signedPdfPublicId: STRING,      // Public ID de Cloudinary para borrar/actualizar
  signedAt: DATE,                 // Fecha/hora cuando se firmó
  signatureStatus: ENUM           // 'pending', 'completed', 'failed'
}
```

---

## 🔐 Variables de Entorno Requeridas

```env
SIGNNOW_API_KEY=tu_api_key_aqui
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

---

## 📊 Flujo Mejorado Completo

### Escenario 1: Documento Enviado desde el Sistema
```
1. Budget/CO creado → PDF generado
2. PDF enviado a SignNow → signNowDocumentId guardado
3. Cliente recibe email → firma documento
4. Cron (cada 2h) detecta firma
5. AUTOMÁTICO: 
   - Descarga PDF de SignNow
   - Sube a Cloudinary con tags
   - Actualiza signedPdfPath
   - Status → 'signed'
6. ✅ Documento firmado guardado permanentemente
```

### Escenario 2: Documento Subido Manualmente en SignNow
```
1. Subes PDF firmado manualmente en SignNow
2. Obtienes el documentId de SignNow
3. Llamas: POST /api/budgets/:id/sync-manual-signnow
   Body: { "signNowDocumentId": "abc123" }
4. Sistema descarga y guarda en Cloudinary
5. ✅ Documento vinculado al Budget
```

### Escenario 3: Error en Descarga
```
1. Cron detectó firma pero falló la descarga
2. Budget queda en status='signed' pero sin signedPdfPath
3. SOLUCIÓN: POST /api/budgets/:id/retry-signed-download
4. ✅ Sistema reintenta descarga y guarda
```

---

## 🎯 Beneficios de las Mejoras

| Antes | Después |
|-------|---------|
| Documentos firmados solo en SignNow | Documentos firmados en Cloudinary (permanente) |
| Sin retry si falla | Endpoint manual de retry |
| Solo docs del sistema | Ver TODOS los docs de SignNow |
| Sin identificación visual | Nombres con invoice# y dirección |
| Gestión manual de errores | Recuperación automática |

---

## 🚀 Próximos Pasos

1. **Implementar**: Ejecutar las migraciones de BD (si necesarias)
2. **Configurar**: Agregar variables de entorno
3. **Probar**: Usar endpoints nuevos con Postman/Thunder
4. **Monitorear**: Ver logs del cron job
5. **Opcional**: Agregar UI en el frontend para retry manual

---

## 📞 Endpoints Resumen

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/signnow/documents` | Lista todos los docs de SignNow |
| GET | `/api/signnow/document/:id/status` | Estado de un documento |
| POST | `/api/budgets/:id/retry-signed-download` | Reintentar descarga |
| POST | `/api/budgets/:id/sync-manual-signnow` | Vincular doc manual |
| POST | `/api/signnow/batch-download-signed` | Descargar todos pendientes |

---

## ✅ Estado: LISTO PARA IMPLEMENTAR

Las mejoras están diseñadas para ser **backward compatible** - no rompen nada existente.
