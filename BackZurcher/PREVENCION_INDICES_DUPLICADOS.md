# 🔧 GUÍA: Prevención de Índices Duplicados

## ⚠️ PROBLEMA IDENTIFICADO

El servidor estaba creando **2,195 constraints duplicadas** cada vez que se reiniciaba porque:

```env
DB_SYNC_ALTER=true  # ❌ ESTO causaba el problema
```

Cada reinicio ejecutaba `sequelize.sync({ alter: true })`, que intentaba crear constraints UNIQUE. Como ya existían, PostgreSQL creaba duplicados con números incrementales.

---

## ✅ SOLUCIÓN APLICADA

Se cambió la configuración a:

```env
DB_SYNC_ALTER=false      # No modificar estructura en cada reinicio
ENABLE_DB_SYNC=false     # No ejecutar sync() en absoluto
```

---

## 📋 CUÁNDO USAR CADA CONFIGURACIÓN

### **Desarrollo Normal (día a día):**
```env
DB_SYNC_ALTER=false
ENABLE_DB_SYNC=false
```
✅ Inicio rápido del servidor
✅ No crea duplicados
✅ Base de datos estable

### **Cuando cambias un modelo Sequelize:**
```env
DB_SYNC_ALTER=true
ENABLE_DB_SYNC=true
```
⚠️ Solo temporalmente
⚠️ Reinicia una vez
⚠️ Vuelve a poner false

### **Producción (SIEMPRE):**
```env
DB_SYNC_ALTER=false
ENABLE_DB_SYNC=false
```
🔒 NUNCA usar alter en producción
🔒 Usar migraciones manuales
🔒 Control total del esquema

---

## 🔍 VERIFICAR QUE NO SE CREAN DUPLICADOS

### **Script de Monitoreo:**

Ejecuta este script después de cada reinicio del servidor:

```bash
node check-duplicates.js
```

**Archivo:** `check-duplicates.js`
```javascript
const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: \`postgresql://\${DB_USER}:\${DB_PASSWORD}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}\`
});

async function checkDuplicates() {
  await client.connect();
  
  const result = await client.query(\`
    SELECT COUNT(*) as total
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
      AND table_name = 'Permits'
      AND constraint_type = 'UNIQUE'
      AND (
        constraint_name ~ '^Permits_permitNumber_key[0-9]+$'
        OR constraint_name ~ '^Permits_propertyAddress_key[0-9]+$'
      );
  \`);
  
  const duplicates = parseInt(result.rows[0].total);
  
  if (duplicates > 0) {
    console.log(\`⚠️  ALERTA: \${duplicates} constraints duplicadas detectadas!\`);
    console.log(\`   Verifica que DB_SYNC_ALTER=false en .env\`);
  } else {
    console.log('✅ No hay constraints duplicadas');
  }
  
  await client.end();
}

checkDuplicates();
```

---

## 🚀 PARA PRODUCCIÓN

### **1. Verificar variables de entorno:**

Asegúrate que el servidor de producción tenga:

```env
DB_SYNC_ALTER=false
ENABLE_DB_SYNC=false
NODE_ENV=production
```

### **2. Limpiar duplicados existentes:**

Si producción ya tiene duplicados:

```bash
# Modificar clean-constraints-safe.js para producción:
const connectionString = DB_DEPLOY; // Línea 4

# Ejecutar en horario de bajo tráfico:
node clean-constraints-safe.js
```

### **3. Monitorear después del deploy:**

```bash
node check-duplicates.js
```

---

## 📊 IMPACTO DE LA OPTIMIZACIÓN

### **ANTES (con DB_SYNC_ALTER=true):**
- ❌ Cada reinicio: +2 constraints duplicadas
- ❌ Servidor local reiniciado 1,000+ veces = 2,195 duplicados
- ❌ Performance degradado progresivamente

### **DESPUÉS (con DB_SYNC_ALTER=false):**
- ✅ Reinicios ilimitados sin duplicados
- ✅ Performance constante
- ✅ Base de datos limpia y optimizada

---

## 🔧 CAMBIOS EN MODELOS

Si necesitas cambiar un modelo (agregar/modificar columnas):

### **Opción 1: Temporal con sync (desarrollo):**
```bash
# 1. Cambiar .env
DB_SYNC_ALTER=true
ENABLE_DB_SYNC=true

# 2. Reiniciar servidor UNA VEZ
npm run dev

# 3. Volver a poner
DB_SYNC_ALTER=false
ENABLE_DB_SYNC=false

# 4. Verificar que no se crearon duplicados
node check-duplicates.js
```

### **Opción 2: Migración manual (producción):**
```sql
-- Crear script SQL manual
ALTER TABLE "TableName" ADD COLUMN "newColumn" VARCHAR(255);

-- Ejecutar directamente en la base de datos
psql -U user -d database -f migration.sql
```

---

## ✅ CHECKLIST DE PREVENCIÓN

- [ ] `.env` tiene `DB_SYNC_ALTER=false`
- [ ] `.env` tiene `ENABLE_DB_SYNC=false`
- [ ] Producción tiene las mismas configuraciones
- [ ] Script `check-duplicates.js` creado
- [ ] Documentación compartida con el equipo

---

## 📞 SOPORTE

Si detectas duplicados nuevamente:

1. Verificar `.env` tiene las variables correctas
2. Ejecutar `node check-duplicates.js` para confirmar
3. Si hay duplicados, ejecutar `node clean-constraints-safe.js`
4. Investigar qué causó la creación (¿alguien cambió el .env?)

---

**Fecha:** 25 de Noviembre, 2025
**Optimización aplicada por:** GitHub Copilot
**Estado:** ✅ Completado
