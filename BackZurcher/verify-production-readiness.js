/**
 * Script de Verificación Pre-Deployment para Chase Credit Card
 * 
 * USAR ANTES DE MIGRAR EN PRODUCCIÓN
 * 
 * Este script verifica:
 * 1. Cuántos expenses con Chase Credit Card existen
 * 2. Sus estados actuales (paid, unpaid, paid_via_invoice)
 * 3. Si hay campos que puedan causar conflictos
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function verifyProduction() {
  try {
    console.log('🔍 VERIFICACIÓN PRE-DEPLOYMENT - CHASE CREDIT CARD');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a:', process.env.DB_HOST);
    console.log('   Base de datos:', process.env.DB_NAME);
    console.log('');

    // 1. Verificar expenses con Chase Credit Card
    console.log('📊 PASO 1: Expenses con Chase Credit Card');
    console.log('───────────────────────────────────────────────────────────────');
    
    const [expenses] = await sequelize.query(`
      SELECT 
        "paymentStatus",
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      GROUP BY "paymentStatus"
      ORDER BY "paymentStatus";
    `);

    if (expenses.length === 0) {
      console.log('ℹ️  No hay expenses con Chase Credit Card');
    } else {
      console.log('Expenses por estado:');
      let totalCount = 0;
      let totalAmount = 0;
      expenses.forEach(exp => {
        console.log(`   ${exp.paymentStatus}: ${exp.count} expenses, Total: $${parseFloat(exp.total_amount).toFixed(2)}`);
        totalCount += parseInt(exp.count);
        totalAmount += parseFloat(exp.total_amount);
      });
      console.log(`\nTOTAL: ${totalCount} expenses, $${totalAmount.toFixed(2)}`);
    }
    console.log('');

    // 2. Verificar si existe campo paidAmount
    console.log('📊 PASO 2: Verificar estructura de tabla Expenses');
    console.log('───────────────────────────────────────────────────────────────');
    
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Expenses'
      AND column_name IN ('paidAmount', 'paidDate', 'paymentStatus');
    `);

    columns.forEach(col => {
      console.log(`✅ ${col.column_name} (${col.data_type})`);
    });

    const hasPaidAmount = columns.some(col => col.column_name === 'paidAmount');
    
    if (!hasPaidAmount) {
      console.log('\n⚠️  Campo paidAmount NO existe (se creará en migración)');
    }
    console.log('');

    // 3. Verificar valores del ENUM paymentStatus
    console.log('📊 PASO 3: Valores del ENUM paymentStatus');
    console.log('───────────────────────────────────────────────────────────────');
    
    const [enumValues] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Expenses_paymentStatus'
      ORDER BY e.enumlabel;
    `);

    console.log('Valores actuales:');
    enumValues.forEach(val => {
      console.log(`   - ${val.enumlabel}`);
    });

    const hasPartial = enumValues.some(val => val.enumlabel === 'partial');
    if (!hasPartial) {
      console.log('\n⚠️  Valor "partial" NO existe (se agregará en migración)');
    }
    console.log('');

    // 4. Verificar tabla SupplierInvoices
    console.log('📊 PASO 4: Verificar estructura de SupplierInvoices');
    console.log('───────────────────────────────────────────────────────────────');
    
    const [siColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'SupplierInvoices'
      AND column_name IN ('transactionType', 'isCreditCard', 'balanceAfter');
    `);

    if (siColumns.length === 0) {
      console.log('⚠️  Campos de tarjeta NO existen (se crearán en migración)');
    } else {
      siColumns.forEach(col => {
        console.log(`✅ ${col.column_name} (${col.data_type})`);
      });
    }
    console.log('');

    // 5. Resumen de migraciones necesarias
    console.log('📋 RESUMEN DE MIGRACIONES NECESARIAS');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const migrations = [];
    
    if (siColumns.length === 0) {
      migrations.push({
        order: 1,
        name: 'add-credit-card-transaction-fields',
        impact: 'BAJO - Solo agrega campos a SupplierInvoices',
        safe: '✅ SEGURO'
      });
    }
    
    if (!hasPaidAmount) {
      migrations.push({
        order: 2,
        name: 'add-paid-amount-to-expenses',
        impact: 'MEDIO - Agrega paidAmount y actualiza expenses pagados',
        safe: '⚠️  REVISAR - Actualiza ' + expenses.reduce((sum, e) => sum + (e.paymentStatus !== 'unpaid' ? parseInt(e.count) : 0), 0) + ' expenses'
      });
    }
    
    if (!hasPartial) {
      migrations.push({
        order: 3,
        name: 'add-partial-payment-status',
        impact: 'BAJO - Solo agrega valor al ENUM',
        safe: '✅ SEGURO'
      });
    }

    if (migrations.length === 0) {
      console.log('✅ No se necesitan migraciones (ya están aplicadas)');
    } else {
      migrations.forEach(mig => {
        console.log(`\n${mig.order}. ${mig.name}`);
        console.log(`   Impacto: ${mig.impact}`);
        console.log(`   ${mig.safe}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎯 RECOMENDACIONES:');
    console.log('');
    console.log('1. ✅ HACER BACKUP antes de cualquier migración');
    console.log('2. ✅ Ejecutar migraciones en orden (1 → 2 → 3)');
    console.log('3. ✅ Verificar datos después de cada migración');
    console.log('4. ✅ Probar endpoint /credit-card/balance antes de usar UI');
    console.log('5. ✅ Crear transacción de prueba pequeña ($1) primero');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante verificación:', error.message);
    process.exit(1);
  }
}

verifyProduction();
