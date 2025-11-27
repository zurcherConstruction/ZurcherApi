const { Sequelize } = require('sequelize');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_DEPLOY } = require('../src/config/envs');

// Configuración de la base de datos
const isProduction = process.argv.includes('--production');
const connectionString = isProduction && DB_DEPLOY 
  ? DB_DEPLOY 
  : `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: console.log,
  ssl: isProduction && DB_DEPLOY ? { rejectUnauthorized: false } : false
});

async function migrateToIdPermit() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔧 MIGRACIÓN: Works.propertyAddress → Works.idPermit');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`📊 Entorno: ${isProduction ? 'PRODUCCIÓN 🔴' : 'DESARROLLO 🟢'}\n`);
    
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    
    // PASO 1: Verificar datos actuales
    console.log('📊 PASO 1: Verificando datos actuales...\n');
    
    const [worksCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "Works";
    `);
    
    const [permitsCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "Permits";
    `);
    
    console.log(`   Works en BD: ${worksCount[0].total}`);
    console.log(`   Permits en BD: ${permitsCount[0].total}\n`);
    
    // PASO 2: Verificar que todos los Works tienen un Permit correspondiente
    console.log('🔍 PASO 2: Verificando integridad referencial...\n');
    
    const [orphanWorks] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM "Works" w
      WHERE NOT EXISTS (
        SELECT 1 FROM "Permits" p 
        WHERE p."propertyAddress" = w."propertyAddress"
      );
    `);
    
    const orphanCount = parseInt(orphanWorks[0].total);
    
    if (orphanCount > 0) {
      console.log(`   ⚠️  ADVERTENCIA: ${orphanCount} Works sin Permit correspondiente`);
      console.log(`   Estos Works quedarán con idPermit NULL\n`);
    } else {
      console.log(`   ✅ Todos los Works tienen un Permit correspondiente\n`);
    }
    
    // PASO 3: Agregar columna idPermit a Works
    console.log('➕ PASO 3: Agregando columna idPermit a Works...\n');
    
    await sequelize.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "idPermit" INTEGER;
    `);
    
    console.log('   ✅ Columna idPermit agregada\n');
    
    // PASO 4: Poblar idPermit basado en propertyAddress
    console.log('🔄 PASO 4: Poblando idPermit desde propertyAddress...\n');
    
    const [updateResult] = await sequelize.query(`
      UPDATE "Works" w
      SET "idPermit" = p."idPermit"
      FROM "Permits" p
      WHERE w."propertyAddress" = p."propertyAddress";
    `);
    
    console.log(`   ✅ ${updateResult.rowCount || 'Todos los'} Works actualizados\n`);
    
    // PASO 5: Verificar población
    console.log('✅ PASO 5: Verificando población...\n');
    
    const [populated] = await sequelize.query(`
      SELECT 
        COUNT(*) FILTER (WHERE "idPermit" IS NOT NULL) as con_permit,
        COUNT(*) FILTER (WHERE "idPermit" IS NULL) as sin_permit,
        COUNT(*) as total
      FROM "Works";
    `);
    
    console.log(`   Con idPermit: ${populated[0].con_permit}`);
    console.log(`   Sin idPermit: ${populated[0].sin_permit}`);
    console.log(`   Total Works: ${populated[0].total}\n`);
    
    // PASO 6: Eliminar FK antigua
    console.log('🗑️  PASO 6: Eliminando Foreign Key antigua...\n');
    
    const [oldFK] = await sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Works'
        AND constraint_name = 'Works_propertyAddress_fkey';
    `);
    
    if (oldFK.length > 0) {
      await sequelize.query(`
        ALTER TABLE "Works" 
        DROP CONSTRAINT IF EXISTS "Works_propertyAddress_fkey";
      `);
      console.log('   ✅ FK antigua eliminada\n');
    } else {
      console.log('   ℹ️  FK antigua no existe (ya fue eliminada)\n');
    }
    
    // PASO 7: Crear nueva FK
    console.log('🔗 PASO 7: Creando nueva Foreign Key...\n');
    
    await sequelize.query(`
      ALTER TABLE "Works" 
      DROP CONSTRAINT IF EXISTS "Works_idPermit_fkey";
    `);
    
    await sequelize.query(`
      ALTER TABLE "Works" 
      ADD CONSTRAINT "Works_idPermit_fkey" 
      FOREIGN KEY ("idPermit") 
      REFERENCES "Permits" ("idPermit")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
    `);
    
    console.log('   ✅ Nueva FK creada\n');
    
    // PASO 8: Crear índice
    console.log('🔑 PASO 8: Creando índice en Works.idPermit...\n');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "Works_idPermit_idx" 
      ON "Works" ("idPermit");
    `);
    
    console.log('   ✅ Índice creado\n');
    
    // PASO 9: Verificación final
    console.log('✅ PASO 9: Verificación final...\n');
    
    const [finalFK] = await sequelize.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Works'
        AND constraint_name IN ('Works_propertyAddress_fkey', 'Works_idPermit_fkey');
    `);
    
    console.log('   Foreign Keys en Works:');
    finalFK.forEach(fk => {
      console.log(`   - ${fk.constraint_name}`);
    });
    console.log();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📋 RESUMEN:');
    console.log(`   ✅ Columna idPermit agregada a Works`);
    console.log(`   ✅ ${populated[0].con_permit} Works vinculados`);
    console.log(`   ✅ FK antigua eliminada`);
    console.log(`   ✅ FK nueva creada (Works.idPermit → Permits.idPermit)`);
    console.log(`   ✅ Índice creado\n`);
    
    console.log('⚠️  IMPORTANTE: Actualizar el código de la aplicación:');
    console.log('   1. Cambiar asociaciones en models');
    console.log('   2. Actualizar queries que usan propertyAddress');
    console.log('   3. Mantener propertyAddress por compatibilidad (no eliminar aún)\n');
    
    await sequelize.close();
    
  } catch (err) {
    console.error('\n❌ Error durante la migración:', err.message);
    console.error('\nStack:', err.stack);
    console.error('\n⚠️  La migración falló. Revisar el error y reintentar.\n');
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar migración
console.log('\n⚠️  ADVERTENCIA: Esta migración modificará la estructura de la BD');
console.log('   Asegúrate de tener un backup antes de continuar\n');

if (isProduction) {
  console.log('🔴 MODO PRODUCCIÓN activado');
  console.log('   Se esperará 15 segundos. Presiona Ctrl+C para cancelar...\n');
  setTimeout(() => {
    migrateToIdPermit();
  }, 15000);
} else {
  console.log('🟢 MODO DESARROLLO activado');
  console.log('   Se esperará 5 segundos. Presiona Ctrl+C para cancelar...\n');
  setTimeout(() => {
    migrateToIdPermit();
  }, 5000);
}
