const { Client } = require('pg');
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = require('./src/config/envs');

const client = new Client({
  connectionString: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
});

async function investigateDependencies() {
  try {
    console.log('\n🔍 Investigando dependencias...\n');
    await client.connect();
    
    // Verificar Foreign Keys que apuntan a Permits
    const fks = await client.query(`
      SELECT 
        tc.table_name as tabla_origen,
        kcu.column_name as columna_origen,
        ccu.table_name as tabla_destino,
        ccu.column_name as columna_destino,
        tc.constraint_name as fk_nombre
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'Permits'
      ORDER BY tc.table_name;
    `);
    
    console.log('📋 Foreign Keys que apuntan a Permits:\n');
    if (fks.rows.length === 0) {
      console.log('   ✅ No hay Foreign Keys apuntando a Permits\n');
    } else {
      fks.rows.forEach(fk => {
        console.log(`   ${fk.tabla_origen}.${fk.columna_origen} → Permits.${fk.columna_destino}`);
        console.log(`   FK: ${fk.fk_nombre}\n`);
      });
    }
    
    // Verificar la relación Works → Permits
    const worksRelation = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'Works'
        AND kcu.column_name = 'propertyAddress'
      ORDER BY tc.constraint_type;
    `);
    
    console.log('🔗 Constraints en Works.propertyAddress:\n');
    if (worksRelation.rows.length === 0) {
      console.log('   ℹ️  No hay constraints en Works.propertyAddress\n');
    } else {
      worksRelation.rows.forEach(rel => {
        console.log(`   ${rel.constraint_type}: ${rel.constraint_name}`);
      });
      console.log();
    }
    
    // Ver la definición del modelo Works
    const worksColumns = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Works'
        AND column_name = 'propertyAddress';
    `);
    
    console.log('📝 Definición de Works.propertyAddress:\n');
    if (worksColumns.rows.length > 0) {
      const col = worksColumns.rows[0];
      console.log(`   Tipo: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
      console.log(`   Nullable: ${col.is_nullable}\n`);
    }
    
    // Verificar constraints duplicadas y sus dependencias
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 ANÁLISIS DEL PROBLEMA:\n');
    
    const constraintCheck = await client.query(`
      SELECT COUNT(*) as total
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Permits'
        AND constraint_type = 'UNIQUE'
        AND constraint_name ~ '^Permits_propertyAddress_key[0-9]+$';
    `);
    
    console.log(`📊 Constraints UNIQUE duplicadas en Permits.propertyAddress: ${constraintCheck.rows[0].total}`);
    
    // Verificar si Works tiene FK a Permits por propertyAddress
    const worksFKCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'Works'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'propertyAddress'
          AND ccu.table_name = 'Permits'
      ) as tiene_fk;
    `);
    
    const hasFk = worksFKCheck.rows[0].tiene_fk;
    
    console.log(`\n❓ ¿Works.propertyAddress tiene FK a Permits? ${hasFk ? '✅ SÍ' : '❌ NO'}`);
    
    if (hasFk) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
      console.log('   Works tiene Foreign Key a Permits.propertyAddress');
      console.log('   Las constraints duplicadas tienen dependencias (la FK)');
      console.log('   No se pueden eliminar sin CASCADE o sin redefinir la FK\n');
      
      console.log('💡 SOLUCIONES:');
      console.log('   1. Eliminar constraints con CASCADE (puede romper la FK)');
      console.log('   2. Redefinir la FK para que apunte solo a la constraint original');
      console.log('   3. Eliminar la FK temporalmente, limpiar constraints, recrear FK\n');
    } else {
      console.log('\n✅ No hay FK directa por propertyAddress');
      console.log('   El problema debe ser otro. Investigando más...\n');
    }
    
    await client.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

investigateDependencies();
