# Optimizador de Imágenes

Script automático para comprimir imágenes JPEG y PNG sin pérdida visible de calidad.

## 🚀 Uso

### 1. Detener el servidor de desarrollo
```bash
# Presiona Ctrl+C en la terminal donde corre npm run dev
```

### 2. Ejecutar el optimizador
```bash
# Optimizar todas las imágenes del landing
npm run optimize-images:landing

# O optimizar un directorio específico
npm run optimize-images src/assets/otra-carpeta

# O ejecutar directamente
node scripts/optimize-images.js src/assets/landing
```

### 3. Reiniciar el servidor
```bash
npm run dev
```

## ⚙️ Configuración

Edita `scripts/optimize-images.js`:

```javascript
const QUALITY = 80;        // Calidad de compresión (60-100)
const CREATE_BACKUP = true; // Crear backups antes de optimizar
```

## 📊 Resultados Esperados

- **JPEGs grandes (>1MB)**: 40-60% de reducción
- **JPEGs medianos**: 20-40% de reducción
- **PNGs**: 10-30% de reducción

## 🔧 Características

✅ Compresión JPEG con mozjpeg (mejor que estándar)
✅ Carga progresiva para JPEGs
✅ Compresión PNG con paleta de colores
✅ Backups automáticos (`.backup.jpeg`, `.backup.png`)
✅ Reporte detallado de ahorros
✅ Colores en consola para mejor legibilidad

## 📝 Eliminar Backups

Después de verificar que las imágenes se ven bien:

```bash
# Windows PowerShell
Remove-Item src\assets\landing\*.backup.* -Force

# Windows CMD
del src\assets\landing\*.backup.*

# Linux/Mac
rm src/assets/landing/*.backup.*
```

## ⚠️ Importante

- **Detén Vite antes de ejecutar** (las imágenes deben estar desbloqueadas)
- Los backups se crean automáticamente
- La calidad 80% es imperceptible al ojo humano
- Prueba primero con una copia si no estás seguro

## 🎯 Uso Futuro

Para nuevas imágenes:

1. Agrega las imágenes a `src/assets/landing/`
2. Ejecuta `npm run optimize-images:landing`
3. ¡Listo! Imágenes optimizadas automáticamente

## 💡 Tips

- **Antes de subir a producción**: Ejecuta el optimizador
- **Imágenes del hero**: Mantén alta calidad (85-90%)
- **Imágenes lazy-loaded**: Puedes usar 70-75%
- **Logos/iconos**: Usa PNG si necesitas transparencia
