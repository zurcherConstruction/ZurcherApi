# 🚀 Guía de Deployment de DocuSign a Producción (Railway)

## 📋 Prerequisitos

Antes de activar DocuSign en producción, necesitas tener:

1. ✅ Cuenta de DocuSign en **Production** (no Demo)
2. ✅ Integration App creada y **aprobada** por DocuSign (Go-Live completado)
3. ✅ Claves y credenciales de producción generadas

---

## 🔑 Paso 1: Generar Claves de Producción en DocuSign

### 1.1 Acceder al Admin Console de Producción
```
URL: https://admin.docusign.com (sin el "demo")
Login: Tu cuenta de DocuSign de producción
```

### 1.2 Crear/Configurar tu App
1. Ve a **Integrations** → **Apps and Keys**
2. Selecciona tu app `zurcherconstruction` o crea una nueva para producción
3. Anota estos datos:

```bash
DOCUSIGN_INTEGRATION_KEY=<Integration Key de producción>
DOCUSIGN_USER_ID=<User ID de producción>
DOCUSIGN_ACCOUNT_ID=<Account ID de producción>
```

### 1.3 Generar RSA Keypair (IMPORTANTE)
1. En tu app, ve a **Service Integration**
2. Click en **Generate RSA Keypair**
3. **⚠️ MUY IMPORTANTE**: Click en **Download Private Key**
   - Solo puedes descargarla UNA VEZ
   - Guárdala de inmediato en un lugar seguro
   - Archivo descargado: `docusign_private.key`

### 1.4 Guardar la Clave Privada Localmente
```bash
# Guarda el archivo descargado en:
BackZurcher/docusign_private.key

# ✅ VERIFICA que esté en .gitignore (ya debería estar)
# ❌ NUNCA la subas a Git
```

### 1.5 Guardar Backup Seguro
**IMPORTANTE**: Guarda una copia de `docusign_private.key` en:
- 🔐 Password Manager (1Password, LastPass, Bitwarden)
- 📁 Carpeta segura en la nube (Google Drive privado, Dropbox)
- 💾 USB backup cifrado

**Si pierdes esta clave, deberás generar una nueva y actualizar todo.**

---

## 🚂 Paso 2: Subir la Clave Privada a Railway

### Opción A: Usar Railway CLI (RECOMENDADO)

#### 2.1 Instalar Railway CLI
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Conectar a tu proyecto
cd BackZurcher
railway link
```

#### 2.2 Subir el archivo como variable de entorno
Railway NO soporta archivos directamente, pero tienes 2 opciones:

**Opción A.1: Convertir la clave a Base64 y almacenarla como variable**

```bash
# En PowerShell (Windows):
$content = Get-Content -Path "docusign_private.key" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)
echo $base64

# Copia el resultado y agrégalo como variable en Railway
```

Luego en Railway Dashboard:
1. Ve a tu proyecto → Variables
2. Agrega: `DOCUSIGN_PRIVATE_KEY_BASE64=<el string base64 copiado>`

**Opción A.2: Pegar el contenido directamente (Más simple)**

```bash
# 1. Abre docusign_private.key con un editor de texto
# 2. Copia TODO el contenido (incluyendo -----BEGIN RSA PRIVATE KEY----- y -----END RSA PRIVATE KEY-----)
# 3. Ve a Railway → Variables
# 4. Agrega: DOCUSIGN_PRIVATE_KEY_CONTENT=<pega todo el contenido>
```

---

### Opción B: Usar Railway Dashboard (MÁS FÁCIL)

1. Abre `docusign_private.key` con **Notepad** o **VS Code**
2. Copia **TODO** el contenido (debe verse así):
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(múltiples líneas)
...
-----END RSA PRIVATE KEY-----
```
3. Ve a **Railway Dashboard** → Tu Proyecto → **Variables**
4. Click en **New Variable**
5. Nombre: `DOCUSIGN_PRIVATE_KEY_CONTENT`
6. Valor: Pega TODO el contenido copiado
7. **Save**

---

## 🔧 Paso 3: Modificar el Código para Leer la Clave

### 3.1 Actualizar ServiceDocuSign.js

Edita `BackZurcher/src/services/ServiceDocuSign.js`:

