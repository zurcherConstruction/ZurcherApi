# Script de Migración: Crear tabla SupplierInvoiceSimpleWorks
# Fecha: 2026-02-13
# Uso: .\run-supplier-invoice-simplework-migration.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔄 Migración: SupplierInvoice ↔ SimpleWork" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuración de la base de datos
$DB_NAME = "zurcher_db"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"

# Archivo de migración
$MIGRATION_FILE = "BackZurcher\migrations\create-supplier-invoice-simplework-table.sql"

# Verificar que el archivo de migración existe
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ ERROR: No se encontró el archivo de migración" -ForegroundColor Red
    Write-Host "Ruta esperada: $MIGRATION_FILE" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Archivo de migración encontrado: $MIGRATION_FILE" -ForegroundColor Green
Write-Host ""

# Solicitar confirmación
Write-Host "⚠️  IMPORTANTE: Esta migración creará la tabla SupplierInvoiceSimpleWorks" -ForegroundColor Yellow
Write-Host "   Permite vincular facturas de proveedores con SimpleWorks" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "¿Desea continuar? (S/N)"

if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "❌ Migración cancelada por el usuario" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Ejecutando migración..." -ForegroundColor Cyan

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql no está disponible en el PATH" -ForegroundColor Red
    Write-Host "   Por favor, instala PostgreSQL o agrega psql al PATH del sistema" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Alternativa: Copia el contenido del archivo de migración" -ForegroundColor Cyan
    Write-Host "   y ejecútalo manualmente en pgAdmin o DBeaver" -ForegroundColor Cyan
    exit 1
}

# Ejecutar migración
try {
    Write-Host "Conectando a la base de datos $DB_NAME..." -ForegroundColor Yellow
    
    # Ejecutar migración
    & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f $MIGRATION_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ ¡Migración ejecutada exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Verificando tabla creada..." -ForegroundColor Cyan
        
        # Verificar que la tabla se creó correctamente
        $verifyQuery = @"
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'SupplierInvoiceSimpleWorks'
ORDER BY ordinal_position;
"@
        
        Write-Host ""
        Write-Host "📊 Estructura de la tabla SupplierInvoiceSimpleWorks:" -ForegroundColor Cyan
        Write-Host $verifyQuery | & psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t
        
        Write-Host ""
        Write-Host "✅ MIGRACIÓN COMPLETA" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "   1. Reiniciar el servidor backend (Node.js)" -ForegroundColor White
        Write-Host "   2. Abrir SupplierInvoiceForm para crear/editar facturas" -ForegroundColor White
        Write-Host "   3. Probar vinculación de SimpleWorks a invoices" -ForegroundColor White
        Write-Host "   4. Verificar que los datos se guardan correctamente" -ForegroundColor White
        
    } else {
        Write-Host ""
        Write-Host "❌ ERROR: La migración falló" -ForegroundColor Red
        Write-Host "   Código de salida: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔧 Posibles soluciones:" -ForegroundColor Cyan
        Write-Host "   1. Verificar las credenciales de PostgreSQL" -ForegroundColor White
        Write-Host "   2. Asegurarse de que la base de datos existe" -ForegroundColor White
        Write-Host "   3. Verificar que SimpleWorks existe (dependencia)" -ForegroundColor White
        Write-Host "   4. Ejecutar manualmente el SQL en pgAdmin" -ForegroundColor White
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR INESPERADO: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
