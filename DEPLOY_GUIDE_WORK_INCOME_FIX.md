# Guía de Despliegue y Reparación - Fix Work/Income

## 📋 Resumen

Este fix soluciona el problema donde los budgets con pago inicial no generaban Work ni Income automáticamente.

## 🚀 Pasos para Deploy en Producción

### 1. Hacer Commit y Push

```bash
# En tu máquina local
cd BackZurcher

# Verificar cambios
git status

# Agregar archivos modificados
git add src/data/models/Budget.js
git add src/controllers/BudgetController.js
git add fix-missing-works-incomes.js

# Hacer commit
git commit -m "Fix: Work + Income se crean SIEMPRE al cargar pago inicial (sin importar firma)"

# Push a tu rama
git push origin yani58
```

### 2. Merge a Main (si aplica)

```bash
# Si trabajas con pull requests, crea uno en GitHub
# O si haces merge directo:
git checkout main
git merge yani58
git push origin main
```

### 3. Deploy en Railway/Producción

Railway debería hacer deploy automático al detectar cambios en `main`. Si no:

1. Ve a tu dashboard de Railway
2. Selecciona tu servicio backend
3. Click en "Deploy" o espera el auto-deploy
4. Monitorea los logs durante el deploy

---

## 🔧 Reparar Budgets Antiguos (Sin Work/Income)

### Opción 1: Modo Dry-Run (Solo Revisar)

Primero ejecuta en modo dry-run para ver qué budgets se van a reparar **SIN aplicar cambios**:

```bash
# En producción (conectado por SSH o Railway CLI)
cd BackZurcher
node fix-missing-works-incomes.js --dry-run
```

Esto te mostrará:
- Lista de budgets con pago pero sin Work
- Detalles de cada budget (dirección, monto, método, estado)
- Cuántos budgets se repararían

### Opción 2: Ejecutar Reparación Real

Una vez verificado que los budgets listados son correctos:

```bash
# En producción
node fix-missing-works-incomes.js
```

⚠️ **Importante**: El script esperará 5 segundos antes de ejecutar. Presiona `Ctrl+C` para cancelar si algo no se ve bien.

### Qué hace el script:

1. ✅ Busca budgets con `paymentProofAmount` > 0
2. ✅ Verifica si tienen Work asociado
3. ✅ Para los que NO tienen Work, crea:
   - **Work** con el monto del pago inicial
   - **Income** tipo "Factura Pago Inicial Budget"
   - **Receipt** con el comprobante (si existe)

### Ejemplo de Output:

```
🔍 Buscando budgets con pago inicial pero sin Work asociado...

📊 Total de budgets con pago inicial: 45
🔧 Budgets que necesitan reparación: 8

📋 Lista de budgets a reparar:

1. Budget #2289
   Dirección: 123 Main St, Miami FL
   Monto pago: $5400
   Método: Zelle
   Estado: signed
   Fecha carga: 10/28/2025

2. Budget #2291
   Dirección: 456 Oak Ave, Tampa FL
   Monto pago: $3200
   Método: AMEX
   Estado: sent_for_signature
   Fecha carga: 10/29/2025

...

🚀 Iniciando reparación...

📝 Reparando Budget #2289...
   ✅ Work creado: abc123-...
   ✅ Income creado: def456-... - $5400
   ✅ Receipt creado para Income: def456-...
   ✅ Budget #2289 reparado exitosamente

...

============================================================
📊 RESUMEN DE REPARACIÓN
============================================================
✅ Reparados exitosamente: 8
❌ Errores: 0
📋 Total procesados: 8
============================================================
```

---

## 🧪 Verificación Post-Reparación

Después de ejecutar el script, verifica en el sistema:

### 1. Verifica en la BD (Opcional)

```sql
-- Ver budgets con pago y sus works
SELECT 
  b."idBudget",
  b."propertyAddress",
  b."paymentProofAmount",
  b."status",
  w."idWork",
  w."initialPayment"
FROM "Budgets" b
LEFT JOIN "Works" w ON w."idBudget" = b."idBudget"
WHERE b."paymentProofAmount" IS NOT NULL 
  AND b."paymentProofAmount" > 0
ORDER BY b."idBudget" DESC
LIMIT 20;

-- Verificar incomes creados
SELECT 
  i."idIncome",
  i."amount",
  i."typeIncome",
  i."workId",
  w."idBudget"
FROM "Incomes" i
JOIN "Works" w ON w."idWork" = i."workId"
WHERE i."typeIncome" = 'Factura Pago Inicial Budget'
ORDER BY i."createdAt" DESC
LIMIT 20;
```

### 2. Verifica en la UI

1. Ve a la sección de **Works**
2. Busca por las direcciones de los budgets reparados
3. Verifica que aparezcan los works nuevos
4. Abre cada work y verifica:
   - ✅ Tiene el income de pago inicial
   - ✅ El monto es correcto
   - ✅ Tiene el receipt/comprobante adjunto

---

## 📊 Monitoreo de Logs en Producción

Después del deploy, monitorea los logs cuando un usuario cargue un nuevo pago:

```bash
# Railway CLI
railway logs --follow

# O en Railway dashboard > Deployments > Logs
```

Busca estas líneas clave:

```
📊 [uploadInvoice] Procesando creación/actualización de Work + Income...
✅ [uploadInvoice] Work creado: ...
✅ [uploadInvoice] Income creado: ... - $XXXX
Nuevo Receipt creado para Income: ...
```

---

## ⚠️ Troubleshooting

### Problema: El script no encuentra budgets para reparar

**Causa**: Ya se repararon todos o no hay budgets con pago sin Work

**Solución**: Ejecuta en dry-run para verificar

### Problema: Error "Transaction already committed"

**Causa**: Algún error durante la ejecución

**Solución**: El script hace rollback automático. Revisa los logs y vuelve a ejecutar.

### Problema: Receipt no se crea

**Causa**: El URL del comprobante no está en el formato esperado

**Solución**: El script continuará y creará Work + Income. El Receipt se puede agregar manualmente después.

---

## 🔄 Rollback (Si algo falla)

Si después del deploy algo no funciona:

```bash
# Revertir el último commit
git revert HEAD
git push origin main

# O volver a un commit específico
git reset --hard <commit-hash-anterior>
git push origin main --force
```

En Railway, haz redeploy de la versión anterior desde el dashboard.

---

## 📝 Checklist de Deploy

- [ ] Commit y push de los cambios
- [ ] Merge a main (si aplica)
- [ ] Deploy en Railway completado sin errores
- [ ] Logs de producción muestran servidor iniciado correctamente
- [ ] Ejecutar script en modo dry-run
- [ ] Revisar lista de budgets a reparar
- [ ] Ejecutar script de reparación
- [ ] Verificar en UI que los works aparecen
- [ ] Probar carga de nuevo pago inicial
- [ ] Verificar que se crea Work + Income automáticamente
- [ ] Monitorear logs por 24h para detectar errores

---

## 📞 Soporte

Si encuentras algún problema:

1. Revisa los logs del servidor
2. Busca los emojis en los logs (🔍, 📊, ✅, ❌)
3. Verifica que los hooks se están ejecutando
4. Si persiste, revierte el deploy y contacta al equipo de desarrollo