```javascript
async getAccessToken() {
  try {
    console.log('🔐 Obteniendo access token de DocuSign con JWT...');

    // 🆕 MODIFICACIÓN: Leer clave desde variable de entorno o archivo
    let privateKey;
    
    // Opción 1: Si viene como contenido directo
    if (process.env.DOCUSIGN_PRIVATE_KEY_CONTENT) {
      console.log('📝 Usando clave privada desde variable de entorno (contenido directo)');
      privateKey = process.env.DOCUSIGN_PRIVATE_KEY_CONTENT;
    }
    // Opción 2: Si viene como Base64
    else if (process.env.DOCUSIGN_PRIVATE_KEY_BASE64) {
      console.log('📝 Usando clave privada desde variable de entorno (Base64)');
      const buffer = Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY_BASE64, 'base64');
      privateKey = buffer.toString('utf8');
    }
    // Opción 3: Leer desde archivo (local development)
    else {
      console.log('📁 Leyendo clave privada desde archivo local');
      const privateKeyPath = path.resolve(this.privateKeyPath);
      if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`No se encontró la llave privada en: ${privateKeyPath}`);
      }
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    }

    // Configurar el OAuth basePath para el ambiente correcto
    const oAuthBasePath = this.environment === 'demo'
      ? 'account-d.docusign.com'
      : 'account.docusign.com';
    
    this.apiClient.setOAuthBasePath(oAuthBasePath);

    // ... resto del código sin cambios
```

---

## ⚙️ Paso 4: Configurar Variables de Entorno en Railway

Ve a **Railway Dashboard** → Tu Proyecto → **Variables** y agrega:

```bash
# DocuSign Production Credentials
DOCUSIGN_INTEGRATION_KEY=<Integration Key de producción>
DOCUSIGN_USER_ID=<User ID de producción>
DOCUSIGN_ACCOUNT_ID=<Account ID de producción>

# Environment (cambiar de 'demo' a 'production')
DOCUSIGN_ENVIRONMENT=production

# Private Key (elige UNA de estas opciones):
# Opción 1 (RECOMENDADA):
DOCUSIGN_PRIVATE_KEY_CONTENT=-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----

# O Opción 2:
DOCUSIGN_PRIVATE_KEY_BASE64=<base64 string>

# Feature Flag - Mantener en FALSE hasta que esté todo probado
USE_DOCUSIGN=false
```

---

## 🧪 Paso 5: Pruebas Antes de Activar

### 5.1 Deploy sin Activar DocuSign
```bash
# En Railway, mantener:
USE_DOCUSIGN=false

# Esto permite que el código de DocuSign esté en producción
# pero SignNow seguirá siendo el servicio activo
```

### 5.2 Hacer Deploy
```bash
# Push a la rama de producción (main o la que uses)
git add .
git commit -m "feat: Add DocuSign production support"
git push origin main

# Railway hará deploy automático
```

### 5.3 Verificar en Railway Logs
```bash
# Verifica que el servidor inicie sin errores
# Busca en logs:
✅ "Servidor escuchando en el puerto..."
✅ Sin errores de DocuSign al iniciar
```

---

## 🔓 Paso 6: Otorgar Consentimiento (One-Time)

Antes de poder usar DocuSign en producción, necesitas dar consentimiento:

### 6.1 Generar URL de Consentimiento
```bash
# Usar este URL (reemplaza <INTEGRATION_KEY> con tu Integration Key real):
https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=<INTEGRATION_KEY>&redirect_uri=https://www.docusign.com
```

### 6.2 Dar Consentimiento
1. Abre el URL en tu navegador
2. Login con tu cuenta de DocuSign de **producción**
3. Click en **Allow/Authorize**
4. Serás redirigido (ignora el error de la página, el consentimiento ya se otorgó)

### 6.3 Verificar Consentimiento
Puedes crear un script de verificación:

```javascript
// BackZurcher/verify-docusign-production.js
const DocuSignService = require('./src/services/ServiceDocuSign');

async function verifyDocuSign() {
  try {
    console.log('🔍 Verificando conexión a DocuSign Production...');
    const docusign = new DocuSignService();
    const token = await docusign.getAccessToken();
    console.log('✅ Conexión exitosa! Token obtenido.');
    console.log('✅ DocuSign Production está listo para usar.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.body?.error === 'consent_required') {
      console.log('⚠️  Necesitas otorgar consentimiento primero.');
    }
  }
}

verifyDocuSign();
```

Ejecutar en Railway CLI:
```bash
railway run node verify-docusign-production.js
```

---

## 🚀 Paso 7: Activar DocuSign en Producción

### 7.1 Cambiar Feature Flag
En Railway → Variables:
```bash
USE_DOCUSIGN=true
```

### 7.2 Railway hará Re-deploy Automático

