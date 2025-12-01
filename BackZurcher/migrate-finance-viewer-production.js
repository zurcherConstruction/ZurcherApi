const { conn } = require('./src/data');

/**
 * 🚀 SCRIPT DE MIGRACIÓN PARA PRODUCCIÓN
 * Agrega el rol 'finance-viewer' al sistema
 * 
 * IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ en producción
 */

async function addFinanceViewerRoleProduction() {
  try {
    console.log('🚀 INICIANDO MIGRACIÓN EN PRODUCCIÓN\n');
    console.log('═'.repeat(80));
    
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos de producción\n');
    
    // 1. Verificar si el ENUM ya tiene el valor finance-viewer
    const [existing] = await conn.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_Staffs_role'
        AND e.enumlabel = 'finance-viewer'
      ) as exists;
    `);
    
    if (existing[0]?.exists) {
      console.log('⚠️  El rol "finance-viewer" ya existe en la base de datos.');
      console.log('   No es necesario ejecutar la migración nuevamente.\n');
      console.log('═'.repeat(80));
      return;
    }
    
    console.log('🔄 Agregando rol "finance-viewer" al ENUM...\n');
    
    // 2. Agregar el nuevo valor al ENUM
    await conn.query(`
      ALTER TYPE "enum_Staffs_role" ADD VALUE 'finance-viewer';
    `);
    
    console.log('✅ Rol "finance-viewer" agregado exitosamente!\n');
    console.log('═'.repeat(80));
    
    // 3. Verificar todos los roles disponibles
    const [roles] = await conn.query(`
      SELECT e.enumlabel as role_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Staffs_role'
      ORDER BY e.enumsortorder;
    `);
    
    console.log('\n📋 Roles disponibles en el sistema:\n');
    roles.forEach((role, index) => {
      const icon = role.role_name === 'finance-viewer' ? '🆕' : 
                   role.role_name === 'finance' ? '📊' : '  ';
      console.log(`${icon} ${String(index + 1).padStart(2)}. ${role.role_name}`);
    });
    
    console.log('\n═'.repeat(80));
    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!\n');
    
    console.log('📊 Resumen de cambios:\n');
    console.log('   ✅ Rol "finance-viewer" agregado al ENUM');
    console.log('   ✅ Base de datos actualizada');
    console.log('   ✅ Frontend ya configurado para usar el nuevo rol\n');
    
    console.log('💡 Diferencia entre roles financieros:\n');
    console.log('   📊 finance         → Permisos completos + RECIBE notificaciones');
    console.log('   👁️  finance-viewer  → Solo lectura + NO recibe notificaciones\n');
    
    console.log('🎯 Siguiente paso:\n');
    console.log('   Ahora puedes asignar el rol "finance-viewer" a usuarios desde el');
    console.log('   panel de administración de Staff en la aplicación web.\n');
    
    console.log('🔔 Notificaciones que NO recibirán finance-viewer:\n');
    console.log('   • Gastos creados (expenseCreated)');
    console.log('   • Ingresos registrados (incomeRegistered)');
    console.log('   • Gastos actualizados (expenseUpdated)');
    console.log('   • Pagos iniciales (incomeCreated)');
    console.log('   • Presupuestos aprobados (budgetApprovedByClient)\n');
    
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  El rol "finance-viewer" ya existe.');
      console.log('   La migración ya fue ejecutada previamente.\n');
    } else if (error.message.includes('no existe el tipo')) {
      console.log('\n⚠️  El tipo ENUM "enum_Staffs_role" no existe.');
      console.log('   Esto puede indicar un problema con la base de datos.');
      console.log('   Verifica que la conexión sea correcta y que el modelo Staff');
      console.log('   haya sido sincronizado previamente.\n');
    } else {
      console.error('\n📋 Detalles completos del error:');
      console.error(error);
    }
    
    process.exit(1);
  } finally {
    await conn.close();
    console.log('✅ Conexión cerrada\n');
    process.exit(0);
  }
}

// Ejecutar la migración
addFinanceViewerRoleProduction();
