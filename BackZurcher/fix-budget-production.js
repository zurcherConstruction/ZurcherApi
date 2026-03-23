/**
 * Fix dos problemas en producción:
 * 1. Agrega 'pending' al ENUM enum_Budgets_status (si falta)
 * 2. Sincroniza la secuencia de idBudget con el valor actual máximo
 *
 * USO: node fix-budget-production.js
 * (Requiere DB_DEPLOY en .env)
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DB_DEPLOY = process.env.DB_DEPLOY;
if (!DB_DEPLOY) {
  console.error('❌ DB_DEPLOY no está configurado en .env');
  process.exit(1);
}

const conn = new Sequelize(DB_DEPLOY, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

async function fix() {
  await conn.authenticate();
  console.log('✅ Conectado a producción\n');

  // 1. Agregar 'pending' al ENUM si no existe
  console.log('1️⃣  Verificando enum_Budgets_status...');
  const [enumValues] = await conn.query(`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'enum_Budgets_status'
    ORDER BY e.enumsortorder;
  `);
  const values = enumValues.map(r => r.enumlabel);
  console.log('   Valores actuales:', values.join(', '));

  if (!values.includes('pending')) {
    await conn.query(`ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'pending';`);
    console.log('   ✅ "pending" agregado al ENUM');
  } else {
    console.log('   ✅ "pending" ya existe, sin cambios');
  }

  // 2. Sincronizar la secuencia de idBudget
  console.log('\n2️⃣  Sincronizando secuencia de idBudget...');
  const [[maxRow]] = await conn.query(`SELECT MAX("idBudget") as max_id FROM "Budgets";`);
  const maxId = maxRow.max_id || 2246;
  console.log(`   Máximo idBudget actual: ${maxId}`);

  // Verificar si existe la secuencia
  const [seqRows] = await conn.query(`
    SELECT pg_get_serial_sequence('"Budgets"', 'idBudget') as seq_name;
  `);
  const seqName = seqRows[0]?.seq_name;

  if (seqName) {
    await conn.query(`SELECT setval('${seqName}', ${maxId}, true);`);
    console.log(`   ✅ Secuencia "${seqName}" establecida en ${maxId}`);
  } else {
    console.log('   ⚠️  No se encontró secuencia para idBudget (puede ser normal si se maneja manualmente)');
  }

  console.log('\n✅ Migración completada');
  await conn.close();
}

fix().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
