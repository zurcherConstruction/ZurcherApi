# 🚀 INSTALADOR DE DEPENDENCIAS PARA OPTIMIZACIÓN DE UPLOADS
# Script para instalar las dependencias necesarias para el sistema de uploads optimizado

Write-Host "🚀 Instalando dependencias para optimización de uploads..." -ForegroundColor Green

# Verificar si estamos en la carpeta correcta
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json no encontrado. Ejecute este script desde la carpeta WorkTrackerApp" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Instalando dependencias principales..." -ForegroundColor Yellow

# Dependencias para compresión y manejo de medios
npm install expo-image-manipulator

# Dependencias para información de red
npm install @react-native-community/netinfo

# Dependencias para almacenamiento
npm install @react-native-async-storage/async-storage

# Verificar que expo-av ya esté instalado (para videos)
Write-Host "🎬 Verificando expo-av..." -ForegroundColor Yellow
$expoAvInstalled = npm list expo-av 2>$null
if (!$expoAvInstalled) {
    Write-Host "📦 Instalando expo-av..." -ForegroundColor Yellow
    npm install expo-av
} else {
    Write-Host "✅ expo-av ya está instalado" -ForegroundColor Green
}

# Verificar que expo-file-system esté instalado
Write-Host "📁 Verificando expo-file-system..." -ForegroundColor Yellow
$expoFileSystemInstalled = npm list expo-file-system 2>$null
if (!$expoFileSystemInstalled) {
    Write-Host "📦 Instalando expo-file-system..." -ForegroundColor Yellow
    npm install expo-file-system
} else {
    Write-Host "✅ expo-file-system ya está instalado" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Instalación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Características instaladas:" -ForegroundColor Cyan
Write-Host "  📸 Compresión inteligente de imágenes" -ForegroundColor White
Write-Host "  🎬 Análisis de videos (compresión básica)" -ForegroundColor White
Write-Host "  📡 Detección de calidad de conexión" -ForegroundColor White
Write-Host "  🔄 Sistema de reintentos automáticos" -ForegroundColor White
Write-Host "  💾 Uploads offline con cola inteligente" -ForegroundColor White
Write-Host "  📊 Indicadores de progreso en tiempo real" -ForegroundColor White
Write-Host ""
Write-Host "🚨 IMPORTANTE:" -ForegroundColor Red
Write-Host "  - Reinicie la app completamente para aplicar los cambios" -ForegroundColor Yellow
Write-Host "  - Las imágenes se comprimirán automáticamente según la conexión" -ForegroundColor Yellow
Write-Host "  - Los uploads fallos se reintentarán automáticamente" -ForegroundColor Yellow
Write-Host "  - Los archivos grandes mostrarán advertencias" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎯 El sistema está listo para manejo offline optimizado!" -ForegroundColor Green