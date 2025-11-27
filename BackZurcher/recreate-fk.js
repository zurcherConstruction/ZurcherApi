const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function recreateFK() {
  try {
    console.log('\n🔒 Recreando Foreign Key Works → Permits...\n');
    await client.connect();
    
    // Verificar si existe
    const checkFK = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Works'
        AND constraint_name = 'Works_propertyAddress_fkey';
    `);
    
    if (checkFK.rows.length > 0) {
      console.log('✅ La FK ya existe, no es necesario recrearla.\n');
      await client.end();
      return;
    }
    
    console.log('⚠️  FK no existe, recreando...\n');
    
    await client.query(`
      ALTER TABLE "Works" 
      ADD CONSTRAINT "Works_propertyAddress_fkey" 
      FOREIGN KEY ("propertyAddress") 
      REFERENCES "Permits" ("propertyAddress");
    `);
    
    console.log('✅ FK recreada exitosamente!\n');
    
    await client.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

recreateFK();
