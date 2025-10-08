# 🚂 Guía de Backup y Restore en Railway

## 📥 Descargar Backup de Railway

### Opción 1: Desde el Dashboard (Recomendado)
```
1. Ve a https://railway.app
2. Selecciona tu proyecto
3. Click en el servicio de PostgreSQL
4. Ve a la pestaña "Data"
5. Click en "Download Backup" (si está disponible)
   O
6. Ve a "Backups" y descarga el más reciente
```

### Opción 2: Desde Railway CLI
```bash
# Instalar Railway CLI si no la tienes
npm install -g @railway/cli

# Login
railway login

# Conectar al proyecto
railway link

# Ver información de la DB
railway variables

# Crear backup manual
railway run pg_dump $DATABASE_URL > backups/railway_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Opción 3: Conexión Directa con pg_dump
```bash
# 1. Obtener DATABASE_URL desde Railway dashboard
# Variables -> DATABASE_URL (copiar)

# 2. Ejecutar pg_dump
pg_dump "postgresql://user:pass@host:port/database" > backups/railway_production_$(date +%Y%m%d_%H%M%S).sql

# 3. Comprimir
gzip backups/railway_production_*.sql
```

---

## 🔄 Restaurar Backup en Railway

### Si necesitas restaurar:
```bash
# 1. Obtener DATABASE_URL de Railway
railway variables

# 2. Restaurar desde archivo SQL
psql "$DATABASE_URL" < backups/railway_production_20251007.sql

# O si está comprimido
gunzip -c backups/railway_production_20251007.sql.gz | psql "$DATABASE_URL"
```

---

## 🔍 Verificar Backup Descargado

```bash
# Ver primeras líneas del backup
head -n 50 backups/railway_production_*.sql

# Buscar tabla específica
grep "CREATE TABLE" backups/railway_production_*.sql

# Verificar que tiene datos
grep "COPY" backups/railway_production_*.sql | wc -l
```

---

## 📋 Checklist de Seguridad

- [ ] Backup descargado localmente
- [ ] Archivo SQL verificado (no vacío, no corrupto)
- [ ] Backup comprimido para ahorrar espacio
- [ ] Fecha del backup documentada
- [ ] DATABASE_URL guardada de forma segura (password manager)

---

## 🚨 En Caso de Emergencia

Si algo sale mal después del deployment:

```bash
# 1. Detener el servicio (Railway dashboard -> Service -> Settings -> Sleep)

# 2. Restaurar DB
psql "$DATABASE_URL" < backups/railway_production_FECHA.sql

# 3. Reactivar servicio

# 4. Verificar que todo funciona
```
