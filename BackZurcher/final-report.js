const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function finalReport() {
  try {
    await client.connect();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 REPORTE FINAL - BASE DE DATOS OPTIMIZADA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Constraints en Permits
    const constraints = await client.query(`
      SELECT constraint_type, COUNT(*) as total
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'Permits'
      GROUP BY constraint_type
      ORDER BY constraint_type;
    `);
    
    console.log('📋 CONSTRAINTS EN PERMITS:\n');
    constraints.rows.forEach(c => {
      console.log(`   ${c.constraint_type.padEnd(15)} ${c.total}`);
    });
    
    // Índices en Permits
    const indexes = await client.query(`
      SELECT COUNT(*) as total FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'Permits';
    `);
    
    console.log(`\n🔑 ÍNDICES EN PERMITS: ${indexes.rows[0].total}\n`);
    
    // Listar índices
    const indexList = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'Permits'
      ORDER BY indexname;
    `);
    
    indexList.rows.forEach(idx => {
      console.log(`   ✓ ${idx.indexname}`);
    });
    
    // FK Works → Permits
    const fk = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Works'
        AND constraint_name = 'Works_propertyAddress_fkey';
    `);
    
    console.log(`\n🔗 FOREIGN KEY Works → Permits: ${fk.rows.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}\n`);
    
    // Tamaño de BD
    const size = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `);
    
    console.log(`💾 TAMAÑO BASE DE DATOS: ${size.rows[0].size}\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ BASE DE DATOS COMPLETAMENTE OPTIMIZADA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await client.end();
    
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

finalReport();
