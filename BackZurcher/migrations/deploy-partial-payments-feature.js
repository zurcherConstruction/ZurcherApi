/**
 * 🚀 DEPLOYMENT: Migración completa de Pagos Parciales para Gastos Fijos
 * 
 * Este script ejecuta todas las migraciones necesarias en el orden correcto:
 * 1. Actualizar estructura de FixedExpenses (totalAmount, paidAmount, paymentStatus)
 * 2. Crear tabla FixedExpensePayments
 * 3. Sincronizar gastos existentes marcados como pagados
 * 
 * Uso:
 *   LOCAL: node migrations/deploy-partial-payments-feature.js
 *   PRODUCCIÓN: NODE_ENV=production node migrations/deploy-partial-payments-feature.js
 * 
 * Seguridad:
 *   - Verifica cada paso antes de ejecutar
 *   - No elimina datos existentes
 *   - Puede ejecutarse múltiples veces sin problemas
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_DEPLOY, NODE_ENV } = process.env;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   🚀 DEPLOYMENT: Pagos Parciales para Gastos Fijos           ║');
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

async function step1_updateFixedExpenses() {
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ PASO 1: Actualizar estructura de FixedExpenses             │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('FixedExpenses');

  // Verificar si ya se ejecutó
  if (!columns.amount && columns.totalAmount && columns.paidAmount && columns.paymentStatus) {
    console.log('✅ Paso 1 ya ejecutado previamente. Saltando...\n');
    return;
  }

  // 1.1 Renombrar amount → totalAmount
  if (columns.amount) {
    console.log('  📝 Renombrando amount → totalAmount...');
    await queryInterface.renameColumn('FixedExpenses', 'amount', 'totalAmount');
    console.log('  ✅ Columna renombrada\n');
  }

  // 1.2 Agregar paidAmount
  if (!columns.paidAmount) {
    console.log('  📝 Agregando columna paidAmount...');
    await queryInterface.addColumn('FixedExpenses', 'paidAmount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
    console.log('  ✅ Columna paidAmount agregada\n');
  }

  // 1.3 Actualizar ENUM paymentStatus
  if (!columns.paymentStatus || !columns.paymentStatus_new) {
    console.log('  📝 Actualizando ENUM paymentStatus...');
    await sequelize.query('DROP TYPE IF EXISTS enum_FixedExpenses_paymentStatus CASCADE');
    await sequelize.query(`
      CREATE TYPE enum_FixedExpenses_paymentStatus AS ENUM (
        'unpaid', 'partial', 'paid', 'paid_via_invoice'
      )
    `);
    await sequelize.query(`
      ALTER TABLE "FixedExpenses" 
      ADD COLUMN IF NOT EXISTS "paymentStatus" enum_FixedExpenses_paymentStatus DEFAULT 'unpaid' NOT NULL
    `);
    await sequelize.query('ALTER TABLE "FixedExpenses" DROP COLUMN IF EXISTS "paymentStatus_new"');
    console.log('  ✅ ENUM paymentStatus actualizado\n');
  }

  console.log('✅ Paso 1 completado exitosamente\n');
}

async function step2_createPaymentsTable() {
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ PASO 2: Crear tabla FixedExpensePayments                   │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();

  if (tables.includes('FixedExpensePayments')) {
    console.log('✅ Tabla FixedExpensePayments ya existe. Saltando...\n');
    return;
  }

  console.log('  📝 Creando tabla FixedExpensePayments...');
  await queryInterface.createTable('FixedExpensePayments', {
    idPayment: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    fixedExpenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'FixedExpenses', key: 'idFixedExpense' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    paymentMethod: {
      type: DataTypes.ENUM(
        'Cap Trabajos Septic', 'Capital Proyectos Septic', 'Chase Bank',
        'AMEX', 'Chase Credit Card', 'Cheque', 'Transferencia Bancaria',
        'Efectivo', 'Zelle', 'Tarjeta Débito', 'PayPal', 'Otro'
      ),
      allowNull: true
    },
    receiptUrl: { type: DataTypes.STRING, allowNull: true },
    receiptPublicId: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Expenses', key: 'idExpense' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    createdByStaffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Staffs', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  console.log('  ✅ Tabla creada\n');

  console.log('  📝 Creando índices...');
  await queryInterface.addIndex('FixedExpensePayments', ['fixedExpenseId']);
  await queryInterface.addIndex('FixedExpensePayments', ['paymentDate']);
  await queryInterface.addIndex('FixedExpensePayments', ['expenseId']);
  console.log('  ✅ Índices creados\n');

  console.log('✅ Paso 2 completado exitosamente\n');
}

async function step3_syncExistingPaidExpenses() {
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ PASO 3: Sincronizar gastos fijos existentes pagados        │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const [needSync] = await sequelize.query(`
    SELECT COUNT(*) as count
    FROM "FixedExpenses"
    WHERE "paymentStatus" IN ('paid', 'paid_via_invoice')
      AND "paidAmount" = 0
  `);

  const count = parseInt(needSync[0].count);

  if (count === 0) {
    console.log('✅ No hay gastos que requieran sincronización\n');
    return;
  }

  console.log(`  📊 Encontrados ${count} gasto(s) marcado(s) como pagados`);
  console.log('  📝 Sincronizando paidAmount = totalAmount...');

  await sequelize.query(`
    UPDATE "FixedExpenses"
    SET "paidAmount" = "totalAmount"
    WHERE "paymentStatus" IN ('paid', 'paid_via_invoice')
      AND "paidAmount" = 0
  `);

  console.log(`  ✅ ${count} gasto(s) sincronizado(s)\n`);
  console.log('✅ Paso 3 completado exitosamente\n');
}

async function runDeployment() {
  try {
    console.log(`📊 Entorno: ${DB_DEPLOY ? '🔴 PRODUCCIÓN' : '🟢 LOCAL'}`);
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    await step1_updateFixedExpenses();
    await step2_createPaymentsTable();
    await step3_syncExistingPaidExpenses();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ DEPLOYMENT COMPLETADO                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Resumen de cambios:');
    console.log('  ✓ FixedExpenses.totalAmount (antes: amount)');
    console.log('  ✓ FixedExpenses.paidAmount (nuevo)');
    console.log('  ✓ FixedExpenses.paymentStatus incluye "partial"');
    console.log('  ✓ Tabla FixedExpensePayments creada');
    console.log('  ✓ Gastos existentes sincronizados\n');

    console.log('🎯 Próximos pasos:');
    console.log('  1. Verificar en la aplicación que los gastos fijos se muestran correctamente');
    console.log('  2. Probar registrar un pago parcial');
    console.log('  3. Verificar que se crea el Expense automáticamente\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN DEPLOYMENT:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

runDeployment();
