# 🚀 Migración de PDFs de Permit a Cloudinary

## 📋 Problema Identificado

Los PDFs almacenados como BLOB en PostgreSQL (`pdfData`, `optionalDocs`) causaban:
- ⏱️ **Queries de 5-6 segundos** (vs esperado ~200ms)
- 📦 **Respuestas de 13-22 MB** causando timeouts
- 💥 **Errores 500 en frontend** al cargar obras

## ✅ Solución Implementada

Migrar PDFs a Cloudinary y almacenar solo URLs en la BD.

### Cambios Realizados

1. **Modelo Permit.js**: Agregadas columnas para URLs de Cloudinary
   - `permitPdfUrl` - URL del PDF principal
   - `permitPdfPublicId` - Public ID para eliminación
   - `optionalDocsUrl` - URL de docs opcionales
   - `optionalDocsPublicId` - Public ID de docs opcionales

2. **WorkController.js**: Actualizadas queries para usar URLs
   - `getWorkById()` - Incluye URLs, excluye BLOBs
   - `updateWork()` - Incluye URLs, excluye BLOBs
   - `addImagesToWork()` - Incluye URLs, excluye BLOBs

3. **Scripts de Migración**:
   - `add-permit-cloudinary-columns.js` - Agrega columnas nuevas
   - `migrate-permits-to-cloudinary.js` - Sube PDFs y actualiza registros

## 🔧 Pasos para Ejecutar Migración

### DESARROLLO (Probar primero)

```powershell
# 1. Backup de BD de desarrollo
node auto-backup.js

# 2. Agregar columnas nuevas
node add-permit-cloudinary-columns.js

# 3. Ejecutar migración
node migrate-permits-to-cloudinary.js

# 4. Verificar que las URLs funcionan
# Revisar en frontend que los PDFs cargan correctamente

# 5. Si todo funciona, eliminar BLOBs (OPCIONAL)
# Esperar 1-2 semanas antes de eliminar por seguridad
```

### PRODUCCIÓN (Después de probar en dev)

```bash
# 1. Backup COMPLETO de producción
./backup-production.sh

# 2. Conectarse a producción
ssh usuario@servidor-produccion

# 3. Agregar columnas
NODE_ENV=production node add-permit-cloudinary-columns.js

# 4. Ejecutar migración (puede tardar según cantidad de permits)
NODE_ENV=production node migrate-permits-to-cloudinary.js

# 5. Reiniciar servidor
pm2 restart BackZurcher
```

## 📊 Resultados Esperados

**ANTES:**
```
⏱️ Query time: 5716ms
📦 Response size: 13,426,337 bytes (13.4 MB)
❌ Status: 500 (timeout/error)
```

**DESPUÉS:**
```
⏱️ Query time: ~200-500ms
📦 Response size: ~100-500 KB
✅ Status: 200 (success)
```

## 🔍 Verificación Post-Migración

1. **Probar carga de obra en frontend**:
   - Abrir detalle de obra
   - Verificar que PDFs cargan correctamente
   - Confirmar tiempo de carga < 1 segundo

2. **Revisar logs del script**:
   ```
   ✅ Migrados:  X permits
   ⏭️  Omitidos:   Y permits
   ❌ Errores:    0 (debe ser 0)
   ```

3. **Verificar Cloudinary**:
   - Ir a dashboard de Cloudinary
   - Verificar carpeta `permits/` con PDFs subidos
   - Confirmar URLs accesibles

## ⚠️ Rollback (Si algo sale mal)

```powershell
# 1. Restaurar BD desde backup
# (usar backup creado en paso 1)

# 2. Revertir cambios en código
git revert <commit-hash>

# 3. Reiniciar servidor
pm2 restart BackZurcher
```

## 🗑️ Limpieza Final (OPCIONAL - Después de 2 semanas)

Una vez confirmado que todo funciona, eliminar columnas BLOB:

```sql
-- ⚠️ SOLO DESPUÉS DE CONFIRMAR QUE TODO FUNCIONA
ALTER TABLE "Permits" DROP COLUMN "pdfData";
ALTER TABLE "Permits" DROP COLUMN "optionalDocs";
```

También actualizar modelo Permit.js eliminando estas líneas:

```javascript
// Eliminar estas líneas después de confirmar migración exitosa
pdfData: {
  type: DataTypes.BLOB,
  allowNull: true,
},
optionalDocs: {
  type: DataTypes.BLOB, 
  allowNull: true,
},
```

## 📝 Notas Importantes

- **NO eliminar BLOBs inmediatamente**: Mantener 1-2 semanas como backup
- **Cloudinary tiene límite**: Verificar plan y uso de almacenamiento
- **Notificar a equipo**: Coordinar ventana de mantenimiento para producción
- **Monitorear rendimiento**: Comparar tiempos antes/después

## 🆘 Soporte

Si encuentras errores durante la migración:
1. NO continuar con producción
2. Revisar logs del script
3. Verificar credenciales de Cloudinary en `.env`
4. Contactar al equipo de desarrollo
