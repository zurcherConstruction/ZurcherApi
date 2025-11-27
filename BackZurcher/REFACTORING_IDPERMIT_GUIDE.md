# 🔧 GUÍA DE REFACTORING: propertyAddress → idPermit

## 📋 RESUMEN

**Objetivo:** Cambiar la Foreign Key entre Works y Permits de `propertyAddress` (TEXT) a `idPermit` (INTEGER)

**Beneficios:**
- ✅ Mejora performance (índices en INTEGER son más eficientes)
- ✅ Mejor integridad referencial
- ✅ Previene problemas con direcciones duplicadas/modificadas
- ✅ Estándar de base de datos (usar IDs, no datos de negocio)

---

## 🚀 EJECUCIÓN DE LA MIGRACIÓN

### **DESARROLLO (PRIMERO):**

```bash
cd BackZurcher
node migrations/migrate-to-idPermit.js
```

**Duración:** ~2-3 segundos  
**Espera:** 5 segundos antes de ejecutar

### **PRODUCCIÓN (DESPUÉS):**

```bash
cd BackZurcher
node migrations/migrate-to-idPermit.js --production
```

**Duración:** ~10-20 segundos (dependiendo de cantidad de Works)  
**Espera:** 15 segundos antes de ejecutar

---

## 📝 CAMBIOS EN EL CÓDIGO

### **1. Models - Works.js**

**ANTES:**
```javascript
Works.belongsTo(Permits, {
  foreignKey: 'propertyAddress',
  targetKey: 'propertyAddress',
  as: 'permit'
});
```

**DESPUÉS:**
```javascript
Works.belongsTo(Permits, {
  foreignKey: 'idPermit',
  targetKey: 'idPermit',
  as: 'permit'
});
```

---

### **2. Models - Permits.js**

**ANTES:**
```javascript
Permits.hasMany(Works, {
  foreignKey: 'propertyAddress',
  sourceKey: 'propertyAddress',
  as: 'works'
});
```

**DESPUÉS:**
```javascript
Permits.hasMany(Works, {
  foreignKey: 'idPermit',
  sourceKey: 'idPermit',
  as: 'works'
});
```

---

### **3. Controllers - worksController.js**

#### **Crear Work:**

**ANTES:**
```javascript
const newWork = await Works.create({
  propertyAddress: permitData.propertyAddress,
  // ... otros campos
});
```

**DESPUÉS:**
```javascript
const newWork = await Works.create({
  idPermit: permitData.idPermit,
  propertyAddress: permitData.propertyAddress, // mantener por compatibilidad
  // ... otros campos
});
```

---

#### **Buscar Works con Permit:**

**ANTES:**
```javascript
const works = await Works.findAll({
  where: { propertyAddress: req.params.address },
  include: [{
    model: Permits,
    as: 'permit'
  }]
});
```

**DESPUÉS:**
```javascript
const works = await Works.findAll({
  where: { propertyAddress: req.params.address }, // o usar idPermit si lo tienes
  include: [{
    model: Permits,
    as: 'permit'
  }]
});
```

**NOTA:** Las búsquedas por `propertyAddress` siguen funcionando, solo cambia la FK interna.

---

#### **Actualizar Work:**

**ANTES:**
```javascript
await work.update({
  propertyAddress: newPermit.propertyAddress
});
```

**DESPUÉS:**
```javascript
await work.update({
  idPermit: newPermit.idPermit,
  propertyAddress: newPermit.propertyAddress // sincronizar ambos
});
```

---

### **4. Routes - worksRoutes.js**

**No requiere cambios** - Las rutas siguen funcionando igual.

---

### **5. Frontend - Redux Actions**

**ANTES:**
```javascript
const workData = {
  propertyAddress: permitData.propertyAddress,
  // ...
};
```

**DESPUÉS:**
```javascript
const workData = {
  idPermit: permitData.idPermit,
  propertyAddress: permitData.propertyAddress, // mantener por compatibilidad
  // ...
};
```

---

### **6. Frontend - Components**

**ANTES:**
```javascript
// Buscar permit por address
const permit = permits.find(p => p.propertyAddress === work.propertyAddress);
```

**DESPUÉS:**
```javascript
// Buscar permit por ID (más eficiente)
const permit = permits.find(p => p.idPermit === work.idPermit);
```

---

## ✅ VERIFICACIÓN POST-MIGRACIÓN

### **1. Verificar FK:**

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'Works'
  AND constraint_name IN ('Works_propertyAddress_fkey', 'Works_idPermit_fkey');
```

**Resultado esperado:**
```
Works_idPermit_fkey | FOREIGN KEY
```

**NO debe aparecer:** `Works_propertyAddress_fkey`

---

### **2. Verificar datos:**

```sql
SELECT 
  COUNT(*) FILTER (WHERE "idPermit" IS NOT NULL) as con_permit,
  COUNT(*) FILTER (WHERE "idPermit" IS NULL) as sin_permit,
  COUNT(*) as total
FROM "Works";
```

**Resultado esperado:**
```
con_permit | sin_permit | total
-----------+------------+-------
     150   |     0      |  150