### 7.3 Monitorear Logs
```bash
# Verifica en Railway logs:
✅ "Servidor escuchando..."
✅ Primer envío de presupuesto a DocuSign
```

### 7.4 Prueba con un Presupuesto Real
1. Crea un presupuesto de prueba
2. Envíalo para firma
3. Verifica en logs:
```
📤 Enviando a DocuSign...
🔐 Obteniendo access token de DocuSign con JWT...
✅ Access token JWT obtenido exitosamente
✅ Documento enviado a DocuSign
```

---

## 🔄 Paso 8: Rollback (Si algo sale mal)

Si tienes problemas, puedes volver a SignNow inmediatamente:

```bash
# En Railway → Variables:
USE_DOCUSIGN=false

# Railway re-deploya y vuelve a SignNow automáticamente
```

---

## 📊 Resumen de Archivos y Variables

### Archivos Locales (No se suben a Git)
```
BackZurcher/
  ├── docusign_private.key         ❌ NUNCA subir a Git
  ├── .env                          ❌ NUNCA subir a Git
  └── .gitignore                    ✅ Ya incluye docusign_private.key
```

### Variables en Railway (Producción)
```bash
# Credenciales DocuSign
DOCUSIGN_INTEGRATION_KEY=<producción>
DOCUSIGN_USER_ID=<producción>
DOCUSIGN_ACCOUNT_ID=<producción>
DOCUSIGN_ENVIRONMENT=production
DOCUSIGN_PRIVATE_KEY_CONTENT=<contenido completo>

# Feature Flag
USE_DOCUSIGN=true  # false hasta estar listo
```

### Variables Locales (.env desarrollo)
```bash
# Credenciales DocuSign Demo
DOCUSIGN_INTEGRATION_KEY=192a7e6f-25b7-41b8-9235-f4d4a03f6f73
DOCUSIGN_USER_ID=dcf6428f-3381-4604-97ff-c151983bca0c
DOCUSIGN_ACCOUNT_ID=4d74d3bc-2b4b-499b-97f4-5509119d1fd2
DOCUSIGN_PRIVATE_KEY_PATH=./docusign_private.key  # Lee desde archivo local
DOCUSIGN_ENVIRONMENT=demo

# Feature Flag
USE_DOCUSIGN=false  # true para probar local con DocuSign
```

---

## 🆘 Troubleshooting

### Error: "No se encontró la llave privada"
- ✅ Verifica que agregaste `DOCUSIGN_PRIVATE_KEY_CONTENT` en Railway
- ✅ Verifica que el código actualizado de `ServiceDocuSign.js` esté en producción
- ✅ Revisa Railway logs para ver qué opción está intentando usar

### Error: "consent_required"
- ✅ Visita el URL de consentimiento (Paso 6)
- ✅ Asegúrate de usar cuenta de producción
- ✅ Verifica que la Integration Key sea la correcta

### Presupuestos quedan en "sent_for_signature" sin firmarse
- ✅ Verifica que el cliente reciba el email de DocuSign
- ✅ Revisa spam/junk del cliente
- ✅ Verifica en DocuSign dashboard que el envelope se creó

### Webhook no funciona
- ✅ Configura webhook en DocuSign Production
- ✅ URL: `https://<tu-dominio-railway>/api/webhooks/docusign`
- ✅ Events: `envelope-completed`, `recipient-completed`

---

## ✅ Checklist Final

Antes de activar DocuSign en producción:

- [ ] Cuenta DocuSign Production activa
- [ ] App aprobada (Go-Live completado)
- [ ] RSA Keypair generada en producción
- [ ] `docusign_private.key` guardada en backup seguro (1Password, etc.)
- [ ] Variables de entorno agregadas en Railway
- [ ] Código actualizado con lectura de clave desde env
- [ ] Deploy realizado con `USE_DOCUSIGN=false`
- [ ] Servidor inicia sin errores
- [ ] Consentimiento otorgado
- [ ] Script de verificación ejecutado exitosamente
- [ ] `USE_DOCUSIGN=true` activado
- [ ] Prueba con presupuesto real exitosa
- [ ] Cliente recibe email y puede firmar
- [ ] Webhook configurado y funcionando

---

## 📞 Contacto y Soporte

Si tienes problemas durante el deployment:
1. Revisa Railway logs detalladamente
2. Ejecuta script de verificación
3. Contacta soporte de DocuSign si es necesario
4. Haz rollback a SignNow si es urgente

---

**Última actualización**: Noviembre 2025
**Autor**: Configuración para Zurcher Construction
