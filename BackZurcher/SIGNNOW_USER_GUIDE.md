# 🚀 SignNow - Guía de Uso de Nuevas Funcionalidades

## ✅ Mejoras Implementadas

### 1. **Descarga Automática a Cloudinary** ✨
El cron job ahora descarga automáticamente los PDFs firmados a Cloudinary.

**Cómo funciona:**
- Cada 2 horas, el cron verifica documentos firmados
- Si detecta uno firmado, automáticamente:
  1. Descarga el PDF de SignNow
  2. Lo sube a Cloudinary con tags (invoice#, dirección)
  3. Actualiza `signedPdfPath` y `signedPdfPublicId` en la BD
  4. Borra el archivo temporal

**Sin configuración adicional** - ¡Ya funciona!

---

### 2. **Reintentar Descarga Manual** 🔁

**Endpoint:**
```http
POST /api/budgets/:idBudget/retry-signed-download
Authorization: Bearer <token>
```

**Cuándo usar:**
- El cron falló al descargar
- Quieres forzar una re-descarga
- Budget tiene `status='signed'` pero `signedPdfPath=null`

**Ejemplo con Thunder Client/Postman:**
```
POST https://tu-api.com/api/budgets/123/retry-signed-download
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "PDF firmado descargado y guardado correctamente",
  "signedPdfPath": "https://res.cloudinary.com/.../.../budget_123_signed.pdf"
}
```

---

### 3. **Listar Todos los Documentos de SignNow** 📋

**Endpoint:**
```http
GET /api/signnow/documents?page=0&per_page=50
Authorization: Bearer <token>
```

**Qué muestra:**
- TODOS los documentos de tu cuenta SignNow
- Documentos enviados desde el sistema
- Documentos subidos manualmente
- Si están vinculados a Budgets/COs

**Ejemplo:**
```
GET https://tu-api.com/api/signnow/documents
```

**Respuesta:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "abc123xyz",
      "document_name": "Budget_Invoice_1234.pdf",
      "created": "2025-10-17T10:30:00Z",
      "page_count": 5,
      "linkedBudget": {
        "idBudget": 1234,
        "propertyAddress": "123 Main Street",
        "applicantName": "John Doe",
        "status": "signed"
      },
      "linkedChangeOrder": null
    },
    {
      "id": "xyz789abc",
      "document_name": "Manual_Upload_Contract.pdf",
      "created": "2025-10-16T14:20:00Z",
      "page_count": 3,
      "linkedBudget": null,  // ← Subido manualmente, no vinculado
      "linkedChangeOrder": null
    }
  ],
  "pagination": {
    "page": 0,
    "perPage": 50,
    "total": 2
  }
}
```

---

### 4. **Verificar Estado de Documento** 🔍

**Endpoint:**
```http
GET /api/signnow/document/:documentId/status
Authorization: Bearer <token>
```

**Para qué:**
- Ver si un documento específico está firmado
- Revisar quién firmó y cuándo
- Depurar problemas

**Ejemplo:**
```
GET https://tu-api.com/api/signnow/document/abc123xyz/status
```

**Respuesta:**
```json
{
  "success": true,
  "documentId": "abc123xyz",
  "isSigned": true,
  "status": "signed",
  "signatures": [
    {
      "id": "sig001",
      "user_id": "user123",
      "email": "client@email.com",
      "created": "2025-10-17T12:00:00Z"
    }
  ],
  "invites": [
    {
      "id": "invite001",
      "email": "client@email.com",
      "status": "fulfilled",
      "signature_id": "sig001"
    }
  ]
}
```

---

### 5. **Sincronizar Documento Manual** 🔗

**Endpoint:**
```http
POST /api/budgets/:idBudget/sync-manual-signnow
Authorization: Bearer <token>
Body: { "signNowDocumentId": "abc123xyz" }
```

**Caso de uso:**
1. Subiste un PDF firmado **manualmente** en SignNow
2. Quieres vincularlo a un Budget existente
3. El sistema lo descarga y guarda en Cloudinary

**Pasos:**
1. Sube el PDF firmado en SignNow (web/app)
2. Copia el `documentId` de SignNow
3. Llama al endpoint con ese ID

**Ejemplo:**
```
POST https://tu-api.com/api/budgets/1234/sync-manual-signnow

Body:
{
  "signNowDocumentId": "xyz789abc"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Documento de SignNow sincronizado correctamente",
  "budget": {
    "idBudget": 1234,
    "status": "signed",
    "signNowDocumentId": "xyz789abc",
    "signedPdfPath": "https://res.cloudinary.com/.../budget_1234_signed.pdf"
  }
}
```

---

### 6. **Descarga en Batch** 📥

**Endpoint:**
```http
POST /api/signnow/batch-download-signed
Authorization: Bearer <token>
```

**Para qué:**
- Recuperar todos los Budgets/COs firmados que no tienen PDF en Cloudinary
- Útil después de errores masivos
- Sincronización inicial

**Ejemplo:**
```
POST https://tu-api.com/api/signnow/batch-download-signed
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Descarga en batch completada",
  "results": {
    "budgets": {
      "success": [1234, 1235, 1236],
      "failed": [
        {
          "id": 1237,
          "error": "Document not found in SignNow"
        }
      ]
    },
    "changeOrders": {
      "success": [5, 6],
      "failed": []
    }
  }
}
```

---

## 🗂️ Nuevos Campos en la Base de Datos

### Budget / ChangeOrder

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `signedPdfPath` | STRING | URL de Cloudinary del PDF firmado |
| `signedPdfPublicId` | STRING | Public ID para gestión en Cloudinary |
| `signedAt` | DATE | Fecha/hora cuando se firmó |
| `signNowDocumentId` | STRING | ID del documento en SignNow |

**Migración:**
```bash
cd BackZurcher
node run-maintenance-migrations.js
```

O manualmente:
```sql
ALTER TABLE Budgets ADD COLUMN signedPdfPublicId VARCHAR(200) AFTER signedPdfPath;
ALTER TABLE ChangeOrders ADD COLUMN signedPdfPublicId VARCHAR(200) AFTER signedPdfPath;
```

---

## 📊 Flujos de Uso

### Flujo 1: Documento Firmado Automáticamente
```
1. Budget/CO enviado a SignNow
   ↓
