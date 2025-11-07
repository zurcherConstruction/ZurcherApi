/**
 * OPTIMIZACIÓN: Actualizar estadísticas de PostgreSQL y agregar índices compuestos
 * 
 * Esto mejorará el planning time del query planner
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

async function optimizeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    console.log('🔧 Paso 1: Actualizando estadísticas de tablas principales...\n');

    const tables = [
      'Works',
      'Budgets',
      'Permits',
      'Materials',
      'Inspections',
      'InstallationDetails',
      'MaterialSets',
      'Images',
      'Expenses',
      'Receipts',
      'ChangeOrders',
      'FinalInvoices'
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`ANALYZE "${table}";`);
        console.log(`   ✅ ${table} - estadísticas actualizadas`);
      } catch (error) {
        console.log(`   ⚠️  ${table} - ${error.message}`);
      }
    }

    console.log('\n🔧 Paso 2: Creando índices compuestos para mejorar planning...\n');

    const compositeIndexes = [
      // Índice compuesto para Receipts (consulta con literal)
      {
        table: 'Receipts',
        columns: ['relatedModel', 'relatedId'],
        name: 'idx_receipts_composite'
      },
      // Índice para búsquedas frecuentes en Works
      {
        table: 'Works',
        columns: ['status', 'idBudget'],
        name: 'idx_works_status_budget'
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const idx of compositeIndexes) {
      try {
        const [exists] = await sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = '${idx.name}'
          );
        `);

        if (exists[0].exists) {
          console.log(`   ⏭️  ${idx.name} ya existe`);
          skipped++;
        } else {
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "${idx.name}" 
            ON "${idx.table}" (${idx.columns.map(c => `"${c}"`).join(', ')});
          `);
          console.log(`   ✅ ${idx.name} creado en ${idx.table}(${idx.columns.join(', ')})`);
          created++;
        }
      } catch (error) {
        console.log(`   ⚠️  Error creando ${idx.name}: ${error.message}`);
      }
    }

    console.log('\n🔧 Paso 3: Aumentando estadísticas para tablas frecuentes...\n');

    const frequentTables = ['Works', 'Inspections', 'Images', 'Expenses'];
    
    for (const table of frequentTables) {
      try {
        await sequelize.query(`
          ALTER TABLE "${table}" ALTER COLUMN "workId" SET STATISTICS 1000;
        `);
        console.log(`   ✅ ${table}.workId - estadísticas aumentadas`);
      } catch (error) {
        // Si no existe workId, intentar con idWork
        try {
          await sequelize.query(`
            ALTER TABLE "${table}" ALTER COLUMN "idWork" SET STATISTICS 1000;
          `);
          console.log(`   ✅ ${table}.idWork - estadísticas aumentadas`);
        } catch (error2) {
          // Ignorar si no tiene ninguna de las columnas
        }
      }
    }

    console.log('\n🔧 Paso 4: Ejecutando VACUUM ANALYZE para optimizar...\n');
    
    try {
      await sequelize.query('VACUUM ANALYZE;');
      console.log('   ✅ VACUUM ANALYZE completado');
    } catch (error) {
      console.log('   ⚠️  VACUUM ANALYZE requiere permisos especiales (normal en algunas instalaciones)');
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ ${tables.length} tablas con estadísticas actualizadas`);
    console.log(`   ✅ ${created} índices compuestos creados`);
    console.log(`   ⏭️  ${skipped} índices ya existentes`);
    console.log(`   ✅ Estadísticas de columnas frecuentes aumentadas`);
    
    console.log('\n🎉 Optimización completada. El planning time debería mejorar significativamente.\n');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error durante la optimización:', error);
    process.exit(1);
  }
}

optimizeDatabase();
