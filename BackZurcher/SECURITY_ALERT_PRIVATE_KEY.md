# 🚨 RESPUESTA URGENTE: CLAVE PRIVADA EXPUESTA EN GITHUB

**Fecha**: 3 de Noviembre, 2025  
**Alerta**: GitGuardian detectó RSA Private Key en repositorio público  
**Severidad**: 🔴 CRÍTICA - ACCIÓN INMEDIATA REQUERIDA

---

## ⚠️ QUÉ PASÓ

GitGuardian detectó que el archivo `docusign_private.key` fue subido a GitHub en el repositorio `zurcherConstruction/ZurcherApi`.

**Riesgos**:
- ❌ Cualquiera puede usar tu clave para autenticarse como tu aplicación en DocuSign
- ❌ Podrían enviar documentos falsos en nombre de Zurcher Construction
- ❌ Acceso no autorizado a envelopes y documentos
- ❌ Posible violación de términos de servicio de DocuSign

---

## ✅ SOLUCIÓN INMEDIATA (HAZLO AHORA)

### PASO 1: Revocar la Clave Comprometida en DocuSign

**URGENTE - HACER PRIMERO**:

1. Ve a https://admindemo.docusign.com (o https://admin.docusign.com si es producción)
2. Navega a: **Settings → Apps and Keys**
3. Encuentra tu aplicación "Zurcher Construction"
4. Click en **"Actions"** → **"Delete"** en el RSA Keypair
5. Confirma la eliminación

**Esto invalida inmediatamente la clave expuesta** ✅

---

### PASO 2: Eliminar la Clave del Repositorio de GitHub

#### Opción A: Usando BFG Repo-Cleaner (Recomendado - Más Rápido)

```powershell
# 1. Descargar BFG Repo-Cleaner
# Ir a https://rskbg.github.io/bfg-repo-cleaner/
# O usar este comando si tienes Java instalado:
# Descargar manualmente bfg.jar

# 2. Hacer backup del repositorio
cd c:\Users\yaniz\Documents\ZurcherContruction
git clone --mirror https://github.com/zurcherConstruction/ZurcherApi.git ZurcherApi-mirror
cd ZurcherApi-mirror

# 3. Eliminar el archivo del historial
java -jar bfg.jar --delete-files docusign_private.key

# 4. Limpiar y pushear
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force

# 5. Eliminar el mirror
cd ..
Remove-Item -Recurse -Force ZurcherApi-mirror
```

#### Opción B: Usando git filter-repo (Alternativa)

```powershell
# 1. Instalar git filter-repo
pip install git-filter-repo

# 2. Ir a tu repositorio
cd c:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi

# 3. Hacer backup primero
git clone . ../ZurcherApi-backup

# 4. Eliminar el archivo del historial
git filter-repo --path BackZurcher/docusign_private.key --invert-paths

# 5. Force push (CUIDADO - esto reescribe el historial)
git remote add origin https://github.com/zurcherConstruction/ZurcherApi.git
git push origin --force --all
git push origin --force --tags
```

#### Opción C: Usando git filter-branch (Manual - Más Complejo)

```powershell
cd c:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi

# Eliminar del historial
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch BackZurcher/docusign_private.key" `
  --prune-empty --tag-name-filter cat -- --all

# Forzar recolección de basura
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
git push origin --force --tags
```

---

### PASO 3: Asegurar que No Vuelva a Pasar

Ya hicimos esto automáticamente:

```bash
# Verificar que está en .gitignore
cat .gitignore | grep "docusign_private.key"
```

Debería mostrar:
```
# 🔐 DocuSign Private Keys (NUNCA subir al repositorio)
docusign_private.key
**/docusign_private.key
*.pem
*.key
```

---

### PASO 4: Generar Nueva Clave RSA en DocuSign

1. Ve a https://admindemo.docusign.com → **Settings → Apps and Keys**
2. Click en tu aplicación "Zurcher Construction"
3. Click en **"Add RSA Keypair"**
4. **IMPORTANTE**: 
   - Click en **"DOWNLOAD RSA KEY"** → Guardar como `docusign_private.key`
   - Guardar en: `c:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi\BackZurcher\docusign_private.key`
   - **NUNCA hacer commit de este archivo**
5. Copiar el **Integration Key** (no cambia, pero verifica que es el mismo)

---

### PASO 5: Dar Consentimiento con la Nueva Clave

Como regeneraste el keypair, necesitas dar consentimiento nuevamente:

```powershell
# En BackZurcher, ejecutar test para obtener URL de consentimiento
cd c:\Users\yaniz\Documents\ZurcherContruction\ZurcherApi\BackZurcher
node test-docusign.js
```

Si sale error de consentimiento, te mostrará una URL como:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=...
```

