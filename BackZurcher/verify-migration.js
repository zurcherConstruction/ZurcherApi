/**
 * SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
 * 
 * Ejecutar después de complete-enum-migration.js para verificar
 * que todos los cambios se aplicaron correctamente.
 * 
 * Uso: node verify-migration.js
 */

const { conn } = require('./src/data/index');

async function verifyMigration() {
  try {
    console.log('🔍 Iniciando verificación de migración...\n');

    // Conectar a la base de datos
    await conn.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida\n');

    let allChecksPass = true;

    // ============================================================
    // 1. VERIFICAR Staff.role - 'sales_rep'
    // ============================================================
    console.log('📝 1. Verificando Staff.role...');
    const [staffRoles] = await conn.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_Staffs_role'
      )
      ORDER BY enumlabel;
    `);

    const roleLabels = staffRoles.map(r => r.enumlabel);
    console.log('   Roles encontrados:', roleLabels.join(', '));

    if (roleLabels.includes('sales_rep')) {
      console.log('   ✅ Rol "sales_rep" existe');
    } else {
      console.log('   ❌ Rol "sales_rep" NO encontrado');
      allChecksPass = false;
    }

    // ============================================================
    // 2. VERIFICAR Expense.typeExpense - 'Comisión Vendedor'
    // ============================================================
    console.log('\n📝 2. Verificando Expense.typeExpense...');
    const [expenseTypes] = await conn.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_Expenses_typeExpense'
      )
      ORDER BY enumlabel;
    `);

    const expenseLabels = expenseTypes.map(e => e.enumlabel);
    console.log('   Tipos encontrados:', expenseLabels.join(', '));

    if (expenseLabels.includes('Comisión Vendedor')) {
      console.log('   ✅ Tipo "Comisión Vendedor" existe');
    } else {
      console.log('   ❌ Tipo "Comisión Vendedor" NO encontrado');
      allChecksPass = false;
    }

    // ============================================================
    // 3. VERIFICAR Receipt.type - 'Comisión Vendedor'
    // ============================================================
    console.log('\n📝 3. Verificando Receipt.type...');
    const [receiptTypes] = await conn.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_Receipts_type'
      )
      ORDER BY enumlabel;
    `);

    const receiptLabels = receiptTypes.map(r => r.enumlabel);
    console.log('   Tipos encontrados:', receiptLabels.join(', '));

    if (receiptLabels.includes('Comisión Vendedor')) {
      console.log('   ✅ Tipo "Comisión Vendedor" existe');
    } else {
      console.log('   ❌ Tipo "Comisión Vendedor" NO encontrado');
      allChecksPass = false;
    }

    // ============================================================
    // 4. VERIFICAR Budget - Nuevas columnas
    // ============================================================
    console.log('\n📝 4. Verificando columnas de Budget...');
    const [budgetColumns] = await conn.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Budgets'
      AND column_name IN (
        'leadSource',
        'createdByStaffId',
        'salesCommissionAmount',
        'clientTotalPrice',
        'commissionPercentage',
        'commissionAmount',
        'commissionPaid',
        'commissionPaidDate'
      )
      ORDER BY column_name;
    `);

    const requiredColumns = [
      'leadSource',
      'createdByStaffId',
      'salesCommissionAmount',
      'clientTotalPrice',
      'commissionPercentage',
      'commissionAmount',
      'commissionPaid',
      'commissionPaidDate'
    ];

    const existingColumnNames = budgetColumns.map(c => c.column_name);

    console.log('\n   Columnas requeridas vs encontradas:');
    requiredColumns.forEach(colName => {
      if (existingColumnNames.includes(colName)) {
        const col = budgetColumns.find(c => c.column_name === colName);
        console.log(`   ✅ ${colName.padEnd(25)} (${col.data_type})`);
      } else {
        console.log(`   ❌ ${colName.padEnd(25)} NO ENCONTRADA`);
        allChecksPass = false;
      }
    });

    // ============================================================
    // 5. VERIFICAR Budget.leadSource ENUM
    // ============================================================
    console.log('\n📝 5. Verificando Budget.leadSource ENUM...');
    const [leadSourceValues] = await conn.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_Budgets_leadSource'
      )
      ORDER BY enumlabel;
    `);

    if (leadSourceValues.length > 0) {
      const leadLabels = leadSourceValues.map(l => l.enumlabel);
      console.log('   Valores encontrados:', leadLabels.join(', '));

      const requiredLeadSources = ['web', 'direct_client', 'social_media', 'referral', 'sales_rep'];
      const allPresent = requiredLeadSources.every(ls => leadLabels.includes(ls));

      if (allPresent) {
        console.log('   ✅ Todos los valores de leadSource existen');
      } else {
        console.log('   ⚠️  Faltan algunos valores de leadSource');
        allChecksPass = false;
      }
    } else {
      console.log('   ❌ ENUM "enum_Budgets_leadSource" NO encontrado');
      allChecksPass = false;
    }

    // ============================================================
    // 6. VERIFICAR Foreign Keys
    // ============================================================
    console.log('\n📝 6. Verificando claves foráneas...');
    const [foreignKeys] = await conn.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'Budgets'
        AND kcu.column_name = 'createdByStaffId';
    `);

    if (foreignKeys.length > 0) {
      const fk = foreignKeys[0];
      console.log(`   ✅ Foreign Key: ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    } else {
      console.log('   ⚠️  Foreign Key de createdByStaffId NO encontrada (puede ser normal si no se definió)');
    }

    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    console.log('\n' + '='.repeat(60));
    if (allChecksPass) {
      console.log('✅ ¡VERIFICACIÓN EXITOSA! Todos los cambios están aplicados correctamente.');
      console.log('\n🎉 Tu base de datos está lista para usar:');
      console.log('   • Crear usuarios con rol "sales_rep"');
      console.log('   • Registrar gastos tipo "Comisión Vendedor"');
      console.log('   • Rastrear comisiones en presupuestos');
      console.log('   • Adjuntar comprobantes de comisiones');
    } else {
      console.log('⚠️  VERIFICACIÓN INCOMPLETA. Algunos cambios no se aplicaron correctamente.');
      console.log('\n🔧 Soluciones sugeridas:');
      console.log('   1. Ejecuta nuevamente: node run-migration.js complete-enum-migration');
      console.log('   2. Verifica los logs de error en la consola');
      console.log('   3. Asegúrate de que el usuario de PostgreSQL tenga permisos suficientes');
    }
    console.log('='.repeat(60) + '\n');

    // ============================================================
    // INFORMACIÓN ADICIONAL
    // ============================================================
    console.log('📊 Información adicional:');

    // Contar Staff por rol
    const [staffCounts] = await conn.query(`
      SELECT role, COUNT(*) as count
      FROM "Staffs"
      WHERE "deletedAt" IS NULL
      GROUP BY role
      ORDER BY role;
    `);

    console.log('\n   👥 Staff por rol:');
    if (staffCounts.length > 0) {
      staffCounts.forEach(sc => {
        console.log(`      ${sc.role.padEnd(15)}: ${sc.count}`);
      });
    } else {
      console.log('      No hay staff registrado');
    }

    // Contar Expenses por tipo
    const [expenseCounts] = await conn.query(`
      SELECT "typeExpense", COUNT(*) as count
      FROM "Expenses"
      GROUP BY "typeExpense"
      ORDER BY count DESC
      LIMIT 5;
    `);

    console.log('\n   💳 Gastos más frecuentes (Top 5):');
    if (expenseCounts.length > 0) {
      expenseCounts.forEach(ec => {
        console.log(`      ${ec.typeExpense.padEnd(30)}: ${ec.count}`);
      });
    } else {
      console.log('      No hay gastos registrados');
    }

    // Contar Budgets por leadSource
    const [budgetLeadSources] = await conn.query(`
      SELECT "leadSource", COUNT(*) as count
      FROM "Budgets"
      WHERE "leadSource" IS NOT NULL
      GROUP BY "leadSource"
      ORDER BY count DESC;
    `);

    console.log('\n   📊 Budgets por fuente:');
    if (budgetLeadSources.length > 0) {
      budgetLeadSources.forEach(ls => {
        console.log(`      ${ls.leadSource.padEnd(15)}: ${ls.count}`);
      });
    } else {
      console.log('      No hay budgets con leadSource definido');
    }

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error);
    console.error('\nDetalles:', error.message);
    process.exit(1);
  } finally {
    await conn.close();
    console.log('\n🔒 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  verifyMigration();
}

module.exports = { verifyMigration };
