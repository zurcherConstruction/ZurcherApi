const { conn } = require('./src/data/index');

async function checkColumns() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    
    const [results] = await conn.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Permits'
      AND column_name IN (
        'isPBTS',
        'notificationEmails',
        'permitNumber'
      )
      ORDER BY column_name;
    `);
    
    console.log('📋 Columnas encontradas en la tabla Permits:\n');
    
    if (results.length === 0) {
      console.log('❌ Ninguna de las columnas nuevas existe aún\n');
    } else {
      results.forEach(col => {
        console.log(`✅ ${col.column_name.padEnd(25)} | Tipo: ${col.data_type.padEnd(20)} | Nullable: ${col.is_nullable} | Default: ${col.column_default || 'NULL'}`);
      });
      console.log('');
    }
    
    // Verificar índice único
    const [indexes] = await conn.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Permits' 
        AND indexname LIKE '%permit%';
    `);
    
    console.log('\n🔑 Índices relacionados con permit:');
    if (indexes.length === 0) {
      console.log('❌ No hay índices\n');
    } else {
      indexes.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
        console.log(`     ${idx.indexdef}\n`);
      });
    }
    
    const columnsToCheck = [
      'isPBTS',
      'notificationEmails',
      'permitNumber'
    ];
    
    const existingColumns = results.map(r => r.column_name);
    const missingColumns = columnsToCheck.filter(col => !existingColumns.includes(col));
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Columnas existentes: ${existingColumns.length}/${columnsToCheck.length}`);
    console.log(`   Columnas faltantes:  ${missingColumns.length}\n`);
    
    if (missingColumns.length > 0) {
      console.log('⚠️  Columnas que faltan por agregar:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('🎉 Todas las columnas ya existen!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.close();
    process.exit(0);
  }
}

checkColumns();
