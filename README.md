# ZurcherApi
Seguimiento de Obra - Sistema de Gestión de Presupuestos y Trabajos

## 📚 Documentación de Deployment

### ⚠️ ANTES DE HACER DEPLOYMENT

**SIEMPRE** hacer backup de la base de datos de producción:

```bash
# Ver guía completa
cat DEPLOYMENT_PLAN.md

# Comandos rápidos
cat QUICK_COMMANDS.md
```

### 🔐 Scripts de Backup y Migración

- **`auto-backup.js`**: Backup automático de la base de datos
- **`migrate-existing-budgets.js`**: Migración de budgets existentes después del deployment
- **`backup-production.sh`**: Script de backup para Linux/Mac
- **`backup-production.ps1`**: Script de backup para Windows

### 📋 Deployment en 4 Pasos

1. **Backup**: `heroku pg:backups:capture --app zurcher-api`
2. **Deploy**: `git push origin main` (o `git push heroku main`)
3. **Migrar**: `heroku run node migrate-existing-budgets.js --app zurcher-api`
4. **Verificar**: `heroku logs --tail --app zurcher-api`

### 🆘 Rollback de Emergencia

```bash
# Rollback de código
heroku rollback v[VERSION] --app zurcher-api

# Restaurar base de datos
heroku pg:backups:restore b[BACKUP] DATABASE_URL --app zurcher-api
```

---

## 🚀 Desarrollo Local

### Instalación
```bash
# Backend
cd BackZurcher
npm install

# Frontend
cd FrontZurcher
npm install
```

### Ejecución
```bash
# Backend
cd BackZurcher
npm start

# Frontend
cd FrontZurcher
npm run dev
```

---

**Ver documentación completa**: [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md)
