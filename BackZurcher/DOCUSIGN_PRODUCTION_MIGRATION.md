# 🚀 GUÍA DE MIGRACIÓN DOCUSIGN A PRODUCCIÓN

**Fecha de creación**: 3 de Noviembre, 2025  
**Rama actual**: yani56  
**Estado**: ✅ Listo para producción

---

## 📋 RESUMEN DE CAMBIOS EN LA RAMA

### Archivos Backend Modificados:
1. **ServiceDocuSign.js** - Servicio completo de DocuSign con JWT
2. **BudgetController.js** - Integración dual DocuSign/SignNow
3. **checkPendingSignatures.js** - Cron job con soporte DocuSign
4. **Budget.js** (modelo) - Campos `signatureDocumentId` y `signatureMethod`

### Archivos Frontend Modificados:
1. **GestionBudgets.jsx** - Filtros y badges para DocuSign
2. **budgetActions.jsx** - Parámetro `signatureMethod` en fetchBudgets
3. **App.jsx** - Eliminada importación de SignatureComplete

### Archivos de Configuración:
- `.env` - Variables de DocuSign añadidas
- `docusign_private.key` - Clave privada RSA

### Scripts de Prueba Creados:
- `test-docusign-anchor.js` - Prueba de anchor text
- `check-signature-status.js` - Verificar estado de firma
- `download-signed-pdf.js` - Descargar PDF firmado
- `get-docusign-signing-url.js` - Obtener URL de firma
- `resend-docusign-email.js` - Reenviar email

### Documentación Creada:
- `DOCUSIGN_APPROVAL_FIX.md`
- `DOCUSIGN_EMAIL_FIX.md`
- `DOCUSIGN_INTEGRATION_VERIFICATION.md`

---

## ✅ CHECKLIST PRE-MIGRACIÓN

Antes de hacer merge a main, verificar:

- [x] Todos los cambios commiteados en rama yani56
- [ ] Probar flujo completo en desarrollo:
  - [ ] Crear presupuesto
  - [ ] Aprobar presupuesto
  - [ ] Recibir email con botón de firma
  - [ ] Firmar en DocuSign
  - [ ] Verificar redirección a landing
  - [ ] Confirmar que cron job detecta firma
  - [ ] Verificar PDF descargado en Cloudinary
- [ ] Confirmar que filtros funcionan en frontend
- [ ] Confirmar que estadísticas se muestran correctamente
- [ ] Verificar que SignNow sigue funcionando (cambiar USE_DOCUSIGN=false)

---

## 🔄 PROCESO DE MIGRACIÓN A PRODUCCIÓN

### PASO 1: Merge a Main
```bash
# Asegurarte de estar en yani56
git checkout yani56

# Verificar que todo está commiteado
git status

# Hacer merge a main
git checkout main
git pull origin main
git merge yani56

# Resolver conflictos si los hay
# (revisar cada conflicto manualmente)

# Hacer push a main
git push origin main
```

### PASO 2: Migración de Base de Datos (SI ES NECESARIO)

**⚠️ IMPORTANTE**: Los campos ya existen en producción si ejecutaste migraciones previas.

Verificar en producción:
```sql
-- Conectar a base de datos de producción
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Budgets' 
  AND column_name IN ('signatureDocumentId', 'signatureMethod');
```

Si NO existen, ejecutar:
```sql
-- Agregar columna genérica para ID de documento
ALTER TABLE "Budgets" 
ADD COLUMN "signatureDocumentId" VARCHAR(255) UNIQUE;

-- Agregar índice para búsquedas rápidas
CREATE INDEX idx_budgets_signature_document_id 
ON "Budgets"("signatureDocumentId");

-- La columna signatureMethod ya debería existir
-- Si no existe:
ALTER TABLE "Budgets" 
ADD COLUMN "signatureMethod" VARCHAR(50) 
CHECK ("signatureMethod" IN ('signnow', 'docusign', 'manual', 'legacy', 'none'));
```

### PASO 3: Configurar Cuenta de Producción en DocuSign

#### 3.1. Crear Cuenta de Producción
1. Ir a https://www.docusign.com (sin `-d`)
2. Crear cuenta de producción o usar cuenta existente
3. Verificar plan activo (Developer, Business, etc.)

#### 3.2. Crear Integration Key de Producción
1. Ir a https://admindemo.docusign.com → Settings → Integrations → Apps and Keys
2. Click en "Add App and Integration Key"
3. Nombre: "Zurcher Construction - Production"
4. Click en "Add RSA Keypair"
5. **GUARDAR EL PRIVATE KEY** - Solo se muestra una vez!
6. Copiar el Integration Key

#### 3.3. Obtener Account ID de Producción
1. Desde el dashboard de DocuSign
2. Settings → API and Keys
3. Copiar "API Account ID" (NO confundir con User ID)

#### 3.4. Obtener User ID
1. Settings → API and Keys
2. Copiar "API Username" o "User ID"

### PASO 4: Actualizar Variables de Entorno en Producción

En Railway (o donde esté tu backend):

