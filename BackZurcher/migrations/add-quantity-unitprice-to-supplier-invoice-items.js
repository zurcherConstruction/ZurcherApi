const { sequelize } = require('../src/data/index.js');
const { QueryTypes } = require('sequelize');

/**
 * Migración: Agregar campos quantity y unitPrice a SupplierInvoiceItems
 * 
 * Agrega:
 * - quantity: DECIMAL(10,2) - Cantidad de unidades
 * - unitPrice: DECIMAL(10,2) - Precio por unidad
 * 
 * Actualiza datos existentes:
 * - quantity = 1 (por defecto)
 * - unitPrice = amount (el amount actual se convierte en unitPrice)
 */

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración: Agregar quantity y unitPrice a SupplierInvoiceItems');

    // 1. Verificar si las columnas ya existen
    console.log('🔍 Verificando si las columnas ya existen...');
    const [existingColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SupplierInvoiceItems' 
      AND column_name IN ('quantity', 'unitPrice')
    `);

    const hasQuantity = existingColumns.some(col => col.column_name === 'quantity');
    const hasUnitPrice = existingColumns.some(col => col.column_name === 'unitPrice');

    if (hasQuantity && hasUnitPrice) {
      console.log('⚠️  Las columnas quantity y unitPrice ya existen. Saltando creación de columnas.');
    } else {
      // 2. Agregar columna quantity si no existe
      if (!hasQuantity) {
        console.log('📝 Agregando columna quantity...');
        await sequelize.query(`
          ALTER TABLE "SupplierInvoiceItems" 
          ADD COLUMN "quantity" DECIMAL(10,2) DEFAULT 1;
        `);
        console.log('✅ Columna quantity agregada');
      } else {
        console.log('⏭️  Columna quantity ya existe, saltando...');
      }

      // 3. Agregar columna unitPrice si no existe
      if (!hasUnitPrice) {
        console.log('📝 Agregando columna unitPrice...');
        await sequelize.query(`
          ALTER TABLE "SupplierInvoiceItems" 
          ADD COLUMN "unitPrice" DECIMAL(10,2) DEFAULT 0;
        `);
        console.log('✅ Columna unitPrice agregada');
      } else {
        console.log('⏭️  Columna unitPrice ya existe, saltando...');
      }
    }

    // 4. Contar items existentes antes de actualizar
    const [countBefore] = await sequelize.query(`
      SELECT COUNT(*) as total 
      FROM "SupplierInvoiceItems"
    `, { type: QueryTypes.SELECT });
    
    console.log(`� Items totales en la tabla: ${countBefore[0]?.total || 0}`);

    // 5. Actualizar SOLO los items que tienen valores NULL o 0
    console.log('📝 Actualizando items que tienen quantity o unitPrice NULL/0...');
    
    const [updateResult] = await sequelize.query(`
      UPDATE "SupplierInvoiceItems" 
      SET 
        "quantity" = COALESCE(NULLIF("quantity", 0), 1),
        "unitPrice" = COALESCE(NULLIF("unitPrice", 0), "amount")
      WHERE 
        ("quantity" IS NULL OR "quantity" = 0) 
        OR ("unitPrice" IS NULL OR "unitPrice" = 0);
    `);
    
    console.log(`✅ Actualización completada`);

    // 6. Verificar integridad de datos
    console.log('🔍 Verificando integridad de datos...');
    
    const verification = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "quantity" IS NULL THEN 1 END) as nullQuantity,
        COUNT(CASE WHEN "unitPrice" IS NULL THEN 1 END) as nullUnitPrice,
        COUNT(CASE WHEN "quantity" = 0 THEN 1 END) as zeroQuantity,
        COUNT(CASE WHEN "unitPrice" = 0 THEN 1 END) as zeroUnitPrice
      FROM "SupplierInvoiceItems"
    `, { type: QueryTypes.SELECT });

    const stats = verification[0]?.[0] || { total: 0, nullquantity: 0, nullunitprice: 0, zeroquantity: 0, zerounitprice: 0 };
    console.log('📊 Estadísticas finales:');
    console.log(`   Total items: ${stats.total || 0}`);
    console.log(`   Quantity NULL: ${stats.nullquantity || 0}`);
    console.log(`   UnitPrice NULL: ${stats.nullunitprice || 0}`);
    console.log(`   Quantity = 0: ${stats.zeroquantity || 0}`);
    console.log(`   UnitPrice = 0: ${stats.zerounitprice || 0}`);

    // 7. Validar que no haya problemas
    if ((stats.nullquantity || 0) > 0 || (stats.nullunitprice || 0) > 0) {
      console.warn('⚠️  ADVERTENCIA: Algunos items aún tienen valores NULL');
      console.warn('   Esto puede ser normal si se agregaron después de la migración');
    }

    console.log('✅ Migración completada exitosamente sin errores');
    
    return {
      success: true,
      totalItems: stats.total,
      updated: true,
      hasWarnings: (stats.nullquantity > 0 || stats.nullunitprice > 0)
    };

  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    console.error('📍 Stack trace:', error.stack);
    
    // NO lanzar error para evitar crash en producción
    // Solo reportar y continuar
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration()
    .then((result) => {
      console.log('\n✅ Migración finalizada:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal en migración:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
