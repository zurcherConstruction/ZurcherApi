require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ 
  connectionString: process.env.DB_DEPLOY 
});

console.log('🚀 Agregando columna applicant_email a Budgets...\n');

client.connect()
  .then(() => {
    console.log('✅ Conectado a Railway (producción)');
    const sql = fs.readFileSync('add-budget-email-column.sql', 'utf8');
    return client.query(sql);
  })
  .then(() => {
    console.log('\n✅ Columna agregada y datos migrados exitosamente');
    client.end();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    client.end();
    process.exit(1);
  });
