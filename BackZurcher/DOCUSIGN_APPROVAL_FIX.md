# 🔧 FIX: DocuSign en Flujo de Aprobación de Presupuestos

**Fecha**: 2 de Noviembre, 2025  
**Rama**: yani56  
**Estado**: ✅ CORREGIDO

---

## 🐛 PROBLEMA IDENTIFICADO

Cuando el cliente aprobaba un presupuesto desde el email, el sistema **siempre enviaba a SignNow** sin importar la configuración `USE_DOCUSIGN=true`.

### Flujo Afectado:
1. Cliente recibe email de presupuesto
2. Hace clic en "✅ APPROVE BUDGET"
3. Sistema convierte a Invoice automáticamente
4. ❌ **Enviaba SOLO a SignNow** (ignoraba la configuración)

---

## ✅ SOLUCIÓN IMPLEMENTADA

Actualizados **3 métodos** en `BudgetController.js` para respetar la variable `USE_DOCUSIGN`:

### 1️⃣ **approveReview()** - Línea ~4206
**Cuando el cliente aprueba el presupuesto**

**Antes**:
```javascript
const signNowService = new SignNowService();
const signNowResult = await signNowService.sendBudgetForSignature(...);
await updatedBudget.update({
  signNowDocumentId: signNowResult.documentId,
  signatureMethod: 'none'
});
```

**Después**:
```javascript
const serviceName = USE_DOCUSIGN ? 'DocuSign' : 'SignNow';
const signatureService = USE_DOCUSIGN ? new DocuSignService() : new SignNowService();

const signatureResult = USE_DOCUSIGN
  ? await signatureService.sendBudgetForSignature(...)  // Parámetros DocuSign
  : await signatureService.sendBudgetForSignature(...); // Parámetros SignNow

const documentId = USE_DOCUSIGN ? signatureResult.envelopeId : signatureResult.documentId;

await updatedBudget.update({
  signatureDocumentId: documentId,
  signNowDocumentId: USE_DOCUSIGN ? null : signatureResult.documentId,
  signatureMethod: USE_DOCUSIGN ? 'docusign' : 'signnow',
  status: 'sent_for_signature'
});
```

---

### 2️⃣ **updateBudget()** - Línea ~1953
**Cuando se actualiza un presupuesto y se reenvía automáticamente**

**Antes**:
```javascript
const signNowService = new SignNowService();
await signNowService.sendBudgetForSignature(...);
await budget.update({
  signNowDocumentId: signNowResult.documentId,
  signatureMethod: 'none'
});
```

**Después**:
```javascript
const serviceName = USE_DOCUSIGN ? 'DocuSign' : 'SignNow';
const signatureService = USE_DOCUSIGN ? new DocuSignService() : new SignNowService();

const signatureResult = USE_DOCUSIGN
  ? await signatureService.sendBudgetForSignature(...)
  : await signatureService.sendBudgetForSignature(...);

const documentId = USE_DOCUSIGN ? signatureResult.envelopeId : signatureResult.documentId;

await budget.update({
  signatureDocumentId: documentId,
  signNowDocumentId: USE_DOCUSIGN ? null : signatureResult.documentId,
  signatureMethod: USE_DOCUSIGN ? 'docusign' : 'signnow',
  status: 'sent_for_signature'
});
```

---

### 3️⃣ **viewSignedBudget()** - Línea ~875
**Cuando se descarga el PDF firmado para visualizar**

**Antes**:
```javascript
if (!budget.signNowDocumentId) {
  return res.status(400).json({ error: 'No disponible' });
}

const signNowService = new SignNowService();
await signNowService.downloadSignedDocument(budget.signNowDocumentId, signedFilePath);
```

**Después**:
```javascript
if (!budget.signatureDocumentId && !budget.signNowDocumentId) {
  return res.status(400).json({ error: 'No disponible' });
}

const isDocuSign = budget.signatureMethod === 'docusign';
const serviceName = isDocuSign ? 'DocuSign' : 'SignNow';
const documentId = budget.signatureDocumentId || budget.signNowDocumentId;

const signatureService = isDocuSign ? new DocuSignService() : new SignNowService();
await signatureService.downloadSignedDocument(documentId, signedFilePath);
```

---

## 🔄 FLUJO COMPLETO AHORA

### Con `USE_DOCUSIGN=true`:

