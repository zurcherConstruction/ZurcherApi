/**
 * Migration: Agregar campos para Notice to Owner y Lien tracking
 * 
 * Cuando un trabajo empieza instalación (inProgress), Florida requiere:
 * - Notice to Owner: Debe archivarse dentro de 45 días del inicio
 * - Lien: Protección legal para cobro en caso de no pago
 * 
 * Este sistema alerta cuando quedan pocos días para archivar documentos
 */

const { conn } = require('../src/data');

async function migrate() {
  console.log('📋 INICIANDO MIGRACIÓN: Notice to Owner y Lien Tracking');
  console.log('=' .repeat(60));

  try {
    // 1️⃣ Agregar campo de fecha de inicio de instalación
    console.log('\n1️⃣ Agregando campo installationStartDate...');
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "installationStartDate" DATE;
    `);
    console.log('✅ installationStartDate agregado');

    // 2️⃣ Campos para Notice to Owner
    console.log('\n2️⃣ Agregando campos de Notice to Owner...');
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "noticeToOwnerRequired" BOOLEAN DEFAULT true NOT NULL;
    `);
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "noticeToOwnerFiled" BOOLEAN DEFAULT false NOT NULL;
    `);
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "noticeToOwnerFiledDate" DATE;
    `);
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "noticeToOwnerDocumentUrl" VARCHAR(500);
    `);
    
    console.log('✅ Campos de Notice to Owner agregados');

    // 3️⃣ Campos para Lien (derecho de retención/cobro)
    console.log('\n3️⃣ Agregando campos de Lien...');
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "lienRequired" BOOLEAN DEFAULT false NOT NULL;
    `);
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "lienFiled" BOOLEAN DEFAULT false NOT NULL;
    `);
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "lienFiledDate" DATE;
    `);
    
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "lienDocumentUrl" VARCHAR(500);
    `);
    
    console.log('✅ Campos de Lien agregados');

    // 4️⃣ Campo para notas
    console.log('\n4️⃣ Agregando campo de notas...');
    await conn.query(`
      ALTER TABLE "Works" 
      ADD COLUMN IF NOT EXISTS "noticeToOwnerNotes" TEXT;
    `);
    console.log('✅ Campo de notas agregado');

    // 5️⃣ Verificar la estructura
    console.log('\n5️⃣ Verificando estructura de la tabla Works...');
    const [columns] = await conn.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Works'
      AND column_name IN (
        'installationStartDate',
        'noticeToOwnerRequired',
        'noticeToOwnerFiled',
        'noticeToOwnerFiledDate',
        'noticeToOwnerDocumentUrl',
        'lienRequired',
        'lienFiled',
        'lienFiledDate',
        'lienDocumentUrl',
        'noticeToOwnerNotes'
      )
      ORDER BY column_name;
    `);

    console.log('\n📊 Columnas creadas:');
    console.table(columns);

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('💡 El sistema ahora rastreará Notice to Owner y Lien');
    console.log('📅 Alertará cuando quedan pocos días para el deadline de 45 días');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
