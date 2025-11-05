# 🔑 Resumen Rápido: Clave Privada de DocuSign

## ❓ ¿Por qué no se sube `docusign_private.key`?

La clave privada es como la **contraseña maestra** de tu integración con DocuSign. Si alguien la obtiene, puede:
- ❌ Enviar documentos en tu nombre
- ❌ Acceder a tu cuenta de DocuSign
- ❌ Ver documentos firmados
- ❌ Hacer cargos/operaciones no autorizadas

Por eso **NUNCA** se sube a Git (está en `.gitignore`).

---

## 🏠 LOCAL (Desarrollo)

```
BackZurcher/
  └── docusign_private.key  ← Archivo físico aquí
```

El código lee directamente del archivo.

---

## ☁️ RAILWAY (Producción)

Railway NO soporta archivos, solo **variables de entorno**.

### Solución: Variable de entorno

1. **Abrir el archivo** `docusign_private.key` con Notepad
2. **Copiar TODO** el contenido (incluye -----BEGIN----- y -----END-----)
3. **Railway Dashboard** → Variables → **New Variable**
4. **Nombre**: `DOCUSIGN_PRIVATE_KEY_CONTENT`
5. **Valor**: Pegar todo el contenido
6. **Save**

```
Ejemplo del contenido:
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAwPK8...
(múltiples líneas)
...ASDFasdf123=
-----END RSA PRIVATE KEY-----
```

El código está actualizado para leer de la variable automáticamente.

---

## 🔄 Cómo Funciona

```javascript
// El código intenta en este orden:

1. ¿Existe DOCUSIGN_PRIVATE_KEY_CONTENT?
   ✅ SÍ → Usar ese contenido (RAILWAY)
   
2. ¿No? ¿Existe DOCUSIGN_PRIVATE_KEY_BASE64?
   ✅ SÍ → Decodificar y usar (Alternativa)
   
3. ¿No? Leer del archivo local
   ✅ SÍ → Usar archivo (LOCAL)
   ❌ NO → ERROR
```

---

## 📦 Deployment Checklist

### Antes de activar DocuSign en Railway:

- [ ] Generar nueva keypair en **DocuSign Production**
- [ ] Descargar `docusign_private.key`
- [ ] Guardar backup en 1Password/LastPass
- [ ] Abrir archivo y copiar TODO el contenido
- [ ] Agregar en Railway: `DOCUSIGN_PRIVATE_KEY_CONTENT` = contenido
- [ ] Agregar otras variables (INTEGRATION_KEY, USER_ID, etc.)
- [ ] Poner `DOCUSIGN_ENVIRONMENT=production`
- [ ] Mantener `USE_DOCUSIGN=false` (hasta estar listo)
- [ ] Deploy a Railway
- [ ] Ejecutar script de verificación
- [ ] Otorgar consentimiento (una sola vez)
- [ ] Cambiar `USE_DOCUSIGN=true`
- [ ] Probar con presupuesto real

---

## 🧪 Verificar Configuración

```bash
# Ejecuta este script para verificar TODO:
node verify-docusign-production.js

# Te dirá:
✅ Si las variables están configuradas
✅ Si la clave es válida
✅ Si DocuSign está accesible
✅ Si necesitas dar consentimiento
✅ Estado del feature flag
```

---

## 🆘 Problemas Comunes

### "No se encontró la llave privada"
- **Local**: Verifica que `docusign_private.key` esté en `BackZurcher/`
- **Railway**: Verifica que agregaste `DOCUSIGN_PRIVATE_KEY_CONTENT`

### "Invalid private key format"
- Verifica que copiaste TODO el contenido (BEGIN y END incluidos)
- No debe tener espacios extra al inicio/final
- Debe ser el archivo descargado de DocuSign, no modificado

### Clave perdida
- Genera una nueva en DocuSign Admin Console
- Solo puedes descargarla UNA VEZ
- Guarda backup en password manager

---

## 📚 Documentación Completa

Ver: `DOCUSIGN_PRODUCTION_DEPLOYMENT.md`

---

**Última actualización**: Noviembre 2025
