# 🚀 GUÍA DE DEPLOY - Sistema de Firmas Mejorado

## ✅ Cambios Implementados

### 1. **Cron Job Mejorado** (cada 30 minutos)
- Busca presupuestos con `signNowDocumentId` que NO estén en estado `signed`
- Ahora actualiza correctamente el campo `signatureMethod: 'signnow'`
- Descarga automáticamente PDFs firmados a Cloudinary

### 2. **Soporte para Firmas Manuales**
- Nuevo endpoint: `POST /budget/:id/upload-manual-signed`
- Nuevo endpoint: `GET /budget/:id/view-manual-signed` (proxy de Cloudinary)
- Badge visual en EditBudget cuando ya existe PDF manual
- Botón "Reemplazar PDF" para actualizar firmas manuales

### 3. **Visualización Unificada en BudgetList**
- PDFs manuales: usa proxy del backend
- PDFs de SignNow: usa `/view-signed`
- PDFs sin firma: regenera desde `/preview`
- **NO regenera PDFs** si ya están firmados (manual o SignNow)

### 4. **Badges en GestionBudgets**
- ✍️ SignNow (azul)
- 📄 Manual (verde)
- 🏷️ Legacy (naranja)
- ⚪ Sin Firmar (gris)

---

## 📋 PASOS PARA EL DEPLOY

### Paso 1: Deploy del Código
```bash
# En tu servidor de producción
cd /ruta/a/BackZurcher
git pull origin yani48
npm install  # Por si hay nuevas dependencias
```

### Paso 2: Ejecutar Migración (UNA SOLA VEZ)
```bash
# Corregir todos los presupuestos firmados con SignNow que tienen signatureMethod incorrecto
node migrations/migrate-signnow-signature-methods.js
```

Esta migración:
- ✅ Encuentra presupuestos con `signNowDocumentId` + `status: signed` + `signatureMethod: none/null`
- ✅ Los actualiza a `signatureMethod: 'signnow'`
- ✅ Muestra resumen de cambios antes de aplicar
- ✅ Verifica resultados después de actualizar

### Paso 3: Reiniciar Backend
```bash
# Reiniciar el servidor
pm2 restart zurcher-api
# O si usas otro proceso manager:
npm run dev  # desarrollo
npm start    # producción
```

### Paso 4: Verificar Cron Job
```bash
# Ver logs para confirmar que el cron job funciona
pm2 logs zurcher-api --lines 50
# Buscar esta línea:
# ✅ Cron job para verificar firmas de SignNow programado para ejecutarse cada 30 minutos.
```

### Paso 5: Probar Manualmente (Opcional)
```bash
# Ejecutar verificación de firmas manualmente para confirmar
node test-signature-check.js
```

---

## 🔍 VERIFICACIONES POST-DEPLOY

### ✅ Verificar que el Cron Job funciona:
1. Envía un presupuesto a SignNow
2. Firma el presupuesto en SignNow
3. Espera máximo 30 minutos
4. Verifica que el presupuesto:
   - Cambió a `status: 'signed'`
   - Tiene `signatureMethod: 'signnow'`
   - Tiene `signedPdfPath` con URL de Cloudinary

### ✅ Verificar Firma Manual:
1. Ve a EditBudget de cualquier presupuesto
2. Click en "Subir Presupuesto Firmado (PDF)"
3. Sube un PDF de prueba
4. Verifica que aparece badge verde "✓ PDF Firmado Manual Cargado"
5. Verifica que el presupuesto:
   - Tiene `signatureMethod: 'manual'`
   - Tiene `manualSignedPdfPath` con URL de Cloudinary

### ✅ Verificar Visualización:
1. Ve a BudgetList
2. Click en el ojo (👁️) de un presupuesto firmado
3. Debe abrir modal con PDF (no descargar)
4. Verifica 3 tipos:
   - Manual → usa proxy del backend
   - SignNow → usa `/view-signed`
   - Sin firma → regenera desde `/preview`

---

## 🐛 TROUBLESHOOTING

### Problema: "Este presupuesto no tiene un PDF firmado disponible"
**Causa**: El presupuesto tiene `signatureMethod: 'none'` en lugar de `'signnow'`
**Solución**: Ejecuta la migración del Paso 2

### Problema: PDF se descarga en lugar de mostrarse en modal
**Causa**: Cloudinary está sirviendo con `Content-Disposition: attachment`
**Solución**: Ya implementado - usamos proxy del backend que fuerza `inline`

### Problema: Cron job no encuentra presupuestos firmados
**Causa**: Los presupuestos ya tienen `status: 'signed'` y el cron los excluye
**Solución**: Es correcto - el cron solo busca presupuestos pendientes

### Problema: Presupuesto firmado en SignNow pero no se actualiza
**Pasos**:
1. Verifica que el presupuesto tiene `signNowDocumentId`
2. Verifica que `status !== 'signed'`
3. Verifica que `signatureMethod === 'signnow'`
4. Ejecuta manualmente: `node test-signature-check.js`
5. Revisa logs del backend para errores de SignNow API

---

## 📊 SCRIPTS ÚTILES

### Verificar estado de un presupuesto específico:
```bash
# Editar check-budget-2284.js y cambiar el ID
node check-budget-2284.js
```

### Ejecutar verificación de firmas manualmente:
```bash
node test-signature-check.js
```

### Ver logs del cron job en tiempo real:
```bash
pm2 logs zurcher-api --lines 100 | grep "CRON JOB"
```

---

## 🎯 RESUMEN

### Lo que se actualizó automáticamente:
- ✅ Cron job ahora actualiza `signatureMethod: 'signnow'`
- ✅ Frecuencia del cron: cada 30 minutos (antes 2 horas)
- ✅ Descarga automática a Cloudinary

### Lo que debes hacer MANUALMENTE en el deploy:
1. ✅ Ejecutar migración: `node migrations/migrate-signnow-signature-methods.js`
2. ✅ Reiniciar backend
3. ✅ Verificar cron job en logs
4. ✅ Probar firma manual en frontend
5. ✅ Probar visualización en BudgetList

### De ahora en adelante (automático):
- ✅ Presupuestos firmados se detectan cada 30 minutos
- ✅ Se actualiza correctamente `signatureMethod: 'signnow'`
- ✅ PDF se descarga automáticamente a Cloudinary
- ✅ Notificaciones se envían cuando se firma

---

## 📝 NOTAS IMPORTANTES

1. **Migración**: Ejecutar **UNA SOLA VEZ** en producción
2. **Cron Job**: Se ejecuta automáticamente cada 30 minutos
3. **Cloudinary**: Asegúrate de tener espacio suficiente para los PDFs firmados
4. **SignNow API**: Los documentos firmados permanecen 30 días en SignNow antes de archivarse

---

¿Alguna duda sobre el proceso de deploy? 🚀
