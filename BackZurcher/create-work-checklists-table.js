const { conn } = require('./src/data');

/**
 * Script para crear la tabla WorkChecklists en producción
 * Ejecuta la migración SQL de forma segura
 */

async function createWorkChecklistsTable() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos\n');
    console.log('🔄 Ejecutando migración: Crear tabla WorkChecklists...\n');
    console.log('═'.repeat(80));
    
    // SQL para crear la tabla WorkChecklists
    const createTableSQL = `
      -- Crear tabla WorkChecklists
      CREATE TABLE IF NOT EXISTS "WorkChecklists" (
        "idWorkChecklist" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "workId" UUID NOT NULL UNIQUE,
        "arenaExpenseReviewed" BOOLEAN DEFAULT FALSE,
        "finalInvoiceSent" BOOLEAN DEFAULT FALSE,
        "materialesInicialesUploaded" BOOLEAN DEFAULT FALSE,
        "feeInspectionPaid" BOOLEAN DEFAULT FALSE,
        "initialInspectionPaid" BOOLEAN DEFAULT FALSE,
        "finalInspectionPaid" BOOLEAN DEFAULT FALSE,
        "finalReviewCompleted" BOOLEAN DEFAULT FALSE,
        "reviewedBy" UUID,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        -- Foreign Keys
        CONSTRAINT "WorkChecklists_workId_fkey" 
          FOREIGN KEY ("workId") 
          REFERENCES "Works"("idWork") 
          ON DELETE CASCADE,
          
        CONSTRAINT "WorkChecklists_reviewedBy_fkey" 
          FOREIGN KEY ("reviewedBy") 
          REFERENCES "Staffs"("id") 
          ON DELETE SET NULL
      );

      -- Crear índices para mejorar el rendimiento
      CREATE INDEX IF NOT EXISTS "WorkChecklists_workId_idx" ON "WorkChecklists"("workId");
      CREATE INDEX IF NOT EXISTS "WorkChecklists_reviewedBy_idx" ON "WorkChecklists"("reviewedBy");
      CREATE INDEX IF NOT EXISTS "WorkChecklists_finalReviewCompleted_idx" ON "WorkChecklists"("finalReviewCompleted");

      -- Comentarios
      COMMENT ON TABLE "WorkChecklists" IS 'Checklist de verificación manual para cada work';
      COMMENT ON COLUMN "WorkChecklists"."arenaExpenseReviewed" IS 'Se revisó el gasto de arena';
      COMMENT ON COLUMN "WorkChecklists"."finalInvoiceSent" IS 'Se envió el invoice final al cliente';
      COMMENT ON COLUMN "WorkChecklists"."materialesInicialesUploaded" IS 'Se subió el comprobante de materiales iniciales';
      COMMENT ON COLUMN "WorkChecklists"."feeInspectionPaid" IS 'Se pagó el fee de inspección';
      COMMENT ON COLUMN "WorkChecklists"."initialInspectionPaid" IS 'Se pagó la inspección inicial';
      COMMENT ON COLUMN "WorkChecklists"."finalInspectionPaid" IS 'Se pagó la inspección final';
      COMMENT ON COLUMN "WorkChecklists"."finalReviewCompleted" IS 'Revisión final completada - OK para cerrar';
      COMMENT ON COLUMN "WorkChecklists"."reviewedBy" IS 'Usuario que completó la revisión final';
      COMMENT ON COLUMN "WorkChecklists"."reviewedAt" IS 'Fecha de revisión final';
      COMMENT ON COLUMN "WorkChecklists"."notes" IS 'Notas adicionales sobre la revisión';
    `;
    
    // Ejecutar la migración
    await conn.query(createTableSQL);
    
    console.log('\n✅ Tabla "WorkChecklists" creada exitosamente!\n');
    
    // Verificar que la tabla existe
    const [tables] = await conn.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'WorkChecklists';
    `);
    
    if (tables.length > 0) {
      console.log('✅ Verificación: La tabla existe en la base de datos\n');
      
      // Mostrar estructura de la tabla
      const [columns] = await conn.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'WorkChecklists'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Estructura de la tabla WorkChecklists:\n');
      console.log('═'.repeat(80));
      columns.forEach((col, index) => {
        const nullable = col.is_nullable === 'YES' ? '(opcional)' : '(requerido)';
        const defaultVal = col.column_default ? `[default: ${col.column_default.substring(0, 30)}...]` : '';
        console.log(`${String(index + 1).padStart(2)}. ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable} ${defaultVal}`);
      });
      console.log('═'.repeat(80));
      
      // Mostrar estadísticas
      const [stats] = await conn.query(`
        SELECT 
          COUNT(*) as total_works,
          (SELECT COUNT(*) FROM "WorkChecklists") as checklists_created
        FROM "Works";
      `);
      
      console.log('\n📊 Estadísticas:\n');
      console.log(`   Total de Works: ${stats[0].total_works}`);
      console.log(`   Checklists creados: ${stats[0].checklists_created}`);
      console.log(`   Pendientes: ${stats[0].total_works - stats[0].checklists_created}\n`);
    }
    
    console.log('═'.repeat(80));
    console.log('\n🎯 Próximos pasos:\n');
    console.log('   1. Reiniciar el servidor backend (si está corriendo)');
    console.log('   2. Los checklists se crearán automáticamente al acceder a cada work');
    console.log('   3. Acceder a Progress Tracker para ver los badges de verificación\n');
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  La tabla "WorkChecklists" ya existe en la base de datos.');
      console.log('   No es necesario ejecutar la migración nuevamente.\n');
      
      // Mostrar estadísticas aunque la tabla ya exista
      try {
        const [stats] = await conn.query(`
          SELECT 
            COUNT(*) as total_works,
            (SELECT COUNT(*) FROM "WorkChecklists") as checklists_created
          FROM "Works";
        `);
        
        console.log('📊 Estadísticas actuales:\n');
        console.log(`   Total de Works: ${stats[0].total_works}`);
        console.log(`   Checklists creados: ${stats[0].checklists_created}`);
        console.log(`   Pendientes: ${stats[0].total_works - stats[0].checklists_created}\n`);
      } catch (statsError) {
        // Ignorar error de estadísticas
      }
    } else {
      console.error('\n📋 Detalles del error:\n');
      console.error(error);
    }
  } finally {
    await conn.close();
    console.log('✅ Conexión cerrada');
    process.exit(0);
  }
}

createWorkChecklistsTable();