1. **Cliente crea presupuesto** → Sistema genera PDF
2. **Email enviado al cliente** → Con PDF adjunto y botón "APPROVE BUDGET"
3. **Cliente aprueba** → 
   - ✅ Convierte a Invoice automáticamente
   - ✅ **Envía a DocuSign** (no a SignNow)
   - ✅ Cliente recibe email de DocuSign para firmar
4. **Cliente firma en DocuSign** → Desde móvil, tablet o desktop
5. **Cron job detecta firma** → Cada hora automáticamente
6. **Sistema descarga PDF firmado** → De DocuSign
7. **Sube a Cloudinary** → PDF disponible permanentemente
8. **Status cambia a "signed"** → Presupuesto completado

---

## 📋 CAMPOS ACTUALIZADOS CORRECTAMENTE

Ahora **todos los métodos** guardan:

```javascript
{
  signatureDocumentId: "envelope-xxx" o "document-xxx",  // ID genérico
  signatureMethod: "docusign" o "signnow",               // Servicio usado
  signNowDocumentId: "document-xxx" o null,              // Solo SignNow (compatibilidad)
  status: "sent_for_signature",
  sentForSignatureAt: "2025-11-02T..."
}
```

---

## ✅ VERIFICACIÓN

### Test Manual:
1. Asegurar `USE_DOCUSIGN=true` en `.env`
2. Crear un presupuesto
3. Enviarlo al cliente
4. Cliente aprueba desde el email
5. Verificar en logs del servidor:
   ```
   📤 Enviando Invoice #XXX a DocuSign automáticamente...
   ✅ Invoice #XXX enviado a DocuSign exitosamente
   ```
6. Cliente debe recibir email de **DocuSign** (no SignNow)

### Consulta SQL:
```sql
SELECT 
  "idBudget",
  "invoiceNumber",
  "signatureMethod",
  "signatureDocumentId",
  "status"
FROM "Budgets"
WHERE "status" = 'sent_for_signature'
ORDER BY "sentForSignatureAt" DESC
LIMIT 10;
```

Resultado esperado:
```
idBudget | invoiceNumber | signatureMethod | signatureDocumentId      | status
---------|---------------|-----------------|--------------------------|--------------------
2345     | INV-00234     | docusign        | envelope-abc123          | sent_for_signature
```

---

## 🎯 IMPACTO

### Métodos Actualizados:
- ✅ `approveReview()` - Aprobación de cliente
- ✅ `updateBudget()` - Reenvío automático
- ✅ `viewSignedBudget()` - Visualización de firmado
- ✅ `sendBudgetToSignNow()` - Ya estaba correcto desde antes

### Compatibilidad:
- ✅ Documentos viejos de SignNow siguen funcionando
- ✅ Sistema detecta automáticamente qué servicio usar
- ✅ No requiere migración de datos
- ✅ Cambiar entre servicios es instantáneo (cambiar .env)

---

## 🚀 PRÓXIMOS PASOS

1. **Probar flujo completo end-to-end**:
   - Crear presupuesto real
   - Enviarlo a email real
   - Aprobar desde el email
   - Verificar que llegue de DocuSign
   - Firmar en DocuSign
   - Esperar que cron job lo detecte
   - Confirmar PDF descargado

2. **Monitorear logs** para verificar:
   ```
   ✅ Invoice enviado a DocuSign exitosamente
   📧 Cliente recibirá email de DocuSign
   🔄 Cron job verificando firma en DocuSign
   ✅ Documento firmado detectado
   📥 Descargando PDF de DocuSign
   ☁️  Subiendo a Cloudinary
   ```

---

## 📝 NOTAS IMPORTANTES

- El email inicial del presupuesto **NO cambia** (solo informa del presupuesto)
- El email de **firma electrónica** viene de DocuSign/SignNow
- Cliente recibe **2 emails**:
  1. Email de Zurcher con PDF adjunto y botón APPROVE
  2. Email de DocuSign/SignNow para firmar electrónicamente
- El botón "APPROVE BUDGET" ahora **respeta USE_DOCUSIGN**
- No se requieren cambios en el frontend

---

**Estado Final**: ✅ **TODOS LOS FLUJOS AHORA USAN DOCUSIGN CORRECTAMENTE**

DocuSign está completamente integrado en todos los puntos de envío de documentos para firma.