```env
# DocuSign Production Configuration
DOCUSIGN_INTEGRATION_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DOCUSIGN_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DOCUSIGN_ACCOUNT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DOCUSIGN_ENVIRONMENT=production
USE_DOCUSIGN=true

# Frontend URL para redirección post-firma
FRONTEND_URL=https://zurcher-construction.vercel.app
```

### PASO 5: Subir Private Key a Producción

**Opción A: Variable de entorno (Recomendado)**
```env
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
(toda la clave en una línea, con \n para saltos de línea)
-----END RSA PRIVATE KEY-----"
```

Modificar `ServiceDocuSign.js`:
```javascript
constructor() {
  // ...
  this.privateKey = process.env.DOCUSIGN_PRIVATE_KEY 
    ? process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : fs.readFileSync(this.privateKeyPath, 'utf8');
}
```

**Opción B: Archivo en servidor (menos seguro)**
1. Subir `docusign_private.key` al servidor
2. Configurar `DOCUSIGN_PRIVATE_KEY_PATH=/ruta/absoluta/docusign_private.key`

### PASO 6: Dar Consentimiento en Producción

**⚠️ CRÍTICO**: Esto solo se hace UNA VEZ por cuenta.

1. Generar URL de consentimiento:
```javascript
const consentUrl = `https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${DOCUSIGN_INTEGRATION_KEY}&redirect_uri=https://www.docusign.com`;
```

2. Abrir URL en navegador
3. Iniciar sesión con cuenta de DocuSign Production
4. Hacer clic en "Allow Access"
5. Esperar redirección (puede ser a página de error, eso es normal)
6. El consentimiento queda guardado permanentemente

### PASO 7: Probar en Producción

#### Test 1: Verificar Autenticación
```bash
# En servidor de producción
cd BackZurcher
node test-docusign.js
```

Resultado esperado:
```
✅ ¡TOKEN OBTENIDO EXITOSAMENTE!
🎉 ¡DOCUSIGN ESTÁ CORRECTAMENTE CONFIGURADO!
```

#### Test 2: Enviar Documento Real
1. Crear presupuesto en producción
2. Aprobar presupuesto
3. Verificar:
   - ✅ Email llega (SIN marca de agua "DEMONSTRATION DOCUMENT ONLY")
   - ✅ Botón "Sign Document Now" funciona
   - ✅ Firma se aplica correctamente
   - ✅ Redirección a landing funciona
   - ✅ Cron job detecta firma
   - ✅ PDF se descarga a Cloudinary

---

## 🛡️ SEGURIDAD Y MEJORES PRÁCTICAS

### Proteger Private Key
```bash
# NUNCA commitear la private key
echo "docusign_private.key" >> .gitignore

# Si se commiteó por error, regenerar INMEDIATAMENTE
# 1. Ir a DocuSign → Settings → Apps and Keys
# 2. Borrar keypair existente
# 3. Generar nuevo keypair
# 4. Actualizar .env y servidor
```

### Variables de Entorno Sensibles
```env
# ✅ BIEN - Usar en producción
DOCUSIGN_INTEGRATION_KEY=${SECRET_FROM_RAILWAY}

# ❌ MAL - No hardcodear en código
const integrationKey = "79d27412-c799-442a-b358-3f4bc97f1eb5";
```

### Rotación de Credenciales
Cada 6-12 meses:
1. Generar nuevo RSA keypair en DocuSign
2. Actualizar DOCUSIGN_PRIVATE_KEY en servidor
3. Dar consentimiento con nuevo keypair (si es necesario)
4. Eliminar keypair antiguo después de confirmar que funciona

---

## 🔧 CONFIGURACIÓN DE WEBHOOKS (OPCIONAL)

Para recibir notificaciones en tiempo real cuando se firma:

### 1. Crear Endpoint en Backend
```javascript
// BackZurcher/src/routes/docusignRoutes.js
router.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'envelope-completed') {
    const envelopeId = data.envelopeId;
    
    // Buscar budget con este envelopeId
    const budget = await Budget.findOne({
      where: { signatureDocumentId: envelopeId }
    });
    
    if (budget) {
      // Procesar inmediatamente (sin esperar cron job)
      await processSignedBudget(budget);
    }
  }
  
  res.status(200).send('OK');
});
```

### 2. Configurar Webhook en DocuSign
1. Ir a https://admindemo.docusign.com → Settings → Connect
2. Click "Add Configuration"
3. URL: `https://tu-backend.railway.app/docusign/webhook`
4. Events: "Envelope Completed"
5. Include Document Fields: Yes

**Beneficio**: No esperar 1 hora del cron job, procesamiento inmediato.

---

## 📊 MONITOREO POST-MIGRACIÓN

### Logs a Vigilar
```bash
# En servidor de producción
tail -f logs/app.log | grep DocuSign

# Buscar:
✅ Invoice #XXX enviado a DocuSign exitosamente
✅ URL de firma generada exitosamente
✅ Documento firmado detectado
✅ PDF firmado descargado
☁️  PDF subido a Cloudinary
```

