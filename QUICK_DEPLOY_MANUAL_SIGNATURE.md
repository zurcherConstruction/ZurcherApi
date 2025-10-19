# ⚡ Quick Deploy Guide - Manual Signature

## 📋 MIGRACIÓN REQUERIDA

**Archivo**: `BackZurcher/migrations/add-manual-signature-fields.js`

## 🚀 COMANDO DE DEPLOY

```bash
# En producción, ejecutar:
node run-migration.js add-manual-signature-fields
```

## ✅ OUTPUT ESPERADO

```
✅ Conexión a PostgreSQL establecida
🚀 Iniciando migración: add-manual-signature-fields...

🔄 Agregando campos para firma manual a Budgets...
✅ Campo signatureMethod agregado a Budgets
✅ Campo manualSignedPdfPath agregado a Budgets
✅ Campo manualSignedPdfPublicId agregado a Budgets
✅ Budgets con SignNow actualizados a signatureMethod=signnow
✅ Budgets legacy actualizados a signatureMethod=legacy
✅ Migración completada: Campos de firma manual agregados

🎉 Migración completada exitosamente!
```

## 📦 CAMBIOS EN BD

### Tabla: `Budgets`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `signatureMethod` | ENUM | 'none' | Método: signnow/manual/legacy/none |
| `manualSignedPdfPath` | VARCHAR(500) | NULL | URL Cloudinary del PDF manual |
| `manualSignedPdfPublicId` | VARCHAR(200) | NULL | Public ID Cloudinary |

## 🔧 NUEVO ENDPOINT

```
POST /budget/:idBudget/upload-manual-signed
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body: file=<PDF_FILE>

Roles permitidos: admin, owner, recept
```

## 📝 CHECKLIST PRE-DEPLOY

- [ ] Backup de BD creado
- [ ] Variables Cloudinary configuradas
- [ ] Código pulled en producción
- [ ] Migración ejecutada
- [ ] Servidor reiniciado
- [ ] Endpoint testeado

## 🆘 ROLLBACK

```sql
ALTER TABLE "Budgets" DROP COLUMN IF EXISTS "signatureMethod";
ALTER TABLE "Budgets" DROP COLUMN IF EXISTS "manualSignedPdfPath";
ALTER TABLE "Budgets" DROP COLUMN IF EXISTS "manualSignedPdfPublicId";
DROP TYPE IF EXISTS "enum_Budgets_signatureMethod";
```

---

**Ver guía completa**: `DEPLOY_MANUAL_SIGNATURE.md`
