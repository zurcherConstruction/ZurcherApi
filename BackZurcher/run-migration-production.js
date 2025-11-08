/**
 * Script para ejecutar la migración de linkedByStaffId en PRODUCCIÓN
 * 
 * INSTRUCCIONES:
 * 1. Obtén la DATABASE_URL de Railway (Variables > DATABASE_URL)
 * 2. Ejecuta: node run-migration-production.js
 * 3. Ingresa la DATABASE_URL cuando se te solicite
 */

const readline = require('readline');
const { Sequelize } = require('sequelize');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runMigration() {
  try {
    console.log('🚀 MIGRACIÓN DE PRODUCCIÓN - linkedByStaffId');
    console.log('═'.repeat(60));
    console.log('');
    
    const databaseUrl = await askQuestion('Ingresa la DATABASE_URL de Railway:\n> ');
    
    if (!databaseUrl || !databaseUrl.includes('postgres://')) {
      console.error('❌ URL de base de datos inválida');
      rl.close();
      return;
    }

    console.log('\n🔌 Conectando a base de datos de producción...');
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Verificar si la columna ya existe
    console.log('\n🔍 Verificando si la columna linkedByStaffId existe...');
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SupplierInvoiceExpenses' 
      AND column_name = 'linkedByStaffId';
    `);

    if (results.length > 0) {
      console.log('⚠️  La columna linkedByStaffId ya existe en SupplierInvoiceExpenses');
      console.log('✅ No se requiere migración');
      rl.close();
      await sequelize.close();
      return;
    }

    console.log('📝 Columna NO existe. Procediendo con migración...');
    console.log('');

    // Ejecutar migración
    await sequelize.query(`
      ALTER TABLE "SupplierInvoiceExpenses"
      ADD COLUMN "linkedByStaffId" UUID REFERENCES "Staffs"(id) ON DELETE SET NULL;
    `);

    console.log('✅ Columna linkedByStaffId agregada exitosamente');

    // Agregar comentario
    await sequelize.query(`
      COMMENT ON COLUMN "SupplierInvoiceExpenses"."linkedByStaffId" 
      IS 'Staff que vinculó el invoice con el expense';
    `);

    console.log('✅ Comentario agregado');
    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log('');
    console.log('🎉 Ahora puedes pagar supplier invoices sin errores!');

    rl.close();
    await sequelize.close();

  } catch (error) {
    console.error('');
    console.error('❌ ERROR EJECUTANDO MIGRACIÓN:');
    console.error('═'.repeat(60));
    console.error(error);
    console.error('═'.repeat(60));
    rl.close();
    process.exit(1);
  }
}

runMigration();
