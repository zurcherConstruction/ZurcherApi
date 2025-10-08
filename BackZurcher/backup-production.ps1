# 🔐 BACKUP DE BASE DE DATOS DE PRODUCCIÓN (PowerShell)
# Ejecutar ANTES de hacer cualquier deployment

# Variables de configuración
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = ".\backups"
$BACKUP_FILE = "zurcher_production_backup_$TIMESTAMP.sql"
$DATABASE_URL = "tu_database_url_de_produccion_aqui"  # Reemplazar con la URL real

# Crear directorio de backups si no existe
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "🔄 Iniciando backup de producción..." -ForegroundColor Cyan
Write-Host "📅 Timestamp: $TIMESTAMP" -ForegroundColor Yellow

# OPCIÓN 1: Si usas Heroku
# heroku pg:backups:capture --app nombre-de-tu-app
# heroku pg:backups:download --app nombre-de-tu-app -o "$BACKUP_DIR\$BACKUP_FILE"

# OPCIÓN 2: Si usas pg_dump directamente (necesitas PostgreSQL instalado)
# pg_dump "$DATABASE_URL" > "$BACKUP_DIR\$BACKUP_FILE"

# OPCIÓN 3: Si usas Railway
# railway db backup

Write-Host ""
Write-Host "⚠️  INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. Descomenta la línea correspondiente a tu plataforma (Heroku, Railway, etc.)" -ForegroundColor White
Write-Host "2. Reemplaza 'tu_database_url_de_produccion_aqui' con tu URL real" -ForegroundColor White
Write-Host "3. Ejecuta este script: .\backup-production.ps1" -ForegroundColor White
Write-Host ""
Write-Host "📋 Backups existentes:" -ForegroundColor Cyan
Get-ChildItem $BACKUP_DIR -Filter "*.sql*" | Select-Object Name, Length, LastWriteTime | Format-Table

Write-Host ""
Write-Host "✅ Cuando el backup esté completo, puedes hacer el deployment." -ForegroundColor Green
