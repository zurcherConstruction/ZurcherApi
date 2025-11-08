/**
 * Script Maestro para Deployment de Chase Credit Card en Producción
 * 
 * IMPORTANTE: Ejecutar este script SOLO en producción
 * PREREQUISITO: Hacer backup de base de datos
 * 
 * Ejecuta las 3 migraciones en orden y verifica cada una
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function runProductionMigrations() {
  try {
    console.log('🚀 DEPLOYMENT DE CHASE CREDIT CARD - PRODUCCIÓN');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a:', process.env.DB_HOST);
    console.log('   Base de datos:', process.env.DB_NAME);
    console.log('');

    // Confirmación de seguridad
    console.log('⚠️  ADVERTENCIA: Estás a punto de ejecutar migraciones en PRODUCCIÓN');
    console.log('');
    console.log('Por favor confirma:');
    console.log('1. ¿Hiciste backup de la base de datos? (CRÍTICO)');
    console.log('2. ¿Verificaste con verify-production-readiness.js?');
    console.log('3. ¿Estás en un momento de bajo tráfico?');
    console.log('');
    console.log('Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    const migrations = [
      {
        name: 'add-credit-card-transaction-fields',
        description: 'Agregar campos de tarjeta a SupplierInvoices',
        verify: async () => {
          const [result] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'SupplierInvoices'
            AND column_name IN ('transactionType', 'isCreditCard', 'balanceAfter');
          `);
          return result.length === 3;
        }
      },
      {
        name: 'add-paid-amount-to-expenses',
        description: 'Agregar campo paidAmount a Expenses',
        verify: async () => {
          const [result] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'Expenses' AND column_name = 'paidAmount';
          `);
          return result.length === 1;
        }
      },
      {
        name: 'add-partial-payment-status',
        description: 'Agregar valor "partial" al ENUM paymentStatus',
        verify: async () => {
          const [result] = await sequelize.query(`
            SELECT e.enumlabel FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'enum_Expenses_paymentStatus'
            AND e.enumlabel = 'partial';
          `);
          return result.length === 1;
        }
      }
    ];

    for (let i = 0; i < migrations.length; i++) {
      const mig = migrations[i];
      console.log(`\n${'═'.repeat(63)}`);
      console.log(`📦 MIGRACIÓN ${i + 1}/${migrations.length}: ${mig.name}`);
      console.log(`   ${mig.description}`);
      console.log(`${'═'.repeat(63)}\n`);

      // Verificar si ya está aplicada
      const alreadyApplied = await mig.verify();
      if (alreadyApplied) {
        console.log('✅ Ya aplicada, saltando...\n');
        continue;
      }

      // Cargar y ejecutar migración
      const migrationPath = path.join(__dirname, 'migrations', `${mig.name}.js`);
      const migration = require(migrationPath);

      console.log(`▶️  Ejecutando ${mig.name}...\n`);
      await migration.up(sequelize.getQueryInterface(), Sequelize);

      // Verificar que se aplicó correctamente
      const verified = await mig.verify();
      if (!verified) {
        throw new Error(`Migración ${mig.name} no se verificó correctamente`);
      }

      console.log(`\n✅ Migración ${mig.name} completada y verificada\n`);
      
      // Pausa entre migraciones
      if (i < migrations.length - 1) {
        console.log('⏸️  Pausa de 2 segundos antes de siguiente migración...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Verificación final
    console.log('\n' + '═'.repeat(63));
    console.log('🔍 VERIFICACIÓN FINAL');
    console.log('═'.repeat(63) + '\n');

    // Contar expenses con Chase Credit Card
    const [expenses] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount,
        SUM("paidAmount") as total_paid
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card';
    `);

    if (expenses[0]) {
      console.log('📊 Expenses con Chase Credit Card:');
      console.log(`   Total: ${expenses[0].total}`);
      console.log(`   Monto total: $${parseFloat(expenses[0].total_amount || 0).toFixed(2)}`);
      console.log(`   Pagado total: $${parseFloat(expenses[0].total_paid || 0).toFixed(2)}`);
      console.log(`   Pendiente: $${(parseFloat(expenses[0].total_amount || 0) - parseFloat(expenses[0].total_paid || 0)).toFixed(2)}`);
    }

    console.log('\n' + '═'.repeat(63));
    console.log('🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(63));
    console.log('\n✅ Próximos pasos:');
    console.log('   1. Deploy del código (merge yani64 → main)');
    console.log('   2. Verificar logs de Railway');
    console.log('   3. Probar endpoint GET /credit-card/balance');
    console.log('   4. Crear transacción de prueba pequeña\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR DURANTE MIGRACIÓN:', error.message);
    console.error('\n⚠️  ACCIÓN REQUERIDA:');
    console.error('   1. Verificar estado de la base de datos');
    console.error('   2. Restaurar backup si es necesario');
    console.error('   3. Revisar logs para identificar el problema\n');
    console.error(error.stack);
    process.exit(1);
  }
}

runProductionMigrations();