2. Cliente firma
   ↓
3. Cron (cada 2h) detecta firma
   ↓
4. Descarga automática a Cloudinary
   ↓
5. ✅ signedPdfPath actualizado
```

### Flujo 2: Documento Subido Manualmente
```
1. Subir PDF firmado en SignNow (web)
   ↓
2. Copiar documentId de SignNow
   ↓
3. POST /budgets/:id/sync-manual-signnow
   ↓
4. Sistema descarga y vincula
   ↓
5. ✅ Budget actualizado con PDF
```

### Flujo 3: Error en Descarga
```
1. Cron falló (Budget signed, sin PDF)
   ↓
2. Detectar error en logs
   ↓
3. POST /budgets/:id/retry-signed-download
   ↓
4. ✅ PDF descargado correctamente
```

### Flujo 4: Recuperación Masiva
```
1. Detectar múltiples Budgets sin PDF
   ↓
2. POST /signnow/batch-download-signed
   ↓
3. Sistema procesa todos
   ↓
4. ✅ Ver reporte de éxitos/fallos
```

---

## 🏷️ Tags de Cloudinary

Los PDFs firmados se suben con estos tags automáticos:

```javascript
tags: [
  "invoice-1234",              // Número de invoice
  "property-123-main-street",  // Dirección formateada
  "budget",                    // O "change-order"
  "signed"                     // Estado
]
```

**Búsqueda en Cloudinary:**
- Por invoice: `invoice-1234`
- Por propiedad: `property-oak-ave`
- Todos los firmados: `signed`

---

## 🔧 Troubleshooting

### Problema: "Budget no tiene signNowDocumentId"
**Solución:** El Budget nunca fue enviado a SignNow. Envíalo primero:
```
POST /api/budgets/:id/send-to-signnow
```

### Problema: "Documento no está firmado"
**Solución:** Verifica el estado real en SignNow:
```
GET /api/signnow/document/:documentId/status
```

### Problema: Cron no descarga automáticamente
**Solución:**
1. Verifica logs del servidor
2. Revisa que el cron esté corriendo
3. Usa retry manual: `POST /budgets/:id/retry-signed-download`

### Problema: "Error descargando de SignNow"
**Posibles causas:**
- API Key expirada/inválida
- Documento borrado en SignNow
- Límite de rate en API de SignNow

**Solución:** Verifica conexión:
```
GET /api/signnow/test-connection
```

---

## 📝 Logs del Cron Job

El cron job deja logs detallados:

```
⏰ [CRON JOB] Iniciando la verificación de firmas pendientes - 2025-10-17T14:00:00Z
[CRON JOB] Se encontraron 3 presupuestos pendientes para verificar.
✅ ¡Presupuesto FIRMADO! ID: 1234.
   -> PDF descargado temporalmente: /temp/budget_1234_signed_xxx.pdf
   -> PDF subido a Cloudinary: https://res.cloudinary.com/.../budget_1234_signed.pdf
   -> Archivo temporal eliminado
   -> Estado del presupuesto 1234 actualizado a 'signed'.
🏁 [CRON JOB] Tarea de verificación de firmas finalizada.
```

---

## ✅ Checklist de Implementación

- [x] ✅ Actualizar `ServiceSignNow.js` con nuevos métodos
- [x] ✅ Actualizar `checkPendingSignatures.js` con descarga a Cloudinary
- [x] ✅ Crear migración para `signedPdfPublicId`
- [x] ✅ Actualizar modelo `Budget.js`
- [x] ✅ Crear endpoints en `signNowController.js`
- [x] ✅ Agregar rutas en `signNowRoutes.js` y `BudgetRoutes.js`
- [ ] ⏳ Ejecutar migración en producción
- [ ] ⏳ Probar endpoints con Postman/Thunder
- [ ] ⏳ Verificar que cron descarga automáticamente
- [ ] ⏳ Documentar en README principal

---

## 🎯 Próximos Pasos

1. **Ejecutar migración:**
   ```bash
   cd BackZurcher
   node run-maintenance-migrations.js
   ```

2. **Probar endpoints:**
   - Listar documentos: `GET /api/signnow/documents`
   - Ver estado: `GET /api/signnow/document/:id/status`
   - Retry: `POST /api/budgets/:id/retry-signed-download`

3. **Monitorear logs del cron:**
   - Ver que descarga automáticamente
   - Verificar URLs en Cloudinary

4. **Sincronizar documentos manuales:**
   - Si tienes PDFs en SignNow sin vincular
   - Usar `sync-manual-signnow`

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa logs del servidor
2. Verifica variables de entorno (SIGNNOW_API_KEY, CLOUDINARY_*)
3. Prueba conexión: `GET /api/signnow/test-connection`
4. Usa batch download para recuperación masiva

---

**¡Todo listo! 🎉** El sistema ahora gestiona automáticamente los PDFs firmados.
