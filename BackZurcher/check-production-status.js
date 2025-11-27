const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_DEPLOY } = require('./src/config/envs');
const { Client } = require('pg');

// ⚠️ MODIFICAR ESTA VARIABLE PARA CONECTAR A PRODUCCIÓN
const USE_PRODUCTION = false; // Cambiar a true para verificar producción

const connectionString = USE_PRODUCTION && DB_DEPLOY
  ? DB_DEPLOY 
  : `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const client = new Client({ 
  connectionString,
  ssl: USE_PRODUCTION && DB_DEPLOY ? { rejectUnauthorized: false } : false
});

async function checkProductionIndexes() {
  try {
    console.log(`\n📊 Conectando a: ${USE_PRODUCTION ? 'PRODUCCIÓN 🔴' : 'DESARROLLO 🟢'}\n`);
    await client.connect();
    console.log('✅ Conectado a PostgreSQL...\n');
    
    // Contar índices duplicados en Permits (solo los que tienen números)
    const permitsCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname ~ '^Permits_permitNumber_key[0-9]+$'
          OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
        );
    `);
    
    const totalPermitDuplicates = parseInt(permitsCount.rows[0].total);
    
    // Contar total de índices en Permits
    const totalPermitsIndexes = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits';
    `);
    
    const totalPermits = parseInt(totalPermitsIndexes.rows[0].total);
    
    // Verificar si hay BLOBs en Permits
    const blobsCount = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE "pdfData" IS NOT NULL) as pdfs_with_blob,
        COUNT(*) FILTER (WHERE "permitPdfUrl" IS NOT NULL) as pdfs_with_url,
        COUNT(*) as total_permits
      FROM "Permits";
    `);
    
    const blobStats = blobsCount.rows[0];
    
    // Verificar tamaño de base de datos
    const dbSize = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 REPORTE DE BASE DE DATOS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`🗄️  Tamaño de BD: ${dbSize.rows[0].size}\n`);
    
    console.log('📋 PERMITS:');
    console.log(`   Total permits: ${blobStats.total_permits}`);
    console.log(`   Con PDF BLOB: ${blobStats.pdfs_with_blob} (${((blobStats.pdfs_with_blob / blobStats.total_permits) * 100).toFixed(1)}%)`);
    console.log(`   Con PDF URL: ${blobStats.pdfs_with_url} (${((blobStats.pdfs_with_url / blobStats.total_permits) * 100).toFixed(1)}%)\n`);
    
    console.log('🔑 ÍNDICES:');
    console.log(`   Total índices en Permits: ${totalPermits}`);
    console.log(`   Índices duplicados: ${totalPermitDuplicates}`);
    
    if (totalPermitDuplicates > 100) {
      console.log(`   ⚠️  CRÍTICO: ${totalPermitDuplicates} índices duplicados detectados!`);
      console.log(`   💡 Ejecutar clean-duplicate-indexes.js para limpiar\n`);
    } else if (totalPermitDuplicates > 0) {
      console.log(`   ⚠️  ${totalPermitDuplicates} índices duplicados (moderado)\n`);
    } else {
      console.log(`   ✅ No hay índices duplicados\n`);
    }
    
    // Verificar índices en Works
    const worksIndexes = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Works';
    `);
    
    console.log(`   Índices en Works: ${worksIndexes.rows[0].total}`);
    
    // Verificar si existen los índices optimizados
    const optimizedIndexes = await client.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Works'
        AND indexname IN (
          'Works_idBudget_idx',
          'Works_staffId_idx',
          'Works_propertyAddress_idx',
          'Works_status_idx',
          'Works_createdAt_idx'
        );
    `);
    
    console.log(`   Índices optimizados en Works: ${optimizedIndexes.rows.length}/5`);
    if (optimizedIndexes.rows.length < 5) {
      console.log(`   ⚠️  Faltan índices optimizados. Ejecutar create-indexes.js\n`);
    } else {
      console.log(`   ✅ Todos los índices optimizados presentes\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Recomendaciones
    console.log('💡 RECOMENDACIONES:\n');
    
    if (totalPermitDuplicates > 100) {
      console.log('   🔴 URGENTE: Limpiar índices duplicados');
      console.log('      node clean-duplicate-indexes.js\n');
    }
    
    if (blobStats.pdfs_with_blob > 0) {
      console.log(`   🟡 IMPORTANTE: Migrar ${blobStats.pdfs_with_blob} PDFs a Cloudinary`);
      console.log('      node migrate-permits-to-cloudinary.js\n');
    }
    
    if (optimizedIndexes.rows.length < 5) {
      console.log('   🟡 Crear índices optimizados en Works');
      console.log('      node create-indexes.js\n');
    }
    
    if (totalPermitDuplicates === 0 && blobStats.pdfs_with_blob === 0 && optimizedIndexes.rows.length === 5) {
      console.log('   ✅ Base de datos completamente optimizada!\n');
    }
    
    await client.end();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

checkProductionIndexes();
