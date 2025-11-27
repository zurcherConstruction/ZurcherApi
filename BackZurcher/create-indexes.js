const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY
} = require('./src/config/envs');

// Usar la misma lógica que el servidor
const connectionString = DB_DEPLOY 
  ? DB_DEPLOY 
  : `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const client = new Client({ 
  connectionString,
  ssl: DB_DEPLOY ? { rejectUnauthorized: false } : false
});

async function createIndexes() {
  try {
    console.log(`📊 Base de datos: ${DB_DEPLOY ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);
    await client.connect();
    console.log('✅ Conectado a PostgreSQL...');
    
    const sql = fs.readFileSync('add-work-indexes.sql', 'utf8');
    await client.query(sql);
    console.log('✅ Índices creados exitosamente\n');
    
    const result = await client.query(`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND (
          tablename LIKE 'Work%' OR 
          tablename LIKE 'Permit%' OR 
          tablename LIKE 'Budget%' OR 
          tablename LIKE 'Inspection%' OR 
          tablename LIKE 'Image%' OR 
          tablename LIKE 'Material%' OR 
          tablename LIKE 'Expense%' OR 
          tablename LIKE 'Receipt%' OR 
          tablename LIKE 'ChangeOrder%' OR 
          tablename LIKE 'FinalInvoice%'
        )
      ORDER BY tablename, indexname;
    `);
    
    console.log(`📋 Total de índices creados/existentes: ${result.rows.length}\n`);
    result.rows.forEach(r => {
      console.log(`  ✓ ${r.tablename}.${r.indexname}`);
    });
    
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

createIndexes();
