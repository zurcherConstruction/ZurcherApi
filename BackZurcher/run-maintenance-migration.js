// Script para ejecutar migración de campos de cancelación
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('🔧 Iniciando migración de campos de cancelación...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Verificar si las columnas ya existen
    console.log('📋 Verificando columnas existentes...');
    const existingColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'MaintenanceVisits' 
      AND column_name IN ('cancellation_reason', 'cancellation_date', 'rescheduled_date')
    `);
    
    if (existingColumns.rows.length > 0) {
      console.log('⚠️ Algunas columnas ya existen:', existingColumns.rows.map(r => r.column_name));
    }

    // 2. Verificar estados ENUM existentes
    console.log('🔍 Verificando estados ENUM...');
    const enumResult = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'maintenance_visit_status'
    `);
    
    const existingStates = enumResult.rows.map(row => row.enumlabel);
    const requiredStates = ['cancelled_by_client', 'postponed_no_access', 'cancelled_other'];
    const missingStates = requiredStates.filter(state => !existingStates.includes(state));
    
    console.log('Estados existentes:', existingStates);
    console.log('Estados faltantes:', missingStates);

    // 3. Agregar nuevos estados ENUM si faltan
    if (missingStates.length > 0) {
      console.log('➕ Agregando estados ENUM faltantes...');
      for (const state of missingStates) {
        try {
          await pool.query(`ALTER TYPE maintenance_visit_status ADD VALUE '${state}'`);
          console.log(`✅ Estado agregado: ${state}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️ Estado ya existe: ${state}`);
          } else {
            throw error;
          }
        }
      }
    }

    // 4. Agregar columnas si no existen
    const columnsToAdd = [
      { 
        name: 'cancellation_reason', 
        type: 'TEXT',
        comment: 'Motivo detallado de cancelación o postergación'
      },
      { 
        name: 'cancellation_date', 
        type: 'TIMESTAMP',
        comment: 'Fecha en que se canceló o postergó'
      },
      { 
        name: 'rescheduled_date', 
        type: 'DATE',
        comment: 'Nueva fecha propuesta cuando se posterga'
      }
    ];

    for (const column of columnsToAdd) {
      const columnExists = existingColumns.rows.some(row => row.column_name === column.name);
      
      if (!columnExists) {
        console.log(`➕ Agregando columna: ${column.name}...`);
        await pool.query(`
          ALTER TABLE "MaintenanceVisits" 
          ADD COLUMN ${column.name} ${column.type}
        `);
        
        // Agregar comentario
        await pool.query(`
          COMMENT ON COLUMN "MaintenanceVisits".${column.name} IS '${column.comment}'
        `);
        
        console.log(`✅ Columna agregada: ${column.name}`);
      } else {
        console.log(`⚠️ Columna ya existe: ${column.name}`);
      }
    }

    // 5. Crear índices para optimización
    console.log('🏗️ Creando índices...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_maintenance_visits_status 
        ON "MaintenanceVisits"(status)
      `);
      console.log('✅ Índice de status creado');
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_maintenance_visits_cancellation_date 
        ON "MaintenanceVisits"(cancellation_date)
      `);
      console.log('✅ Índice de cancellation_date creado');
    } catch (error) {
      console.log('⚠️ Error creando índices (pueden ya existir):', error.message);
    }

    // 6. Verificación final
    console.log('\n📊 Verificación final...');
    const finalCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'MaintenanceVisits' 
      AND column_name IN ('cancellation_reason', 'cancellation_date', 'rescheduled_date')
      ORDER BY column_name
    `);
    
    console.log('Columnas creadas:');
    finalCheck.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log('\n🎉 ¡Migración completada exitosamente!');
    return true;

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('Stack completo:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Ejecutar migración
if (require.main === module) {
  runMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };