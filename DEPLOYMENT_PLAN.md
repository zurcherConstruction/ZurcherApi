# 🚀 PLAN DE DEPLOYMENT SEGURO - Zurcher Construction API

## 📋 Resumen de Cambios

### Cambios Principales:
1. **UploadInitialPay**: Nuevo layout de 2 columnas, búsqueda manual, tarjetas visuales
2. **Backend uploadInvoice**: Ahora cambia status a 'approved' y crea Work/Income/Receipt automáticamente
3. **EditBudget**: Filtro basado en payment fields (no en status)

### Archivos Modificados:
- `FrontZurcher/src/Components/Budget/UploadInitialPay.jsx`
- `FrontZurcher/src/Components/Budget/EditBudget.jsx`
- `FrontZurcher/src/Redux/Actions/budgetActions.jsx` (nueva action: searchBudgets)
- `BackZurcher/src/controllers/BudgetController.js` (uploadInvoice)

---

## ⚠️ CRÍTICO: HACER ANTES DEL DEPLOYMENT

### 1. Backup de Base de Datos de Producción

#### Opción A: Heroku
```bash
# Capturar backup
heroku pg:backups:capture --app zurcher-api

# Descargar backup
heroku pg:backups:download --app zurcher-api -o backups/production_backup_$(date +%Y%m%d_%H%M%S).dump

# Verificar backups existentes
heroku pg:backups --app zurcher-api
```

#### Opción B: Railway
```bash
# Desde el dashboard de Railway -> Database -> Backups
# O usar CLI:
railway db backup
```

#### Opción C: Script Manual
```bash
# Ejecutar desde BackZurcher/
node auto-backup.js
```

### 2. Backup Local de Desarrollo
```bash
# Asegurarse de tener una copia local
cd BackZurcher
node auto-backup.js
```

---

## 🔄 PROCEDIMIENTO DE DEPLOYMENT

### PASO 1: Pre-Deployment Checks
```bash
# 1. Verificar que estás en la rama correcta
git branch

# 2. Verificar cambios pendientes
git status

# 3. Hacer commit de todos los cambios
git add .
git commit -m "feat: Refactor UploadInitialPay + auto-approve budgets on payment upload"

# 4. Push a tu rama
git push origin yani38
```

### PASO 2: Backup (OBLIGATORIO)
```bash
# Ejecutar backup de producción
# (Usa el método apropiado según tu plataforma)

# Heroku:
heroku pg:backups:capture --app zurcher-api

# Railway:
railway db backup

# Verificar que el backup se completó
```

### PASO 3: Deployment
```bash
# Merge a main (o la rama de producción)
git checkout main
git merge yani38

# Push a producción
git push origin main

# Si usas Heroku:
git push heroku main

# Si usas Railway/Render: El deployment es automático
```

### PASO 4: Migración de Datos Existentes
```bash
# IMPORTANTE: Ejecutar DESPUÉS del deployment

# SSH a tu servidor de producción o ejecutar localmente contra producción:

# Heroku:
heroku run node migrate-existing-budgets.js --app zurcher-api

# Railway:
railway run node migrate-existing-budgets.js

# O ejecutar el script conectado a la DB de producción
```

### PASO 5: Verificación Post-Deployment
```bash
# 1. Verificar que el servidor está funcionando
curl https://tu-api-url.com/health

# 2. Verificar logs
# Heroku:
heroku logs --tail --app zurcher-api

# Railway:
railway logs

# 3. Probar funcionalidad crítica:
#    - Login
#    - Listado de budgets
#    - Upload de comprobante de pago
#    - Verificar que se crea Work/Income/Receipt
```

---

## 🧪 TESTING EN PRODUCCIÓN

### Casos de Prueba Críticos:

1. **Budget SIN comprobante previo**:
   - ✅ Buscar budget en UploadInitialPay
   - ✅ Subir comprobante
   - ✅ Verificar que status cambia a 'approved'
   - ✅ Verificar que se crea Work
   - ✅ Verificar que se crea Income
   - ✅ Verificar que se crea Receipt
   - ✅ Budget desaparece de UploadInitialPay

2. **Budget CON comprobante previo** (después de migración):
   - ✅ NO aparece en UploadInitialPay
   - ✅ Tiene Work asociado
   - ✅ Tiene Income asociado
   - ✅ Tiene Receipt asociado

3. **EditBudget**:
   - ✅ Budgets CON comprobante están bloqueados (lock icon)
   - ✅ Budgets SIN comprobante son editables

---

## 🔧 ROLLBACK PLAN (Si algo sale mal)

