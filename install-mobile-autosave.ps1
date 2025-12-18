# 📱 Script de Instalación - Sistema Autosave Móvil (Windows)
# Ejecutar desde la raíz del proyecto con PowerShell

Write-Host "🚀 Instalando sistema de autosave para app móvil..." -ForegroundColor Green

# Navegar a WorkTrackerApp
Set-Location -Path "WorkTrackerApp"

Write-Host ""
Write-Host "📦 Paso 1/2: Instalando NetInfo..." -ForegroundColor Yellow
npx expo install @react-native-community/netinfo

Write-Host ""
Write-Host "✅ Instalación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen de cambios:" -ForegroundColor Cyan
Write-Host "  ✅ offlineStorageMobile.js - Creado" -ForegroundColor White
Write-Host "  ✅ autosaveMobile.js - Creado" -ForegroundColor White
Write-Host "  ✅ imageUploadQueue.js - Creado" -ForegroundColor White
Write-Host "  ✅ MaintenanceFormScreen.jsx - Integrado" -ForegroundColor White
Write-Host "  ✅ App.js - Toast ya configurado" -ForegroundColor White
Write-Host "  ✅ @react-native-community/netinfo - Instalado" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Sistema listo para usar!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Para más detalles, ver: MOBILE_AUTOSAVE_IMPLEMENTATION.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 Para probar:" -ForegroundColor Yellow
Write-Host "  1. npm run dev (desde WorkTrackerApp)" -ForegroundColor White
Write-Host "  2. Abrir formulario de maintenance" -ForegroundColor White
Write-Host "  3. Editar campos → esperar 30s → ver toast de autosave" -ForegroundColor White
Write-Host "  4. Modo avión ON → editar → ver 'Guardado offline'" -ForegroundColor White
Write-Host "  5. Agregar foto → ver contador de cola" -ForegroundColor White
Write-Host ""

# Volver a la raíz
Set-Location -Path ".."
