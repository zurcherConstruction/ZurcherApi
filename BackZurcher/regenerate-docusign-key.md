# Regenerar Clave Privada de DocuSign

## El Problema
La clave privada `docusign_private.key` se perdió (estaba en .gitignore por seguridad).

## Solución: Generar Nueva Keypair

### Pasos:

1. **Ve a DocuSign Admin Console**
   - URL: https://admindemo.docusign.com
   - Login con tu cuenta de DocuSign

2. **Navega a tu aplicación**
   - Ve a: **Integrations** → **Apps and Keys**
   - Encuentra tu app: `zurcherconstruction`
   - Integration Key: `192a7e6f-25b7-41b8-9235-f4d4a03f6f73`

3. **Genera nueva RSA Keypair**
   - En la sección **Service Integration**
   - Click en **Actions** → **Add RSA Keypair** (o **Generate RSA Keypair**)
   - Esto generará una nueva keypair

4. **Descarga la clave privada**
   - Click en **Download Private Key**
   - **IMPORTANTE**: Solo puedes descargarla UNA VEZ
   - Guárdala como `docusign_private.key` en la carpeta `BackZurcher`

5. **Actualiza el .env**
   - Verifica que tienes:
   ```bash
   DOCUSIGN_INTEGRATION_KEY=192a7e6f-25b7-41b8-9235-f4d4a03f6f73
   DOCUSIGN_USER_ID=dcf6428f-3381-4604-97ff-c151983bca0c
   DOCUSIGN_ACCOUNT_ID=4d74d3bc-2b4b-499b-97f4-5509119d1fd2
   DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private.key
   DOCUSIGN_ENVIRONMENT=demo
   USE_DOCUSIGN=true
   ```

6. **Otorgar consentimiento (si es necesario)**
   - Ejecuta el script de consentimiento:
   ```bash
   node grant-docusign-consent.js
   ```
   - O visita el URL que se muestra en el error cuando ejecutes el código

## Verificación

Después de regenerar la clave, prueba descargar el documento firmado nuevamente:
```bash
# El endpoint debería funcionar ahora
GET /budget/2301/download-signed
```

## Seguridad

✅ **NUNCA** subas `docusign_private.key` a git
✅ Ya está en `.gitignore`
✅ Guárdala en un lugar seguro (1Password, LastPass, etc.)

## Información de la Keypair Anterior (Perdida)
- Keypair ID anterior: `ffc0b1d5-819f-4207-83b1-a6e90d1064f6`
- Esta keypair ya NO es válida una vez generes una nueva
