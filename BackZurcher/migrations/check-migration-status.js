/*# 🚀 PLAN DE DEPLOYMENT ESPECÍFICO PARA RAILWAY

## 📊 Situación Actual

### ✅ Completado:
- Backup hecho en Railway
- Migraciones anteriores aplicadas en producción
- Cambios de código listos en rama `yani38`

### ❌ Pendiente:
- Aplicar migración `add-invoice-number-to-budgets.js` en producción
- Hacer deployment de nuevos cambios de código

---

## 🎯 PLAN DE EJECUCIÓN (30 minutos)

### **FASE 1: Seguridad y Preparación (5 min)**

#### 1.1 Descargar Backup Actual de Railway

**Opción A: Desde Railway CLI** (Recomendado)
```bash
# Instalar Railway CLI (si no la tienes)
npm install -g @railway/cli

# Login
railway login

# En la carpeta del proyecto
cd BackZurcher

# Crear carpeta de backups
mkdir -p backups

# Obtener DATABASE_URL y hacer backup
railway variables | grep DATABASE_URL

# Conectar y hacer backup
railway run pg_dump \$DATABASE_URL > backups/pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Verificar que se creó
ls -lh backups/
```

**Opción B: Desde Railway Dashboard**
```
1. Ve a https://railway.app
2. Proyecto -> PostgreSQL Service
3. Data/Backups tab
4. Download más reciente
5. Guardar en BackZurcher/backups/
```

#### 1.2 Verificar Estado Actual de Producción
```bash
# Conectar a Railway DB
railway run node migrations/check-migration-status.js
```

Vamos a crear este script de verificación:

<function_calls>
<invoke name="create_file">
<parameter name="content">/**
 * 🔍 Script para verificar estado de migraciones en la base de datos
 * 
 * Verifica qué columnas existen y qué migraciones faltan aplicar
 */

const { conn } = require('../src/data');
const { QueryTypes } = require('sequelize');

async function checkMigrationStatus() {
  try {
    console.log('🔍 Verificando estado de migraciones en la base de datos...\n');

    // 1. Verificar columnas de Budget
    console.log('📋 COLUMNAS DE LA TABLA BUDGETS:');
    console.log('─'.repeat(80));
    
    const budgetColumns = await conn.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'Budgets'
      ORDER BY ordinal_position
    `, { type: QueryTypes.SELECT });

    budgetColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓ NULL' : '✗ NOT NULL';
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}`);
    });

    console.log('\n');

    // 2. Verificar columnas específicas que necesitamos
    console.log('🎯 VERIFICACIÓN DE COLUMNAS CRÍTICAS:');
    console.log('─'.repeat(80));

    const criticalColumns = [
      'invoiceNumber',
      'convertedToInvoiceAt',
      'paymentInvoice',
      'paymentProofAmount',
      'paymentProofMethod',
      'paymentProofType'
    ];

    for (const colName of criticalColumns) {
      const exists = budgetColumns.find(c => c.column_name === colName);
      if (exists) {
        console.log(`  ✅ ${colName.padEnd(30)} EXISTE`);
      } else {
        console.log(`  ❌ ${colName.padEnd(30)} FALTA - NECESITA MIGRACIÓN`);
      }
    }

    console.log('\n');

    // 3. Verificar datos de ejemplo
    console.log('📊 DATOS DE EJEMPLO (primeros 5 budgets):');
    console.log('─'.repeat(80));

    const sampleBudgets = await conn.query(`
      SELECT 
        "idBudget",
        "invoiceNumber",
        "status",
        "paymentInvoice" IS NOT NULL as "hasPayment",
        "convertedToInvoiceAt"
      FROM "Budgets"
      ORDER BY "idBudget" DESC
      LIMIT 5
    `, { type: QueryTypes.SELECT });

    console.table(sampleBudgets);

    // 4. Estadísticas
    console.log('\n📈 ESTADÍSTICAS:');
    console.log('─'.repeat(80));

    const stats = await conn.query(`
      SELECT 
        COUNT(*) as total_budgets,
        COUNT("invoiceNumber") as with_invoice_number,
        COUNT("paymentInvoice") as with_payment,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
      FROM "Budgets"
    `, { type: QueryTypes.SELECT });

    console.log(`  Total de Budgets: ${stats[0].total_budgets}`);
    console.log(`  Con Invoice Number: ${stats[0].with_invoice_number}`);
    console.log(`  Con Comprobante de Pago: ${stats[0].with_payment}`);
    console.log(`  En estado 'approved': ${stats[0].approved_count}`);

    console.log('\n');

    // 5. Determinar qué migraciones faltan
    console.log('🚨 MIGRACIONES PENDIENTES:');
    console.log('─'.repeat(80));

    const missingColumns = criticalColumns.filter(
      colName => !budgetColumns.find(c => c.column_name === colName)
    );

    if (missingColumns.length === 0) {
      console.log('  ✅ Todas las migraciones críticas están aplicadas');
    } else {
      console.log('  ❌ Faltan las siguientes migraciones:');
      missingColumns.forEach(col => {
        if (col === 'invoiceNumber' || col === 'convertedToInvoiceAt') {
          console.log(`     - add-invoice-number-to-budgets.js (${col})`);
        } else if (col.startsWith('paymentProof')) {
          console.log(`     - add-payment-proof-method.js (${col})`);
        }
      });
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error al verificar migraciones:', error);
    throw error;
  } finally {
    await conn.close();
  }
}

// Ejecutar verificación
checkMigrationStatus()
  .then(() => {
    console.log('✅ Script de verificación finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
