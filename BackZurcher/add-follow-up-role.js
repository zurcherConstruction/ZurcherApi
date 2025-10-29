const { conn } = require('./src/data');
const fs = require('fs');
const path = require('path');

/**
 * Script para agregar el rol 'follow-up' a producción
 * Ejecuta la migración SQL de forma segura
 */

async function addFollowUpRole() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    console.log('🔄 Ejecutando migración: Agregar rol "follow-up"...\n');
    console.log('═'.repeat(80));
    
    // Leer el archivo SQL de migración
    const sqlPath = path.join(__dirname, 'migrations', 'add-follow-up-role.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar la migración
    await conn.query(sqlScript);
    
    console.log('\n═'.repeat(80));
    console.log('\n✅ Migración completada exitosamente!\n');
    
    // Verificar que el rol existe
    const [roles] = await conn.query(`
      SELECT e.enumlabel as role_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Staff_role'
      ORDER BY e.enumsortorder;
    `);
    
    console.log('📋 Roles disponibles en el sistema:\n');
    roles.forEach((role, index) => {
      const icon = role.role_name === 'follow-up' ? '🆕' : '  ';
      console.log(`${icon} ${String(index + 1).padStart(2)}. ${role.role_name}`);
    });
    
    console.log('\n═'.repeat(80));
    console.log('\n🎯 Siguiente paso:\n');
    console.log('   Ahora puedes crear usuarios con rol "follow-up" desde el panel de Staff');
    console.log('   o actualizando staff existentes en la base de datos.\n');
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  El rol "follow-up" ya existe en la base de datos.');
      console.log('   No es necesario ejecutar la migración nuevamente.\n');
    } else {
      console.error(error);
    }
  } finally {
    await conn.close();
    console.log('✅ Conexión cerrada');
    process.exit(0);
  }
}

addFollowUpRole();