### Opción 1: Rollback de Código
```bash
# Heroku:
heroku releases --app zurcher-api
heroku rollback v[numero-version-anterior] --app zurcher-api

# Railway: Desde el dashboard -> Deployments -> Redeploy versión anterior
```

### Opción 2: Restaurar Base de Datos
```bash
# Heroku:
heroku pg:backups:restore b[numero-backup] DATABASE_URL --app zurcher-api

# Manual con pg_restore:
pg_restore --clean --no-owner --no-acl -d $DATABASE_URL backups/production_backup_[fecha].dump
```

### Opción 3: Rollback Completo (Código + DB)
```bash
# 1. Rollback del código (ver Opción 1)
# 2. Restaurar DB (ver Opción 2)
# 3. Verificar que todo funciona
```

---

## 📅 BACKUPS AUTOMÁTICOS (Configurar después del deployment)

### Opción A: Cron Job en el Servidor
```bash
# Agregar a crontab (Linux/Mac)
crontab -e

# Backup diario a las 3 AM
0 3 * * * cd /path/to/BackZurcher && node auto-backup.js >> /var/log/zurcher-backup.log 2>&1

# Backup cada 6 horas
0 */6 * * * cd /path/to/BackZurcher && node auto-backup.js >> /var/log/zurcher-backup.log 2>&1
```

### Opción B: GitHub Actions (Recomendado)
```yaml
# .github/workflows/daily-backup.yml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 3 * * *'  # Diario a las 3 AM UTC
  workflow_dispatch:  # Permitir ejecución manual

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install PostgreSQL client
        run: sudo apt-get install -y postgresql-client
      
      - name: Create Backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd BackZurcher
          node auto-backup.js
      
      - name: Upload Backup to Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: db-backup-${{ github.run_number }}
          path: BackZurcher/backups/*.sql.gz
          retention-days: 30
```

### Opción C: Heroku Scheduler
```bash
# Instalar addon
heroku addons:create scheduler:standard --app zurcher-api

# Configurar desde el dashboard:
# Command: node auto-backup.js
# Frequency: Daily at 3:00 AM
```

---

## 📊 MONITOREO POST-DEPLOYMENT

### Métricas a Vigilar:

1. **Logs de Errores**
   ```bash
   # Ver últimos errores
   heroku logs --tail --app zurcher-api | grep ERROR
   ```

2. **Performance**
   - Tiempo de respuesta de API
   - Uso de memoria
   - Consultas lentas a la DB

3. **Funcionalidad**
   - Uploads de comprobantes exitosos
   - Creación de Works
   - Notificaciones enviadas

---

## ✅ CHECKLIST FINAL

### Pre-Deployment:
- [ ] Backup de producción creado y verificado
- [ ] Código commiteado y pusheado
- [ ] Tests pasando (si existen)
- [ ] Variables de entorno verificadas
- [ ] Plan de rollback listo

### Durante Deployment:
- [ ] Deployment exitoso
- [ ] Servidor responde correctamente
- [ ] No hay errores en los logs iniciales

### Post-Deployment:
- [ ] Migración de budgets existentes ejecutada
- [ ] Funcionalidad crítica probada
- [ ] Budgets previos funcionan correctamente
- [ ] Backups automáticos configurados
- [ ] Equipo notificado del deployment

---

## 🆘 CONTACTOS DE EMERGENCIA

- **DevOps Lead**: [Nombre] - [Email/Teléfono]
- **Database Admin**: [Nombre] - [Email/Teléfono]
- **Soporte de Plataforma**: 
  - Heroku: https://help.heroku.com
  - Railway: https://railway.app/help

---

## 📝 NOTAS ADICIONALES

### Cambios en el Modelo de Datos:
- Budget.status ahora cambia automáticamente a 'approved' al subir comprobante
- Work.propertyAddress es REQUIRED (corregido de 'address')
- Income.paymentMethod ahora se guarda desde el upload

### Comportamiento Nuevo:
- Budgets con paymentInvoice automáticamente desaparecen de UploadInitialPay
- Work se crea automáticamente al subir comprobante (antes era manual)
- Income/Receipt se crean automáticamente (antes requerían aprobación manual)

### Compatibilidad con Budgets Existentes:
- El script migrate-existing-budgets.js asegura que todos los budgets previos tengan:
  - Status 'approved' si tienen comprobante
  - Work asociado
  - Income asociado
  - Receipt asociado

---

**Última actualización**: 2025-10-07  
**Versión del plan**: 1.0  
**Autor**: AI Assistant + Yani (Developer)
