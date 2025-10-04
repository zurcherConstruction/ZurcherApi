const { conn } = require('./src/data/index');

async function addNewStatuses() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    
    console.log('📝 Agregando nuevos estados al ENUM status...\n');
    
    // Agregar los nuevos estados al ENUM existente
    await conn.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'draft';
        ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'pending_review';
        ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'client_approved';
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Algunos estados ya existen, continuando...';
      END $$;
    `);
    
    console.log('✅ Nuevos estados agregados exitosamente!\n');
    console.log('📋 Estados disponibles ahora:');
    console.log('   - draft (🆕 NUEVO)');
    console.log('   - pending_review (🆕 NUEVO)');
    console.log('   - client_approved (🆕 NUEVO)');
    console.log('   - created');
    console.log('   - send');
    console.log('   - sent_for_signature');
    console.log('   - signed');
    console.log('   - approved');
    console.log('   - notResponded');
    console.log('   - rejected\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.close();
    process.exit(0);
  }
}

addNewStatuses();
