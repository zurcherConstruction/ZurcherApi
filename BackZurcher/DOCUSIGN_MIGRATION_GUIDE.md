# 🔄 Guía de Migración de SignNow a DocuSign

## 📋 Resumen

Esta guía documenta la migración gradual de SignNow a DocuSign manteniendo compatibilidad con documentos existentes.

## ✅ Estrategia: Soporte Dual (Migración Gradual)

- ✅ **Documentos viejos**: Siguen usando SignNow
- ✅ **Documentos nuevos**: Usan DocuSign
- ✅ **Sin downtime**: Cambio transparente
- ✅ **Rollback fácil**: Variable de entorno

---

## 🔧 Paso 1: Configuración de DocuSign

### 1.1 Crear cuenta y App en DocuSign

1. Ir a https://developers.docusign.com/
2. Crear una cuenta de desarrollador (gratis)
3. Crear una nueva aplicación:
   - Settings → Integrations → Apps and Keys
   - Click "Add App and Integration Key"
   - Nombre: "Zurcher Construction Budget System"

### 1.2 Configurar App

1. **Generate RSA Keypair**:
   - En la app creada, click "Actions" → "Edit"
   - Scroll a "Service Integration"
   - Click "Generate RSA"
   - **Descargar la llave privada** (`docusign_private.key`)
   - Guardarla en `BackZurcher/` (raíz del backend)

2. **Configurar Redirect URI**:
   - Agregar: `https://www.docusign.com`
   - (Solo para el consentimiento inicial)

3. **Anotar credenciales**:
   - Integration Key (Client ID)
   - User ID (API Username - en formato GUID)
   - Account ID

### 1.3 Dar Consentimiento (Una sola vez)

Visita este URL en tu navegador (reemplaza `TU_INTEGRATION_KEY`):

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=TU_INTEGRATION_KEY&redirect_uri=https://www.docusign.com
```

Acepta los permisos. Esto solo se hace una vez.

---

## 🔑 Paso 2: Variables de Entorno

Agrega al archivo `.env`:

```env
# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=tu_integration_key_aqui
DOCUSIGN_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DOCUSIGN_ACCOUNT_ID=tu_account_id_aqui
DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private.key
DOCUSIGN_ENVIRONMENT=demo  # 'demo' para testing, 'production' cuando pases a producción

# 🔥 CONTROL DE MIGRACIÓN: Cambiar a 'true' para usar DocuSign
USE_DOCUSIGN=false  # false = SignNow (actual), true = DocuSign (nuevo)
```

**IMPORTANTE**: La llave privada `docusign_private.key` debe estar en la raíz de `BackZurcher/`

---

## 📦 Paso 3: Instalar Dependencia

```bash
cd BackZurcher
npm install docusign-esign
```

---

## 🗄️ Paso 4: Ejecutar Migración de Base de Datos

```bash
cd BackZurcher
node migrations/add-docusign-support.js
```

Esto hace:
- ✅ Agrega campo `signatureDocumentId` (genérico para SignNow y DocuSign)
- ✅ Agrega valor 'docusign' al ENUM `signatureMethod`
- ✅ Migra datos existentes de `signNowDocumentId` a `signatureDocumentId`
- ✅ Mantiene compatibilidad con presupuestos viejos

---

## 🧪 Paso 5: Probar en Ambiente Demo

### 5.1 Verificar que todo esté configurado

```bash
cd BackZurcher
npm run dev
```

Si no hay errores de DocuSign, está OK.

### 5.2 Probar con un presupuesto de prueba

1. **Mantener SignNow activo** (para no romper nada):
   ```env
   USE_DOCUSIGN=false
   ```

2. **Cambiar a DocuSign**:
   ```env
   USE_DOCUSIGN=true
   ```

3. Reiniciar servidor:
   ```bash
   npm run dev
   ```

4. Crear un presupuesto y enviarlo a firmar
5. Verificar que llegue el email de DocuSign
6. Firmar desde el celular
7. Verificar que el sistema detecte la firma

---

## 🔄 Paso 6: Migración Gradual (Producción)

### Opción A: Probar con algunos clientes

```env
USE_DOCUSIGN=true  # Solo para nuevos presupuestos
```

- Los presupuestos **viejos** siguen en SignNow
- Los presupuestos **nuevos** van a DocuSign
- El cron job revisa ambos servicios

### Opción B: Mantener SignNow hasta que todos firmen

```env
USE_DOCUSIGN=false  # Seguir usando SignNow
```

Esperar a que todos los presupuestos pendientes en SignNow se firmen, luego cambiar a:

```env
USE_DOCUSIGN=true
```

---

## 📊 Monitoreo

### Ver qué servicio usa cada presupuesto:

```sql
SELECT 
  "idBudget",
  "signatureMethod",
  "status",
  CASE 
    WHEN "signatureDocumentId" IS NOT NULL THEN 'Nuevo sistema'
    WHEN "signNowDocumentId" IS NOT NULL THEN 'SignNow legacy'
    ELSE 'Sin firma'
  END as sistema