```

**Todos** los Works deben tener `idPermit` poblado.

---

### **3. Verificar joins:**

```sql
SELECT w."idWork", w."propertyAddress", w."idPermit", p."permitNumber"
FROM "Works" w
JOIN "Permits" p ON w."idPermit" = p."idPermit"
LIMIT 5;
```

**Debe retornar** Works con sus Permits correctamente vinculados.

---

## 🔄 COMPATIBILIDAD HACIA ATRÁS

### **Mantener propertyAddress por ahora:**

- ✅ **NO eliminar** la columna `propertyAddress` de Works
- ✅ **Seguir poblando** ambos campos (`idPermit` + `propertyAddress`)
- ✅ **Permitir búsquedas** por address (usuarios buscan por dirección)
- ✅ **Sincronizar** ambos campos en updates

### **Eliminar propertyAddress después de:**

1. 2-4 semanas en producción sin problemas
2. Verificar que toda la funcionalidad usa `idPermit`
3. Revisar que no hay código legacy dependiendo de la FK antigua
4. Actualizar índices/queries que usan `propertyAddress`

---

## 📊 ORDEN DE EJECUCIÓN COMPLETO

### **FASE 2A: Migración de Base de Datos**

1. ✅ **Desarrollo:**
   ```bash
   node migrations/migrate-to-idPermit.js
   ```

2. ✅ **Verificar desarrollo:**
   ```bash
   # Verificar FK nueva existe
   # Verificar datos poblados
   ```

3. ✅ **Producción:**
   ```bash
   node migrations/migrate-to-idPermit.js --production
   ```

4. ✅ **Verificar producción:**
   ```bash
   # Mismo proceso que desarrollo
   ```

---

### **FASE 2B: Actualizar Código**

1. ✅ **Backend Models:**
   - Works.js (asociación)
   - Permits.js (asociación)

2. ✅ **Backend Controllers:**
   - worksController.js (create, update, queries)

3. ✅ **Frontend Redux:**
   - worksActions.js (createWork, updateWork)

4. ✅ **Frontend Components:**
   - WorkForm.jsx (usar idPermit)
   - WorkDetail.jsx (buscar por idPermit)

5. ✅ **Testing:**
   - Crear work
   - Editar work
   - Buscar works
   - Ver detalle de work con permit

---

## 🚨 ROLLBACK (Si algo falla)

### **Revertir migración:**

```sql
-- 1. Eliminar FK nueva
ALTER TABLE "Works" DROP CONSTRAINT IF EXISTS "Works_idPermit_fkey";

-- 2. Recrear FK antigua
ALTER TABLE "Works" 
ADD CONSTRAINT "Works_propertyAddress_fkey" 
FOREIGN KEY ("propertyAddress") 
REFERENCES "Permits" ("propertyAddress")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 3. Eliminar columna idPermit (OPCIONAL - solo si es necesario)
ALTER TABLE "Works" DROP COLUMN IF EXISTS "idPermit";
```

### **Revertir código:**

```bash
git checkout HEAD -- src/models/Works.js
git checkout HEAD -- src/models/Permits.js
git checkout HEAD -- src/controllers/worksController.js
# ... etc
```

---

## 📈 MEJORAS DE PERFORMANCE ESPERADAS

### **Antes (FK en TEXT):**
```sql
SELECT * FROM "Works" 
JOIN "Permits" ON "Works"."propertyAddress" = "Permits"."propertyAddress"
WHERE "Works"."propertyAddress" = '123 Main St';
```
**Tiempo:** ~50-100ms (índice en TEXT)

### **Después (FK en INTEGER):**
```sql
SELECT * FROM "Works" 
JOIN "Permits" ON "Works"."idPermit" = "Permits"."idPermit"
WHERE "Works"."idPermit" = 42;
```
**Tiempo:** ~10-20ms (índice en INTEGER)

**Mejora:** ~80% más rápido en joins

---

## 🎯 CHECKLIST FINAL

- [ ] Migración ejecutada en desarrollo
- [ ] Migración verificada en desarrollo
- [ ] Código actualizado (backend models)
- [ ] Código actualizado (backend controllers)
- [ ] Código actualizado (frontend)
- [ ] Testing local completo
- [ ] Migración ejecutada en producción
- [ ] Migración verificada en producción
- [ ] Deploy de código nuevo
- [ ] Verificación funcional en producción
- [ ] Monitoreo 24-48h
- [ ] Eliminar FK antigua después de 2 semanas (opcional)
- [ ] Eliminar columna propertyAddress después de 4 semanas (opcional)

---

## 💡 NOTAS IMPORTANTES

1. **La migración NO elimina datos** - Solo agrega columna y cambia FK
2. **propertyAddress se mantiene** - Compatibilidad hacia atrás
3. **Ejecución rápida** - ~10-20 segundos en producción
4. **Sin downtime** - La migración se ejecuta con la app corriendo
5. **Rollback disponible** - Fácil revertir si hay problemas

---

## 📞 SOPORTE

Si algo falla durante la migración:

1. **NO PANIC** - La migración tiene rollback
2. Revisar logs del script de migración
3. Verificar que la FK antigua aún existe
4. Ejecutar rollback SQL si es necesario
5. Revisar este documento para troubleshooting

---

**Última actualización:** 26 de Noviembre, 2025
