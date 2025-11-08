/**
 * SCRIPT: Limpiar vendors duplicados (unificar variaciones de mayúsculas/minúsculas)
 * 
 * Este script:
 * 1. Encuentra vendors con nombres similares (case-insensitive)
 * 2. Unifica todos bajo un solo nombre (el más usado o el primero alfabéticamente)
 * 3. Actualiza todos los invoices para usar el nombre unificado
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const isDeploy = !!process.env.DB_DEPLOY;
const databaseUrl = isDeploy ? process.env.DB_DEPLOY : null;

console.log(`📊 Base de datos: ${isDeploy ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  );
}

async function cleanupDuplicateVendors() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    console.log('🔍 Buscando vendors duplicados...\n');

    // Obtener todos los vendors únicos
    const [vendors] = await sequelize.query(`
      SELECT DISTINCT vendor 
      FROM "SupplierInvoices" 
      ORDER BY vendor
    `);

    // Agrupar vendors similares (case-insensitive)
    const vendorGroups = {};
    
    vendors.forEach(row => {
      const vendor = row.vendor;
      const normalizedKey = vendor.toLowerCase().trim();
      
      if (!vendorGroups[normalizedKey]) {
        vendorGroups[normalizedKey] = [];
      }
      
      vendorGroups[normalizedKey].push(vendor);
    });

    // Encontrar grupos con duplicados
    const duplicateGroups = Object.entries(vendorGroups)
      .filter(([key, variants]) => variants.length > 1)
      .map(([key, variants]) => ({
        normalizedName: key,
        variants: variants,
        count: variants.length
      }));

    if (duplicateGroups.length === 0) {
      console.log('✅ No se encontraron vendors duplicados\n');
      await sequelize.close();
      return;
    }

    console.log(`📋 Encontrados ${duplicateGroups.length} grupos de vendors duplicados:\n`);

    let totalUpdated = 0;

    for (const group of duplicateGroups) {
      console.log(`\n🔧 Grupo: ${group.normalizedName}`);
      console.log(`   Variantes encontradas (${group.variants.length}):`);
      
      // Contar cuántos invoices tiene cada variante
      const variantCounts = [];
      
      for (const variant of group.variants) {
        const [result] = await sequelize.query(`
          SELECT COUNT(*) as count 
          FROM "SupplierInvoices" 
          WHERE vendor = :vendor
        `, {
          replacements: { vendor: variant }
        });
        
        variantCounts.push({
          name: variant,
          count: parseInt(result[0].count)
        });
        
        console.log(`   - "${variant}" (${result[0].count} invoices)`);
      }

      // Elegir el nombre "canónico" (el que tiene más invoices, o el primero alfabéticamente)
      variantCounts.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

      const canonicalName = variantCounts[0].name;
      console.log(`   ✅ Nombre canónico elegido: "${canonicalName}"`);

      // Actualizar todos los otros nombres al canónico
      for (const variant of group.variants) {
        if (variant !== canonicalName) {
          const [result, metadata] = await sequelize.query(`
            UPDATE "SupplierInvoices" 
            SET vendor = :canonicalName 
            WHERE vendor = :variant
            RETURNING id
          `, {
            replacements: { 
              canonicalName: canonicalName,
              variant: variant
            }
          });

          const updated = result.length;
          totalUpdated += updated;
          console.log(`   🔄 Actualizado "${variant}" → "${canonicalName}" (${updated} invoices)`);
        }
      }
    }

    console.log(`\n✅ Proceso completado`);
    console.log(`📊 Total de invoices actualizados: ${totalUpdated}`);
    console.log(`🎯 Vendors unificados: ${duplicateGroups.length} grupos\n`);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

cleanupDuplicateVendors();
