/**
 * ANÁLISIS: Identificar qué parte del query de getWorkById es más lento
 * 
 * Este script ejecuta EXPLAIN ANALYZE en el query principal
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const isDeploy = !!process.env.DB_DEPLOY;
const databaseUrl = isDeploy ? process.env.DB_DEPLOY : null;

console.log(`📊 Base de datos: ${isDeploy ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );
}

async function analyzeWorkQuery() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    // Work ID que tarda más (el del ejemplo: 03159e15-3eca-48f7-8a18-663fe74a4233)
    const workId = '03159e15-3eca-48f7-8a18-663fe74a4233';

    console.log(`🔍 Analizando query para work ${workId}...\n`);

    // Contar registros relacionados
    const counts = await Promise.all([
      sequelize.query(`SELECT COUNT(*) as count FROM "Materials" WHERE "workId" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "Inspections" WHERE "workId" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "InstallationDetails" WHERE "idWork" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "MaterialSets" WHERE "workId" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "Images" WHERE "idWork" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "Expenses" WHERE "workId" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "ChangeOrders" WHERE "workId" = '${workId}'`),
      sequelize.query(`SELECT COUNT(*) as count FROM "FinalInvoices" WHERE "workId" = '${workId}'`),
    ]);

    console.log('📊 Registros relacionados:');
    console.log(`   Materials: ${counts[0][0][0].count}`);
    console.log(`   Inspections: ${counts[1][0][0].count}`);
    console.log(`   InstallationDetails: ${counts[2][0][0].count}`);
    console.log(`   MaterialSets: ${counts[3][0][0].count}`);
    console.log(`   Images: ${counts[4][0][0].count}`);
    console.log(`   Expenses: ${counts[5][0][0].count}`);
    console.log(`   ChangeOrders: ${counts[6][0][0].count}`);
    console.log(`   FinalInvoices: ${counts[7][0][0].count}`);

    console.log('\n🔍 Ejecutando EXPLAIN ANALYZE en query principal...\n');

    // Query simplificado para análisis
    const [results] = await sequelize.query(`
      EXPLAIN ANALYZE
      SELECT w.* 
      FROM "Works" w
      LEFT JOIN "Budgets" b ON w."idBudget" = b."idBudget"
      LEFT JOIN "Permits" p ON w."propertyAddress" = p."propertyAddress"
      LEFT JOIN "Materials" m ON w."idWork" = m."workId"
      LEFT JOIN "Inspections" i ON w."idWork" = i."workId"
      LEFT JOIN "InstallationDetails" id ON w."idWork" = id."idWork"
      LEFT JOIN "MaterialSets" ms ON w."idWork" = ms."workId"
      LEFT JOIN "Images" img ON w."idWork" = img."idWork"
      LEFT JOIN "Expenses" e ON w."idWork" = e."workId"
      LEFT JOIN "ChangeOrders" co ON w."idWork" = co."workId"
      LEFT JOIN "FinalInvoices" fi ON w."idWork" = fi."workId"
      WHERE w."idWork" = '${workId}'
    `);

    console.log('📈 Resultados de EXPLAIN ANALYZE:\n');
    results.forEach(row => console.log(row['QUERY PLAN']));

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
    process.exit(1);
  }
}

analyzeWorkQuery();