FROM "Budgets"
WHERE "signatureMethod" IN ('signnow', 'docusign')
ORDER BY "createdAt" DESC;
```

---

## 🎯 Funcionalidades Implementadas

### ServiceDocuSign.js

| Método | Descripción | Equivalente SignNow |
|--------|-------------|---------------------|
| `sendBudgetForSignature()` | Enviar documento para firma | ✅ Mismo |
| `isDocumentSigned()` | Verificar si está firmado | ✅ Mismo |
| `downloadSignedDocument()` | Descargar PDF firmado | ✅ Mismo |
| `getEnvelopeDetails()` | Info detallada del envelope | ✅ Nuevo |
| `voidEnvelope()` | Cancelar envelope | ✅ Nuevo |
| `resendEnvelope()` | Reenviar notificación | ✅ Nuevo |

### BudgetController.js

- ✅ `sendBudgetToSignNow()` ahora soporta ambos servicios según `USE_DOCUSIGN`
- ✅ `checkSignatureStatus()` detecta automáticamente el servicio
- ✅ `downloadSignedBudget()` descarga desde el servicio correcto

### checkPendingSignatures.js (Cron Job)

- ✅ Verifica presupuestos en **SignNow Y DocuSign**
- ✅ Descarga PDFs firmados de ambos servicios
- ✅ Actualiza el estado correctamente

---

## 🚀 Rollback (Si algo sale mal)

Si hay problemas con DocuSign:

```env
USE_DOCUSIGN=false
```

Reiniciar servidor. Todo vuelve a SignNow inmediatamente.

---

## 🧹 Paso 7: Limpieza (Futuro)

Cuando **TODOS** los presupuestos estén en DocuSign:

1. Eliminar `ServiceSignNow.js`
2. Eliminar código legacy de SignNow en controllers
3. Eliminar variable `USE_DOCUSIGN` (dejar DocuSign por defecto)
4. Eliminar columna `signNowDocumentId` (opcional)

---

## 📱 Ventajas de DocuSign

| Característica | SignNow | DocuSign |
|---------------|---------|----------|
| **UX Móvil** | ⭐⭐⭐ Buena | ⭐⭐⭐⭐⭐ Excelente |
| **Confianza Cliente** | Media | Alta (líder del mercado) |
| **API Documentación** | Regular | Excelente |
| **Recordatorios Automáticos** | Básico | Avanzado |
| **Múltiples Firmantes** | Sí | Sí (más fácil) |
| **Tracking Detallado** | Básico | Avanzado |
| **Precio** | $8-15/mes | $25-40/mes |

---

## ❓ FAQ

### ¿Qué pasa con los presupuestos ya enviados con SignNow?

Siguen funcionando normalmente. El cron job los sigue revisando.

### ¿Puedo tener presupuestos en SignNow y DocuSign al mismo tiempo?

Sí, es el propósito de la migración gradual.

### ¿Cómo sé qué servicio usó cada presupuesto?

Por el campo `signatureMethod`:
- `'signnow'` = SignNow
- `'docusign'` = DocuSign
- `'manual'` = Subido manualmente
- `'legacy'` = Trabajo importado

### ¿Puedo cancelar un envelope en DocuSign?

Sí, usa el método `voidEnvelope(envelopeId, reason)`.

### ¿Hay webhooks de DocuSign?

Sí, pero aún no implementados. El cron job funciona perfectamente.

---

## 📞 Soporte

Si hay problemas:
1. Verificar logs del servidor
2. Verificar credenciales en `.env`
3. Verificar que la llave privada esté en el lugar correcto
4. Verificar que se haya dado consentimiento
5. Revisar que `USE_DOCUSIGN` esté en `true` o `false` (no vacío)

---

## ✅ Checklist de Deploy

- [ ] Credenciales de DocuSign obtenidas
- [ ] Llave privada descargada y guardada en `BackZurcher/docusign_private.key`
- [ ] Consentimiento dado (URL visitada y aceptada)
- [ ] Variables de entorno agregadas al `.env`
- [ ] Dependencia instalada (`npm install docusign-esign`)
- [ ] Migración de BD ejecutada (`node migrations/add-docusign-support.js`)
- [ ] Servidor reiniciado
- [ ] Presupuesto de prueba enviado y firmado exitosamente
- [ ] Cron job verificando ambos servicios
- [ ] `USE_DOCUSIGN=true` en producción cuando estés listo

---

**Fecha de creación**: Nov 1, 2025
**Versión**: 1.0
**Autor**: AI Assistant + Yani
