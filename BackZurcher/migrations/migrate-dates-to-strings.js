/**
 * Migración: Convertir campos de fecha de DATEONLY a STRING
 * 
 * Este script convierte las fechas existentes en la base de datos
 * de tipo DATEONLY/DATE a STRING formato YYYY-MM-DD
 * 
 * Tablas afectadas:
 * - Budgets.commissionPaidDate
 * - Incomes.date
 * - Expenses.date
 */

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Usar DATABASE_URL si existe, sino usar variables individuales
let sequelize;

if (process.env.DATABASE_URL || process.env.DB_DEPLOY) {
  const dbUrl = process.env.DATABASE_URL || process.env.DB_DEPLOY;
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  });
} else if (process.env.DB_NAME && process.env.DB_USER) {
  // Usar variables individuales
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  );
} else {
  console.error('❌ Error: No se encontró configuración de base de datos en .env');
  console.log('📝 Necesitas tener DATABASE_URL o DB_NAME, DB_USER, DB_PASSWORD en tu .env');
  process.exit(1);
}

// Función helper para formatear fecha
const formatDateLocal = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function migrateDatesToStrings() {
  try {
    console.log('🔄 Iniciando migración de fechas a strings...\n');

    // 1. Migrar Budgets.commissionPaidDate
    console.log('📋 Migrando Budgets.commissionPaidDate...');
    
    // Primero, cambiar el tipo de columna a VARCHAR
    await sequelize.query(`
      ALTER TABLE "Budgets" 
      ALTER COLUMN "commissionPaidDate" TYPE VARCHAR(10) 
      USING CASE 
        WHEN "commissionPaidDate" IS NULL THEN NULL
        ELSE TO_CHAR("commissionPaidDate", 'YYYY-MM-DD')
      END;
    `);
    
    console.log('✅ Budgets.commissionPaidDate migrado correctamente');

    // 2. Migrar Incomes.date
    console.log('\n📋 Migrando Incomes.date...');
    
    await sequelize.query(`
      ALTER TABLE "Incomes" 
      ALTER COLUMN "date" TYPE VARCHAR(10) 
      USING TO_CHAR("date", 'YYYY-MM-DD');
    `);
    
    console.log('✅ Incomes.date migrado correctamente');

    // 3. Migrar Expenses.date
    console.log('\n📋 Migrando Expenses.date...');
    
    await sequelize.query(`
      ALTER TABLE "Expenses" 
      ALTER COLUMN "date" TYPE VARCHAR(10) 
      USING TO_CHAR("date", 'YYYY-MM-DD');
    `);
    
    console.log('✅ Expenses.date migrado correctamente');

    // Verificar algunos registros
    console.log('\n🔍 Verificando datos migrados...');
    
    const [budgets] = await sequelize.query(`
      SELECT "idBudget", "propertyAddress", "commissionPaidDate" 
      FROM "Budgets" 
      WHERE "commissionPaidDate" IS NOT NULL 
      LIMIT 5
    `);
    
    const [incomes] = await sequelize.query(`
      SELECT "idIncome", "date", "amount" 
      FROM "Incomes" 
      ORDER BY "date" DESC 
      LIMIT 5
    `);
    
    const [expenses] = await sequelize.query(`
      SELECT "idExpense", "date", "amount" 
      FROM "Expenses" 
      ORDER BY "date" DESC 
      LIMIT 5
    `);

    console.log('\n📊 Ejemplos de registros migrados:');
    console.log('\nBudgets con commissionPaidDate:');
    budgets.forEach(b => {
      console.log(`  - ${b.propertyAddress}: ${b.commissionPaidDate} (${typeof b.commissionPaidDate})`);
    });

    console.log('\nIncomes recientes:');
    incomes.forEach(i => {
      console.log(`  - Fecha: ${i.date} (${typeof i.date}) - Monto: $${i.amount}`);
    });

    console.log('\nExpenses recientes:');
    expenses.forEach(e => {
      console.log(`  - Fecha: ${e.date} (${typeof e.date}) - Monto: $${e.amount}`);
    });

    console.log('\n✅ Migración completada exitosamente!');
    console.log('📝 Todas las fechas ahora están en formato STRING (YYYY-MM-DD)');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateDatesToStrings()
    .then(() => {
      console.log('\n🎉 Script de migración finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatesToStrings };
