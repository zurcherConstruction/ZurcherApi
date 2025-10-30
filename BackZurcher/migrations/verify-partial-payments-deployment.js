/**
 * ✅ VERIFICACIÓN POST-DEPLOYMENT: Pagos Parciales
 * 
 * Este script verifica que la migración se ejecutó correctamente
 * 
 * Uso: node migrations/verify-partial-payments-deployment.js
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_DEPLOY, NODE_ENV } = process.env;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   ✅ VERIFICACIÓN: Pagos Parciales para Gastos Fijos         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const sequelize = DB_DEPLOY 
  ? new Sequelize(DB_DEPLOY, {
      logging: false,
      native: false,
      dialectOptions: {
        ssl: NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
      }
    })
  : new Sequelize(
      `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      { logging: false, native: false }
    );

async function verify() {
  try {
    console.log(`📊 Entorno: ${DB_DEPLOY ? '🔴 PRODUCCIÓN' : '🟢 LOCAL'}`);
    console.log('🔄 Conectando...\n');
    await sequelize.authenticate();
    
    let allGood = true;
    
    // ========================================
    // 1. Verificar estructura de FixedExpenses
    // ========================================
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 1️⃣  Verificando tabla FixedExpenses                        │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'FixedExpenses'
        AND column_name IN ('totalAmount', 'paidAmount', 'paymentStatus')
      ORDER BY column_name
    `);
    
    const expectedColumns = {
      totalAmount: false,
      paidAmount: false,
      paymentStatus: false
    };
    
    columns.forEach(col => {
      const exists = col.column_name in expectedColumns;
      console.log(`  ${exists ? '✅' : '❌'} ${col.column_name}: ${col.data_type}`);
      if (exists) expectedColumns[col.column_name] = true;
    });
    
    const missingColumns = Object.entries(expectedColumns)
      .filter(([_, exists]) => !exists)
      .map(([name]) => name);
    
    if (missingColumns.length > 0) {
      console.log(`\n  ❌ Faltan columnas: ${missingColumns.join(', ')}`);
      allGood = false;
    } else {
      console.log('\n  ✅ Todas las columnas necesarias existen\n');
    }
    
    // Verificar ENUM paymentStatus
    const [enumValues] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::"enum_FixedExpenses_paymentStatus"))::text as value
    `);
    
    const expectedValues = ['unpaid', 'partial', 'paid', 'paid_via_invoice'];
    const actualValues = enumValues.map(e => e.value);
    
    console.log('  📋 Valores del ENUM paymentStatus:');
    expectedValues.forEach(val => {
      const exists = actualValues.includes(val);
      console.log(`     ${exists ? '✅' : '❌'} ${val}`);
      if (!exists && val === 'partial') allGood = false;
    });
    console.log('');
    
    // ========================================
    // 2. Verificar tabla FixedExpensePayments
    // ========================================
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 2️⃣  Verificando tabla FixedExpensePayments                 │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'FixedExpensePayments'
    `);
    
    if (tables.length === 0) {
      console.log('  ❌ Tabla FixedExpensePayments NO existe\n');
      allGood = false;
    } else {
      console.log('  ✅ Tabla FixedExpensePayments existe\n');
      
      // Verificar columnas importantes
      const [paymentCols] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'FixedExpensePayments'
        ORDER BY column_name
      `);
      
      const importantCols = ['idPayment', 'fixedExpenseId', 'amount', 'paymentDate', 'expenseId', 'receiptUrl'];
      console.log('  📋 Columnas importantes:');
      importantCols.forEach(col => {
        const exists = paymentCols.some(c => c.column_name === col);
        console.log(`     ${exists ? '✅' : '❌'} ${col}`);
        if (!exists) allGood = false;
      });
      console.log('');
      
      // Verificar índices
      const [indexes] = await sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'FixedExpensePayments'
      `);
      console.log(`  📋 Índices: ${indexes.length} encontrados`);
      indexes.forEach(idx => {
        console.log(`     ✅ ${idx.indexname}`);
      });
      console.log('');
    }
    
    // ========================================
    // 3. Verificar Foreign Keys
    // ========================================
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 3️⃣  Verificando Foreign Keys                               │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    const [fkeys] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'FixedExpensePayments'
    `);
    
    const expectedFKs = [
      { column: 'fixedExpenseId', references: 'FixedExpenses' },
      { column: 'expenseId', references: 'Expenses' },
      { column: 'createdByStaffId', references: 'Staffs' }
    ];
    
    expectedFKs.forEach(fk => {
      const exists = fkeys.some(f => 
        f.column_name === fk.column && f.foreign_table_name === fk.references
      );
      console.log(`  ${exists ? '✅' : '⚠️ '} ${fk.column} → ${fk.references}`);
    });
    console.log('');
    
    // ========================================
    // 4. Verificar datos existentes
    // ========================================
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 4️⃣  Verificando datos de FixedExpenses                     │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "paymentStatus" = 'unpaid') as unpaid,
        COUNT(*) FILTER (WHERE "paymentStatus" = 'partial') as partial,
        COUNT(*) FILTER (WHERE "paymentStatus" = 'paid') as paid,
        COUNT(*) FILTER (WHERE "paymentStatus" = 'paid_via_invoice') as paid_via_invoice,
        COUNT(*) FILTER (WHERE "paidAmount" > 0) as with_payments,
        SUM("totalAmount") as total_amount,
        SUM("paidAmount") as paid_amount
      FROM "FixedExpenses"
    `);
    
    if (stats.length > 0) {
      const s = stats[0];
      console.log(`  📊 Total de gastos fijos: ${s.total}`);
      console.log(`     • Unpaid: ${s.unpaid}`);
      console.log(`     • Partial: ${s.partial} 🆕`);
      console.log(`     • Paid: ${s.paid}`);
      console.log(`     • Paid via Invoice: ${s.paid_via_invoice}`);
      console.log(`     • Con pagos registrados: ${s.with_payments}`);
      console.log(`     • Monto total: $${parseFloat(s.total_amount || 0).toFixed(2)}`);
      console.log(`     • Monto pagado: $${parseFloat(s.paid_amount || 0).toFixed(2)}`);
    }
    console.log('');
    
    // ========================================
    // 5. Verificar pagos parciales
    // ========================================
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 5️⃣  Verificando FixedExpensePayments                       │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    const [paymentStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM("amount") as total_amount,
        COUNT(DISTINCT "fixedExpenseId") as expenses_with_payments,
        COUNT("expenseId") as expenses_generated
      FROM "FixedExpensePayments"
    `);
    
    if (paymentStats.length > 0) {
      const ps = paymentStats[0];
      console.log(`  📊 Pagos parciales registrados: ${ps.total_payments}`);
      console.log(`     • Monto total de pagos: $${parseFloat(ps.total_amount || 0).toFixed(2)}`);
      console.log(`     • Gastos con pagos: ${ps.expenses_with_payments}`);
      console.log(`     • Expenses generados: ${ps.expenses_generated}`);
    } else {
      console.log('  📊 No hay pagos parciales registrados aún (esto es normal)');
    }
    console.log('');
    
    // ========================================
    // 6. Verificar consistencia de datos
    // ========================================
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 6️⃣  Verificando consistencia de datos                      │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');
    
    // Gastos marcados como paid pero con paidAmount = 0
    const [inconsistent] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM "FixedExpenses"
      WHERE "paymentStatus" IN ('paid', 'paid_via_invoice')
        AND "paidAmount" = 0
    `);
    
    if (parseInt(inconsistent[0].count) > 0) {
      console.log(`  ⚠️  ${inconsistent[0].count} gasto(s) marcado(s) como "paid" pero con paidAmount = 0`);
      console.log('     Considera ejecutar: node migrations/sync-paid-fixed-expenses.js');
    } else {
      console.log('  ✅ Todos los gastos "paid" tienen paidAmount correcto');
    }
    console.log('');
    
    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('╔════════════════════════════════════════════════════════════════╗');
    if (allGood) {
      console.log('║              ✅ VERIFICACIÓN EXITOSA                           ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');
      console.log('🎉 La migración se ejecutó correctamente');
      console.log('✅ Todas las estructuras están en su lugar');
      console.log('✅ Sistema de pagos parciales listo para usar\n');
      console.log('📋 Endpoints disponibles:');
      console.log('   • POST   /api/fixed-expenses/:id/payments');
      console.log('   • GET    /api/fixed-expenses/:id/payments');
      console.log('   • DELETE /api/fixed-expense-payments/:paymentId\n');
    } else {
      console.log('║              ⚠️  VERIFICACIÓN CON ADVERTENCIAS                ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');
      console.log('⚠️  Revisa los mensajes anteriores para detalles');
      console.log('⚠️  Es posible que necesites ejecutar las migraciones nuevamente\n');
    }
    
    process.exit(allGood ? 0 : 1);
  } catch (error) {
    console.error('\n❌ ERROR en verificación:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verify();
