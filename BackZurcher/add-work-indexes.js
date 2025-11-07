/**
 * SCRIPT: Agregar índices para optimizar queries de Work
 * 
 * Este script agrega índices en las foreign keys más usadas
 * para mejorar el performance de getWorkById
 */

const { sequelize } = require('./src/data');

async function addWorkIndexes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos\n');

    console.log('🔧 Agregando índices para optimizar queries de Work...\n');

    // Índices para Work
    const indexes = [
      // Work foreign keys
      { table: 'Works', column: 'idBudget', name: 'idx_work_budget' },
      { table: 'Works', column: 'propertyAddress', name: 'idx_work_property_address' },
      { table: 'Works', column: 'staffId', name: 'idx_work_staff' },
      
      // Material foreign key
      { table: 'Materials', column: 'workId', name: 'idx_material_work' },
      
      // Inspection foreign key
      { table: 'Inspections', column: 'workId', name: 'idx_inspection_work' },
      
      // InstallationDetail foreign key
      { table: 'InstallationDetails', column: 'workId', name: 'idx_installation_detail_work' },
      
      // MaterialSet foreign key
      { table: 'MaterialSets', column: 'workId', name: 'idx_material_set_work' },
      
      // Image foreign key
      { table: 'Images', column: 'workId', name: 'idx_image_work' },
      
      // Expense foreign key
      { table: 'Expenses', column: 'workId', name: 'idx_expense_work' },
      
      // ChangeOrder foreign key
      { table: 'ChangeOrders', column: 'workId', name: 'idx_change_order_work' },
      
      // FinalInvoice foreign key
      { table: 'FinalInvoices', column: 'workId', name: 'idx_final_invoice_work' },
      
      // Receipt indices (para el literal query)
      { table: 'Receipts', column: 'relatedModel', name: 'idx_receipt_related_model' },
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const idx of indexes) {
      try {
        // Verificar si el índice existe
        const [exists] = await sequelize.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = '${idx.table}' 
            AND indexname = '${idx.name}'
          );
        `);

        if (exists[0].exists) {
          console.log(`   ⏭️  ${idx.name} ya existe`);
          existingCount++;
        } else {
          // Crear índice
          await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "${idx.name}" 
            ON "${idx.table}"("${idx.column}");
          `);
          console.log(`   ✅ ${idx.name} creado en ${idx.table}(${idx.column})`);
          createdCount++;
        }
      } catch (error) {
        console.log(`   ⚠️  Error creando ${idx.name}: ${error.message}`);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   Índices creados: ${createdCount}`);
    console.log(`   Índices existentes: ${existingCount}`);
    console.log(`   Total procesados: ${indexes.length}`);
    
    console.log('\n✅ Script completado');
    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addWorkIndexes();
