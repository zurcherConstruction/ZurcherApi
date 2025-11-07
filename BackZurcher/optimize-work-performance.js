/**
 * MIGRACIÓN: Agregar índices para mejorar performance de queries en Works
 * 
 * Los índices en foreign keys aceleran los JOINs significativamente.
 * Esto puede reducir queries de 8+ segundos a menos de 1 segundo.
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Usar DB_DEPLOY si está disponible, sino usar base de datos local
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
    logging: false
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
      logging: false
    }
  );
}

async function addWorkIndexes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    console.log('🔧 Agregando índices para mejorar performance...\n');

    const indexes = [
      // Índices en Works
      { table: 'Works', column: 'idBudget', name: 'idx_works_budget' },
      { table: 'Works', column: 'propertyAddress', name: 'idx_works_property' },
      { table: 'Works', column: 'staffId', name: 'idx_works_staff' },
      { table: 'Works', column: 'status', name: 'idx_works_status' },
      
      // Índices en Materials
      { table: 'Materials', column: 'workId', name: 'idx_materials_work' },
      
      // Índices en Inspections
      { table: 'Inspections', column: 'workId', name: 'idx_inspections_work' },
      
      // Índices en InstallationDetails
      { table: 'InstallationDetails', column: 'idWork', name: 'idx_installation_work' },
      
      // Índices en MaterialSets
      { table: 'MaterialSets', column: 'workId', name: 'idx_materialsets_work' },
      
      // Índices en Images
      { table: 'Images', column: 'idWork', name: 'idx_images_work' },
      
      // Índices en Expenses
      { table: 'Expenses', column: 'workId', name: 'idx_expenses_work' },
      
      // Índices en Receipts
      { table: 'Receipts', column: 'relatedId', name: 'idx_receipts_related' },
      { table: 'Receipts', column: 'relatedModel', name: 'idx_receipts_model' },
      
      // Índices en ChangeOrders
      { table: 'ChangeOrders', column: 'workId', name: 'idx_changeorders_work' },
      
      // Índices en FinalInvoices
      { table: 'FinalInvoices', column: 'workId', name: 'idx_finalinvoices_work' },
      { table: 'FinalInvoices', column: 'budgetId', name: 'idx_finalinvoices_budget' },
    ];

    let created = 0;
    let skipped = 0;

    for (const index of indexes) {
      try {
        // Verificar si el índice ya existe
        const [exists] = await sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = '${index.name}'
          );
        `);

        if (exists[0].exists) {
          console.log(`⏭️  ${index.name} ya existe`);
          skipped++;
        } else {
          // Crear el índice
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "${index.name}" 
            ON "${index.table}" ("${index.column}");
          `);
          console.log(`✅ Índice creado: ${index.name} en ${index.table}(${index.column})`);
          created++;
        }
      } catch (error) {
        console.error(`❌ Error creando ${index.name}:`, error.message);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Índices creados: ${created}`);
    console.log(`   ⏭️  Índices ya existentes: ${skipped}`);
    console.log(`\n🎉 Proceso completado. Los queries deberían ser mucho más rápidos ahora.\n`);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('\nDetalles:', error.message);
    process.exit(1);
  }
}

addWorkIndexes();