### Métricas Clave
```sql
-- Presupuestos por método de firma
SELECT 
  "signatureMethod",
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'signed' THEN 1 END) as firmados
FROM "Budgets"
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY "signatureMethod";
```

Resultado esperado:
```
signatureMethod | total | firmados
----------------|-------|----------
docusign        |   45  |    42
signnow         |   12  |    11
manual          |    3  |     3
```

### Alertas Recomendadas
```javascript
// Crear alerta si token JWT expira frecuentemente
if (error.message.includes('token expired')) {
  // Enviar email a admin
  await sendEmail({
    to: 'admin@zurcher.com',
    subject: '⚠️ DocuSign Token Expiring Frequently',
    text: 'Revisar configuración de JWT'
  });
}
```

---

## 🔄 ROLLBACK (Si algo sale mal)

### Plan de Contingencia

#### Opción 1: Volver a SignNow Temporalmente
```env
# En Railway, cambiar una variable
USE_DOCUSIGN=false
```

**Resultado**: Sistema vuelve a usar SignNow inmediatamente.

#### Opción 2: Revertir Merge
```bash
# Si el merge causó problemas críticos
git checkout main
git revert HEAD~1  # Revertir último commit (el merge)
git push origin main

# Redeploy automático
```

#### Opción 3: Usar Versión Anterior
```bash
# En Railway
railway rollback

# O manualmente
git checkout <commit-hash-anterior>
git push origin main --force
```

---

## 📝 CHECKLIST POST-MIGRACIÓN

Después de migrar a producción:

- [ ] Verificar que emails de DocuSign llegan sin marca de agua
- [ ] Confirmar que redirección post-firma funciona
- [ ] Probar filtro de DocuSign en frontend
- [ ] Verificar estadísticas en GestionBudgets
- [ ] Confirmar que cron job detecta firmas de DocuSign
- [ ] Revisar logs por errores
- [ ] Monitorear primeras 10 firmas de producción
- [ ] Documentar cualquier issue en Slack/email
- [ ] Notificar al equipo que DocuSign está en producción
- [ ] Programar revisión de webhooks (si se configuraron)
- [ ] Actualizar documentación de usuario si es necesario

---

## 💰 COSTOS Y PLANES DE DOCUSIGN

### Planes Disponibles:
- **Developer (Demo)**: Gratis, solo para testing
- **Personal**: ~$10-15/mes, 1 usuario, 5 documentos/mes
- **Standard**: ~$25/mes, 1 usuario, documentos ilimitados
- **Business Pro**: ~$40/mes, múltiples usuarios, API completo

### Recomendación para Zurcher:
- **Business Pro** - Por integración API completa
- **O negociar plan Enterprise** si volumen es alto

### Funciones Incluidas en Producción:
- ✅ Sin marca de agua
- ✅ Documentos permanentes (no se borran)
- ✅ Emails ilimitados
- ✅ Branding personalizado
- ✅ Soporte técnico
- ✅ SLA garantizado
- ✅ Webhooks
- ✅ Reportes avanzados

---

## 🆘 TROUBLESHOOTING COMÚN

### Error: "consent_required"
**Solución**: Dar consentimiento usando la URL generada (Paso 6).

### Error: "account_not_found"
**Solución**: Verificar que `DOCUSIGN_ACCOUNT_ID` es el "API Account ID" correcto.

### Error: "invalid_grant"
**Solución**: 
1. Regenerar keypair en DocuSign
2. Dar consentimiento nuevamente
3. Actualizar private key en servidor

### Emails no llegan en producción
**Solución**:
1. Verificar que email del cliente está correcto
2. Revisar carpeta de spam
3. Confirmar que cuenta de DocuSign está activa
4. Verificar que no hay restricciones de dominio

### Firma no se detecta automáticamente
**Solución**:
1. Esperar hasta 1 hora (frecuencia del cron)
2. Ejecutar manualmente: `node src/services/checkPendingSignatures.js`
3. Verificar logs del cron job
4. Considerar implementar webhooks

---

## 📞 CONTACTOS DE SOPORTE

**DocuSign Support**:
- Email: support@docusign.com
- Phone: 1-877-720-2040
- Developer Support: https://developers.docusign.com/support

**Documentación**:
- API Reference: https://developers.docusign.com/docs/esign-rest-api/
- JWT Guide: https://developers.docusign.com/platform/auth/jwt/
- Webhooks: https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/webhooks/

---

## ✅ CONFIRMACIÓN FINAL

Antes de considerar la migración completa:

```bash
# Test completo end-to-end en producción
1. Crear presupuesto real
2. Enviarlo a cliente real  
3. Cliente firma documento
4. Sistema procesa firma automáticamente
5. PDF firmado disponible en Cloudinary
6. Notificaciones enviadas correctamente
```

**Si todo funciona**: ✅ **MIGRACIÓN EXITOSA**

---

**Creado por**: GitHub Copilot  
**Para**: Zurcher Construction  
**Fecha**: 3 de Noviembre, 2025  
**Versión**: 1.0
