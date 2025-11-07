/**
 * VERIFICAR Y AGREGAR COLUMNAS FALTANTES EN SUPPLIERINVOICES
 */

const { sequelize } = require('./src/data');

async function checkAndAddColumns() {
  try {
    await sequelize.authenticate();
    const dbName = process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'LOCAL';
    console.log(`✅ Conectado a base de datos: ${dbName}\n`);

    // Ver todas las columnas actuales
    console.log('📋 Columnas actuales en SupplierInvoices:\n');
    const [currentColumns] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'SupplierInvoices'
      ORDER BY ordinal_position;
    `);

    currentColumns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
    });
    console.log('');

    // Columnas que deberían existir
    const requiredColumns = [
      { name: 'status', type: 'VARCHAR(50)', default: "'pending'" },
      { name: 'description', type: 'TEXT', default: null },
      { name: 'receiptUrl', type: 'VARCHAR(500)', default: null },
      { name: 'receiptPublicId', type: 'VARCHAR(255)', default: null }
    ];

    console.log('🔍 Verificando columnas requeridas:\n');

    for (const col of requiredColumns) {
      const exists = currentColumns.some(c => c.column_name === col.name);
      
      if (!exists) {
        console.log(`❌ Falta columna: ${col.name}`);
        console.log(`   Agregando ${col.name}...`);
        
        const defaultClause = col.default ? `DEFAULT ${col.default}` : '';
        await sequelize.query(`
          ALTER TABLE "SupplierInvoices" 
          ADD COLUMN "${col.name}" ${col.type} ${defaultClause};
        `);
        
        console.log(`   ✅ Columna ${col.name} agregada\n`);
      } else {
        console.log(`✅ ${col.name} ya existe`);
      }
    }

    console.log('\n📊 Estructura final de SupplierInvoices:\n');
    const [finalColumns] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'SupplierInvoices'
      ORDER BY ordinal_position;
    `);

    finalColumns.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   ${index + 1}. ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${def}`);
    });

    console.log('\n✅ Verificación completada');
    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAndAddColumns();
