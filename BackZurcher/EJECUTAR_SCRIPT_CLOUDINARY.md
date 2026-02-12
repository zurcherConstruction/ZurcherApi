# 🚀 Cómo Ejecutar Script de Diagnóstico Cloudinary

## 📋 Prerequisitos

### 1. Verificar tu archivo `.env`

Abre `BackZurcher/.env` y asegúrate que `DB_DEPLOY` esté **descomentada**:

```bash
# ✅ CORRECTO (sin # al inicio)
DB_DEPLOY=postgresql://postgres:WxSaryUtlCSMyfquHrFjttNXymIxpuUX@nozomi.proxy.rlwy.net:24166/railway

# ❌ INCORRECTO (con # al inicio)
# DB_DEPLOY=postgresql://postgres:WxSaryUtlCSMyfquHrFjttNXymIxpuUX@nozomi.proxy.rlwy.net:24166/railway
```

### 2. NODE_ENV debe estar en development

```bash
NODE_ENV=development
```

## 🏃 Ejecutar el Script

```powershell
# 1. Ir a la carpeta BackZurcher
cd BackZurcher

# 2. Ejecutar el script (tarda 2-3 minutos)
node src/scripts/check-cloudinary-permits.js
```

## 📊 Salida Esperada

```
🔍 Buscando permits con Cloudinary URLs...
📡 Conectado a: Railway Production ✅

📋 Analizando 347 permits...

⚠️  815 Sentinela Blvd
   ID: caba1f23-cb18-4ca9-b912-653798223624
   - Permit PDF (157 bytes) - contiene ruta local

⚠️  2074 Ribbon Terrace
   ID: f3b2a567-8901-4def-9876-abcdef123456
   - Optional Docs (276 bytes) - contiene ruta local

============================================================
✅ RESUMEN:
   Total permits analizados: 347
   Permits con problemas: 2
   Porcentaje: 0.58%
============================================================

📝 IDs para re-subir:
caba1f23-cb18-4ca9-b912-653798223624
f3b2a567-8901-4def-9876-abcdef123456
```

## ⚠️ Solución de Problemas

### Error: "Cannot find module '../models'"
```bash
# Instalar dependencias si no están
npm install
```

### Error: "Connection refused"
```bash
# Verificar que DB_DEPLOY esté descomentada en .env
# Verificar que la URL de Railway sea correcta
```

### Script se queda "colgado"
```bash
# Es normal, está analizando permits
# Espera 2-3 minutos
# Verás progreso en consola
```

## 🔄 Después del Diagnóstico

Si el script encuentra permits con problemas:

1. **Ve al panel admin** → Works → Busca el trabajo por dirección
2. **Abre WorkDetail** del trabajo
3. **Re-sube el PDF** usando los botones "Replace PDF" o "Replace Optional Docs"
4. **Ejecuta el script nuevamente** para verificar que se corrigió

## 📈 Métricas Saludables

- ✅ **< 5%** de permits con problemas → Sistema saludable
- ⚠️ **5-10%** → Considera re-subida masiva
- 🚨 **> 10%** → Investigar causa raíz (problema en migración)

---

**Última actualización**: 2026-02-12
