const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Usar DB_DEPLOY explícitamente (Railway URL)
const sequelize = new Sequelize(process.env.DB_DEPLOY, {
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function runRailwayMigrations() {
  try {
    console.log('🚂 EJECUTANDO MIGRACIONES EN RAILWAY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    const [dbInfo] = await sequelize.query("SELECT current_database()");
    console.log(`✅ Conectado a: ${dbInfo[0].current_database}`);
    console.log(`   Host: ${sequelize.config.host}\n`);

    // Verificar estado actual
    console.log('🔍 Estado ANTES de migraciones:');
    const [paidAmountCheck] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Expenses' AND column_name = 'paidAmount';
    `);
    const [partialCheck] = await sequelize.query(`
      SELECT e.enumlabel FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Expenses_paymentStatus' AND e.enumlabel = 'partial';
    `);
    console.log(`   paidAmount: ${paidAmountCheck.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    console.log(`   ENUM partial: ${partialCheck.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}\n`);

    const migrations = [];

    // Migración 2: paidAmount
    if (paidAmountCheck.length === 0) {
      migrations.push({
        name: 'add-paid-amount-to-expenses',
        description: 'Agregar paidAmount a Expenses'
      });
    }

    // Migración 3: partial
    if (partialCheck.length === 0) {
      migrations.push({
        name: 'add-partial-payment-status',
        description: 'Agregar "partial" al ENUM'
      });
    }

    if (migrations.length === 0) {
      console.log('✅ Todas las migraciones ya están aplicadas\n');
      process.exit(0);
    }

    console.log(`⚠️  ${migrations.length} migración(es) pendiente(s):\n`);
    migrations.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ${m.name}`);
      console.log(`      ${m.description}`);
    });
    console.log('\n⏳ Esperando 3 segundos antes de ejecutar...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Ejecutar migraciones
    for (const mig of migrations) {
      console.log(`${'═'.repeat(63)}`);
      console.log(`📦 Ejecutando: ${mig.name}`);
      console.log(`${'═'.repeat(63)}\n`);

      const migrationPath = path.join(__dirname, 'migrations', `${mig.name}.js`);
      const migration = require(migrationPath);

      await migration.up(sequelize.getQueryInterface(), Sequelize);
      console.log(`\n✅ Completada: ${mig.name}\n`);
    }

    // Verificar estado DESPUÉS
    console.log('\n' + '═'.repeat(63));
    console.log('🔍 Estado DESPUÉS de migraciones:');
    console.log('═'.repeat(63) + '\n');

    const [paidAmountAfter] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Expenses' AND column_name = 'paidAmount';
    `);
    const [partialAfter] = await sequelize.query(`
      SELECT e.enumlabel FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_Expenses_paymentStatus' AND e.enumlabel = 'partial';
    `);

    console.log(`   paidAmount: ${paidAmountAfter.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    console.log(`   ENUM partial: ${partialAfter.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`);

    // Contar expenses actualizados
    const [expenses] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card';
    `);
    console.log(`   Expenses Chase CC: ${expenses[0].total}\n`);

    console.log('═'.repeat(63));
    console.log('🎉 MIGRACIONES COMPLETADAS EN RAILWAY');
    console.log('═'.repeat(63) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runRailwayMigrations();
