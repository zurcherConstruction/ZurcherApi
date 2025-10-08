# 🚀 COMANDOS RÁPIDOS PARA DEPLOYMENT

## 📦 Backup Rápido

### Local (Development)
```bash
cd BackZurcher
node auto-backup.js
```

### Producción (Heroku)
```bash
# Backup manual
heroku pg:backups:capture --app zurcher-api

# Descargar último backup
heroku pg:backups:download --app zurcher-api

# Ver backups existentes
heroku pg:backups --app zurcher-api

# Programar backups automáticos
heroku pg:backups:schedule DATABASE_URL --at '03:00 America/New_York' --app zurcher-api
```

### Producción (Railway)
```bash
# Desde CLI
railway db backup

# Desde Dashboard
# Railway Dashboard -> Database -> Backups -> Create Backup
```

---

## 🚀 Deployment

### 1. Pre-Deployment
```bash
# Verificar rama
git branch

# Ver cambios
git status

# Commit
git add .
git commit -m "feat: refactor UploadInitialPay + auto-approve on payment"

# Push
git push origin yani38
```

### 2. Backup OBLIGATORIO
```bash
# EJECUTAR ANTES DE MERGE/DEPLOY
heroku pg:backups:capture --app zurcher-api
```

### 3. Deploy
```bash
# Merge a main
git checkout main
git merge yani38

# Push (auto-deploy si está configurado)
git push origin main

# O push a Heroku
git push heroku main
```

### 4. Migración de Datos
```bash
# Heroku
heroku run node migrate-existing-budgets.js --app zurcher-api

# Railway
railway run node migrate-existing-budgets.js

# Local contra producción
DATABASE_URL="postgresql://..." node migrate-existing-budgets.js
```

---

## 🔍 Verificación Post-Deployment

```bash
# Logs en tiempo real
heroku logs --tail --app zurcher-api

# Solo errores
heroku logs --tail --app zurcher-api | grep ERROR

# Ver última hora
heroku logs --tail --since 1h --app zurcher-api

# Railway
railway logs
```

---

## 🆘 Rollback de Emergencia

### Rollback de Código
```bash
# Ver versiones
heroku releases --app zurcher-api

# Rollback a versión anterior
heroku rollback v[NUMERO] --app zurcher-api
```

### Restaurar Base de Datos
```bash
# Ver backups disponibles
heroku pg:backups --app zurcher-api

# Restaurar desde backup
heroku pg:backups:restore b[NUMERO] DATABASE_URL --app zurcher-api --confirm zurcher-api
```

---

## 🧪 Testing Rápido

```bash
# Health check
curl https://tu-api.com/health

# Test login
curl -X POST https://tu-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test budgets (con token)
curl https://tu-api.com/budget/all \
  -H "Authorization: Bearer [TOKEN]"
```

---

## 📊 Diagnóstico

```bash
# Ver budgets editables
cd BackZurcher
node diagnose-budgets-editable.js

# Ver estado de la DB
heroku pg:info --app zurcher-api

# Conexiones activas
heroku pg:ps --app zurcher-api

# Queries lentas
heroku pg:outliers --app zurcher-api
```

---

## 🔧 Mantenimiento

### Limpiar backups viejos locales
```bash
cd BackZurcher/backups
# Mantener solo últimos 30 días
find . -name "*.sql*" -mtime +30 -delete
```

### Ver tamaño de backups
```bash
cd BackZurcher/backups
du -sh *
```

### Comprimir backup manual
```bash
gzip backup.sql
```

---

## 📱 Notificaciones (Opcional)

### Slack webhook para notificar deployment
```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚀 Deployment completado - Zurcher API",
    "attachments": [{
      "color": "good",
      "fields": [
        {"title": "Versión", "value": "v1.2.0", "short": true},
        {"title": "Rama", "value": "yani38 → main", "short": true}
      ]
    }]
  }'
```

---

## 🔐 Variables de Entorno

### Ver variables en Heroku
```bash
heroku config --app zurcher-api
```

### Actualizar variable
```bash
heroku config:set VARIABLE_NAME=value --app zurcher-api
```

### Railway
```bash
railway variables
railway variables set VARIABLE_NAME=value
```

---

## 📝 Checklist Rápido

```
Pre-Deploy:
□ Backup creado ✅
□ Código commiteado ✅
□ Tests pasando ✅

Deploy:
□ Merge a main ✅
□ Push exitoso ✅
□ Servidor responde ✅

Post-Deploy:
□ Migración ejecutada ✅
□ Funcionalidad probada ✅
□ Logs verificados ✅
```
