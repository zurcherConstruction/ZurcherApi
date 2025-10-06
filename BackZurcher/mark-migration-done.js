const { conn } = require('./src/data/index');

async function markMigrationAsDone() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    
    const migrationName = 'add-permit-improvements.js';
    
    // Verificar si la tabla de migraciones existe
    const [tables] = await conn.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'SequelizeMeta';
    `);
    
    if (tables.length === 0) {
      console.log('⚠️  Tabla SequelizeMeta no existe. Creándola...');
      await conn.query(`
        CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
          "name" VARCHAR(255) NOT NULL PRIMARY KEY
        );
      `);
      console.log('✅ Tabla creada\n');
    }
    
    // Verificar si la migración ya está registrada
    const [existing] = await conn.query(`
      SELECT name FROM "SequelizeMeta" WHERE name = '${migrationName}';
    `);
    
    if (existing && existing.length > 0) {
      console.log(`ℹ️  La migración "${migrationName}" ya está marcada como completada\n`);
    } else {
      // Insertar el registro de migración
      await conn.query(`
        INSERT INTO "SequelizeMeta" (name) VALUES ('${migrationName}');
      `);
      
      console.log(`✅ Migración "${migrationName}" marcada como completada\n`);
    }
    
    // Mostrar todas las migraciones registradas
    const [allMigrations] = await conn.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `);
    
    console.log('📋 Migraciones registradas:');
    allMigrations.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name}`);
    });
    
    console.log('\n🎉 Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await conn.close();
    process.exit(0);
  }
}

markMigrationAsDone();
