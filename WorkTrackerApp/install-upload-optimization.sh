#!/bin/bash

# 🚀 INSTALADOR DE DEPENDENCIAS PARA OPTIMIZACIÓN DE UPLOADS
# Script para instalar las dependencias necesarias para el sistema de uploads optimizado

echo "🚀 Instalando dependencias para optimización de uploads..."

# Verificar si estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado. Ejecute este script desde la carpeta WorkTrackerApp"
    exit 1
fi

echo "📦 Instalando dependencias principales..."

# Dependencias para compresión y manejo de medios
npm install expo-image-manipulator

# Dependencias para información de red
npm install @react-native-community/netinfo

# Dependencias para almacenamiento
npm install @react-native-async-storage/async-storage

# Verificar que expo-av ya esté instalado (para videos)
echo "🎬 Verificando expo-av..."
if ! npm list expo-av &> /dev/null; then
    echo "📦 Instalando expo-av..."
    npm install expo-av
else
    echo "✅ expo-av ya está instalado"
fi

# Verificar que expo-file-system esté instalado
echo "📁 Verificando expo-file-system..."
if ! npm list expo-file-system &> /dev/null; then
    echo "📦 Instalando expo-file-system..."
    npm install expo-file-system
else
    echo "✅ expo-file-system ya está instalado"
fi

echo ""
echo "✅ Instalación completada!"
echo ""
echo "🔧 Características instaladas:"
echo "  📸 Compresión inteligente de imágenes"
echo "  🎬 Análisis de videos (compresión básica)"
echo "  📡 Detección de calidad de conexión"
echo "  🔄 Sistema de reintentos automáticos"
echo "  💾 Uploads offline con cola inteligente"
echo "  📊 Indicadores de progreso en tiempo real"
echo ""
echo "🚨 IMPORTANTE:"
echo "  - Reinicie la app completamente para aplicar los cambios"
echo "  - Las imágenes se comprimirán automáticamente según la conexión"
echo "  - Los uploads fallos se reintentarán automáticamente"
echo "  - Los archivos grandes mostrarán advertencias"
echo ""
echo "🎯 El sistema está listo para manejo offline optimizado!"