1. Copia esa URL
2. Ábrela en el navegador
3. Inicia sesión en DocuSign
4. Click en **"Allow Access"**
5. Espera la redirección (puede ser error 404, eso es normal)
6. ✅ Consentimiento dado

---

### PASO 6: Verificar que Todo Funciona

```powershell
# Ejecutar test de DocuSign
cd BackZurcher
node test-docusign.js
```

Resultado esperado:
```
✅ ¡TOKEN OBTENIDO EXITOSAMENTE!
🎉 ¡DOCUSIGN ESTÁ CORRECTAMENTE CONFIGURADO!
```

---

## 🔐 MEJORES PRÁCTICAS DE SEGURIDAD

### 1. Usar Variables de Entorno para la Clave

**Modificar `ServiceDocuSign.js`**:

```javascript
constructor() {
  // ...
  
  // ✅ OPCIÓN 1: Desde variable de entorno (más seguro)
  if (process.env.DOCUSIGN_PRIVATE_KEY) {
    this.privateKey = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n');
  } 
  // ✅ OPCIÓN 2: Desde archivo local (solo desarrollo)
  else {
    this.privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './docusign_private.key';
    this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
  }
}
```

**En Railway (Producción)**:
```env
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
```

### 2. Nunca Commitear Archivos Sensibles

```powershell
# Verificar antes de cada commit
git status

# Si ves docusign_private.key:
git reset HEAD BackZurcher/docusign_private.key
git checkout -- BackZurcher/docusign_private.key
```

### 3. Usar Secrets en GitHub Actions (si lo usas)

```yaml
# .github/workflows/deploy.yml
env:
  DOCUSIGN_PRIVATE_KEY: ${{ secrets.DOCUSIGN_PRIVATE_KEY }}
```

### 4. Rotar Credenciales Regularmente

Cada 6 meses:
1. Generar nuevo keypair
2. Actualizar .env y servidor
3. Dar consentimiento nuevamente
4. Eliminar keypair antiguo

---

## 📋 CHECKLIST DE SEGURIDAD

Completar TODO antes de continuar:

- [ ] ✅ Clave RSA revocada en DocuSign (PASO 1)
- [ ] ✅ Archivo eliminado del historial de Git (PASO 2)
- [ ] ✅ `.gitignore` actualizado con `docusign_private.key` (PASO 3)
- [ ] ✅ Nueva clave RSA generada en DocuSign (PASO 4)
- [ ] ✅ Consentimiento dado con nueva clave (PASO 5)
- [ ] ✅ Test de DocuSign exitoso (PASO 6)
- [ ] 📧 Notificar a GitGuardian que el issue fue resuelto
- [ ] 🔍 Revisar otros archivos sensibles (`.env`, etc.)
- [ ] 📝 Documentar el incidente internamente

---

## 🚨 SI TIENES DUDAS O PROBLEMAS

### Errores Comunes:

**Error: "The keypair does not exist"**
→ Genera un nuevo keypair en DocuSign (PASO 4)

**Error: "consent_required"**
→ Da consentimiento usando la URL generada (PASO 5)

**Error al hacer force push**
→ Confirma que tienes permisos de admin en el repo
→ Usa `git push origin +yani56` para forzar solo tu rama

**BFG no funciona**
→ Necesitas Java instalado: https://www.java.com/download/
→ O usa git filter-repo como alternativa

---

## 📞 RECURSOS ADICIONALES

**GitGuardian**:
- Dashboard: https://dashboard.gitguardian.com
- Resolver incident: Click en "Mark as Resolved" después de completar los pasos

**DocuSign**:
- Documentación de seguridad: https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/security/
- Soporte: support@docusign.com

**GitHub**:
- Remover datos sensibles: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

## ⏱️ TIEMPO ESTIMADO

- PASO 1 (Revocar clave): 2 minutos ⏰
- PASO 2 (Limpiar repo): 10-15 minutos ⏰
- PASO 3 (Gitignore): ✅ Ya hecho
- PASO 4 (Nueva clave): 5 minutos ⏰
- PASO 5 (Consentimiento): 2 minutos ⏰
- PASO 6 (Verificar): 1 minuto ⏰

**TOTAL**: ~30 minutos

---

**PRIORIDAD**: 🔴 CRÍTICA - HACER HOY MISMO

No dejes esto para después. La clave expuesta es un riesgo de seguridad activo.
