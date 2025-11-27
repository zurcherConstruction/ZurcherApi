const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function listIndexes() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');
    
    // Listar primeros 30 índices
    const result = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'Permits' 
      ORDER BY indexname 
      LIMIT 30;
    `);
    
    console.log('📋 Primeros 30 índices en tabla Permits:\n');
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.indexname}`);
    });
    
    await client.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

listIndexes();
