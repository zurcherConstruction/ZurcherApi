#!/usr/bin/env bash

# 📱 Script de Instalación - Sistema Autosave Móvil
# Ejecutar desde la raíz del proyecto

echo "🚀 Instalando sistema de autosave para app móvil..."

# Navegar a WorkTrackerApp
cd WorkTrackerApp || exit

echo ""
echo "📦 Paso 1/2: Instalando NetInfo..."
npx expo install @react-native-community/netinfo

echo ""
echo "✅ Instalación completada!"
echo ""
echo "📋 Resumen de cambios:"
echo "  ✅ offlineStorageMobile.js - Creado"
echo "  ✅ autosaveMobile.js - Creado"
echo "  ✅ imageUploadQueue.js - Creado"
echo "  ✅ MaintenanceFormScreen.jsx - Integrado"
echo "  ✅ App.js - Toast ya configurado"
echo "  ✅ @react-native-community/netinfo - Instalado"
echo ""
echo "🎉 Sistema listo para usar!"
echo ""
echo "📖 Para más detalles, ver: MOBILE_AUTOSAVE_IMPLEMENTATION.md"
echo ""
echo "🧪 Para probar:"
echo "  1. npm run dev (desde WorkTrackerApp)"
echo "  2. Abrir formulario de maintenance"
echo "  3. Editar campos → esperar 30s → ver toast de autosave"
echo "  4. Modo avión ON → editar → ver 'Guardado offline'"
echo "  5. Agregar foto → ver contador de cola"
echo ""
