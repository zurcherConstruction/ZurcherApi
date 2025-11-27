const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function verify() {
  try {
    await client.connect();
    
    // Contar duplicados
    const count = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname ~ '^Permits_permitNumber_key[0-9]+$'
          OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
        );
    `);
    
    console.log(`\n📊 Índices duplicados encontrados: ${count.rows[0].total}\n`);
    
    // Listar primeros 10
    const list = await client.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits'
        AND (
          indexname ~ '^Permits_permitNumber_key[0-9]+$'
          OR indexname ~ '^Permits_propertyAddress_key[0-9]+$'
        )
      ORDER BY indexname
      LIMIT 10;
    `);
    
    console.log('Primeros 10 duplicados que siguen existiendo:\n');
    list.rows.forEach(r => console.log(`  - ${r.indexname}`));
    
    await client.end();
    
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

verify();
