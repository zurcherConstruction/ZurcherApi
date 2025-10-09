/**
 * Script para verificar el estado de paymentMethod en la base de datos
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function checkPaymentMethods() {
  try {
    console.log('🔍 Conectando a la base de datos...\n');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Verificar valores únicos en Expenses
    console.log('📊 TABLA EXPENSES - Métodos de pago únicos:');
    console.log('─'.repeat(60));
    const [expenseMethods] = await sequelize.query(`
      SELECT 
        "paymentMethod",
        COUNT(*) as cantidad
      FROM "Expenses"
      WHERE "paymentMethod" IS NOT NULL
      GROUP BY "paymentMethod"
      ORDER BY cantidad DESC
    `);

    if (expenseMethods.length === 0) {
      console.log('  (No hay registros con paymentMethod)');
    } else {
      expenseMethods.forEach(row => {
        console.log(`  ✓ ${row.paymentMethod.padEnd(30)} - ${row.cantidad} registro(s)`);
      });
    }

    // Verificar valores únicos en Incomes
    console.log('\n📊 TABLA INCOMES - Métodos de pago únicos:');
    console.log('─'.repeat(60));
    const [incomeMethods] = await sequelize.query(`
      SELECT 
        "paymentMethod",
        COUNT(*) as cantidad
      FROM "Incomes"
      WHERE "paymentMethod" IS NOT NULL
      GROUP BY "paymentMethod"
      ORDER BY cantidad DESC
    `);

    if (incomeMethods.length === 0) {
      console.log('  (No hay registros con paymentMethod)');
    } else {
      incomeMethods.forEach(row => {
        console.log(`  ✓ ${row.paymentMethod.padEnd(30)} - ${row.cantidad} registro(s)`);
      });
    }

    // Verificar ENUM actual en la base de datos
    console.log('\n🔧 ENUM DEFINIDO EN LA BASE DE DATOS:');
    console.log('─'.repeat(60));
    const [enumValues] = await sequelize.query(`
      SELECT 
        e.enumlabel as valor
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'enum_Expenses_paymentMethod'
      ORDER BY e.enumsortorder
    `);

    enumValues.forEach((row, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}. ${row.valor}`);
    });

    // Verificar si hay valores inválidos
    console.log('\n⚠️  VERIFICANDO VALORES INVÁLIDOS:');
    console.log('─'.repeat(60));
    
    const validValues = enumValues.map(row => row.valor);
    
    const [invalidExpenses] = await sequelize.query(`
      SELECT 
        "paymentMethod",
        COUNT(*) as cantidad
      FROM "Expenses"
      WHERE "paymentMethod" IS NOT NULL 
      AND "paymentMethod" NOT IN (:validValues)
      GROUP BY "paymentMethod"
    `, {
      replacements: { validValues }
    });

    const [invalidIncomes] = await sequelize.query(`
      SELECT 
        "paymentMethod",
        COUNT(*) as cantidad
      FROM "Incomes"
      WHERE "paymentMethod" IS NOT NULL 
      AND "paymentMethod" NOT IN (:validValues)
      GROUP BY "paymentMethod"
    `, {
      replacements: { validValues }
    });

    if (invalidExpenses.length === 0 && invalidIncomes.length === 0) {
      console.log('  ✅ No se encontraron valores inválidos');
    } else {
      if (invalidExpenses.length > 0) {
        console.log('  ❌ Expenses con valores inválidos:');
        invalidExpenses.forEach(row => {
          console.log(`     - "${row.paymentMethod}" (${row.cantidad} registros)`);
        });
      }
      if (invalidIncomes.length > 0) {
        console.log('  ❌ Incomes con valores inválidos:');
        invalidIncomes.forEach(row => {
          console.log(`     - "${row.paymentMethod}" (${row.cantidad} registros)`);
        });
      }
    }

    // Resumen general
    console.log('\n📈 RESUMEN GENERAL:');
    console.log('─'.repeat(60));
    
    const [summary] = await sequelize.query(`
      SELECT 
        'Expenses' as tabla,
        COUNT(*) as total,
        COUNT("paymentMethod") as con_metodo,
        COUNT(*) - COUNT("paymentMethod") as sin_metodo,
        ROUND(COUNT("paymentMethod")::numeric / COUNT(*)::numeric * 100, 1) as porcentaje
      FROM "Expenses"
      UNION ALL
      SELECT 
        'Incomes' as tabla,
        COUNT(*) as total,
        COUNT("paymentMethod") as con_metodo,
        COUNT(*) - COUNT("paymentMethod") as sin_metodo,
        ROUND(COUNT("paymentMethod")::numeric / COUNT(*)::numeric * 100, 1) as porcentaje
      FROM "Incomes"
    `);

    summary.forEach(row => {
      console.log(`  ${row.tabla.padEnd(10)} - ${row.total} total | ${row.con_metodo} con método (${row.porcentaje}%) | ${row.sin_metodo} sin método`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

checkPaymentMethods();
