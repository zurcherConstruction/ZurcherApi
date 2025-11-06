const { sequelize } = require('../src/data/index.js');
const { QueryTypes } = require('sequelize');

/**
 * Script de verificación: Revisar estado de quantity y unitPrice en SupplierInvoiceItems
 * 
 * Verifica:
 * - Si las columnas existen
 * - Cantidad de items con valores NULL
 * - Cantidad de items con valores = 0
 * - Integridad de datos (quantity * unitPrice = amount)
 */

async function verifyMigration() {
  try {
    console.log('🔍 Verificando estado de SupplierInvoiceItems...\n');

    // 1. Verificar existencia de columnas
    console.log('📋 1. Verificando columnas...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'SupplierInvoiceItems' 
      AND column_name IN ('quantity', 'unitPrice', 'amount')
      ORDER BY column_name
    `);

    console.log('   Columnas encontradas:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });

    const hasQuantity = columns.some(col => col.column_name === 'quantity');
    const hasUnitPrice = columns.some(col => col.column_name === 'unitPrice');

    if (!hasQuantity || !hasUnitPrice) {
      console.log('\n❌ PROBLEMA: Faltan columnas necesarias');
      console.log(`   - quantity: ${hasQuantity ? '✅' : '❌'}`);
      console.log(`   - unitPrice: ${hasUnitPrice ? '✅' : '❌'}`);
      console.log('\n⚠️  Ejecuta la migración primero:');
      console.log('   node migrations/add-quantity-unitprice-to-supplier-invoice-items.js');
      return;
    }

    console.log('   ✅ Todas las columnas necesarias existen\n');

    // 2. Contar items totales
    const [totalCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoiceItems"
    `, { type: QueryTypes.SELECT });

    console.log(`📊 2. Items totales: ${totalCount[0]?.total || 0}\n`);

    if (totalCount[0]?.total === 0) {
      console.log('ℹ️  No hay items en la tabla. Verificación completada.');
      return { success: true, isEmpty: true };
    }

    // 3. Análisis de valores
    console.log('📊 3. Análisis de valores:');
    const analysis = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "quantity" IS NULL THEN 1 END) as nullQuantity,
        COUNT(CASE WHEN "unitPrice" IS NULL THEN 1 END) as nullUnitPrice,
        COUNT(CASE WHEN "quantity" = 0 THEN 1 END) as zeroQuantity,
        COUNT(CASE WHEN "unitPrice" = 0 THEN 1 END) as zeroUnitPrice,
        COUNT(CASE WHEN "quantity" > 0 AND "unitPrice" > 0 THEN 1 END) as validItems
      FROM "SupplierInvoiceItems"
    `, { type: QueryTypes.SELECT });

    const stats = analysis[0] || { total: 0, nullquantity: 0, nullunitprice: 0, zeroquantity: 0, zerounitprice: 0, validitems: 0 };
    console.log(`   - Items con quantity NULL: ${stats.nullquantity || 0}`);
    console.log(`   - Items con unitPrice NULL: ${stats.nullunitprice || 0}`);
    console.log(`   - Items con quantity = 0: ${stats.zeroquantity || 0}`);
    console.log(`   - Items con unitPrice = 0: ${stats.zerounitprice || 0}`);
    console.log(`   - Items válidos (quantity > 0 AND unitPrice > 0): ${stats.validitems || 0}`);

    // 4. Verificar integridad de datos
    console.log('\n🔍 4. Verificando integridad (quantity * unitPrice = amount):');
    const integrityCheck = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE 
          WHEN ABS(("quantity" * "unitPrice") - "amount") > 0.01 
          THEN 1 
        END) as mismatch
      FROM "SupplierInvoiceItems"
      WHERE "quantity" IS NOT NULL AND "unitPrice" IS NOT NULL
    `, { type: QueryTypes.SELECT });

    const integrity = integrityCheck[0] || { total: 0, mismatch: 0 };
    console.log(`   - Items verificados: ${integrity.total || 0}`);
    console.log(`   - Items con descuadre: ${integrity.mismatch || 0}`);

    if ((integrity.mismatch || 0) > 0) {
      console.log('\n⚠️  ADVERTENCIA: Algunos items tienen descuadre en el cálculo');
      console.log('   Esto puede deberse a:');
      console.log('   - Redondeos');
      console.log('   - Items creados manualmente');
      console.log('   - Descuentos aplicados');
    }

    // 5. Muestra de datos
    console.log('\n📋 5. Muestra de items (primeros 5):');
    const sampleItems = await sequelize.query(`
      SELECT 
        "description",
        "quantity",
        "unitPrice",
        "amount",
        ("quantity" * "unitPrice") as calculated
      FROM "SupplierInvoiceItems"
      ORDER BY "createdAt" DESC
      LIMIT 5
    `, { type: QueryTypes.SELECT });

    if (sampleItems.length > 0) {
      sampleItems.forEach((item, index) => {
        console.log(`\n   Item ${index + 1}:`);
        console.log(`   - Descripción: ${item.description}`);
        console.log(`   - Cantidad: ${item.quantity}`);
        console.log(`   - Precio Unit: $${parseFloat(item.unitPrice).toFixed(2)}`);
        console.log(`   - Amount: $${parseFloat(item.amount).toFixed(2)}`);
        console.log(`   - Calculado: $${parseFloat(item.calculated).toFixed(2)}`);
      });
    }

    // 6. Resumen final
    console.log('\n\n✅ VERIFICACIÓN COMPLETADA\n');
    
    const hasIssues = (stats.nullquantity > 0) || (stats.nullunitprice > 0) || (integrity.mismatch > 0);
    
    if (hasIssues) {
      console.log('⚠️  SE ENCONTRARON ALGUNAS ADVERTENCIAS (ver arriba)');
    } else {
      console.log('✅ TODO ESTÁ CORRECTO - No se encontraron problemas');
    }

    return {
      success: true,
      totalItems: stats.total,
      validItems: stats.validitems,
      nullQuantity: stats.nullquantity,
      nullUnitPrice: stats.nullunitprice,
      integrityMismatch: integrity.mismatch,
      hasIssues
    };

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyMigration()
    .then((result) => {
      console.log('\n📊 Resultado:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { verifyMigration };
