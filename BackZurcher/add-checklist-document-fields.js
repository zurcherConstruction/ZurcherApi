/**
 * Script para agregar campos de documentos finales al checklist
 * 
 * Uso:
 *   node add-checklist-document-fields.js
 * 
 * Descripción:
 *   Agrega operatingPermitUploaded y maintenanceServiceUploaded al modelo WorkChecklist
 */

require('dotenv').config();
const { conn } = require('./src/data');

async function addChecklistDocumentFields() {
  try {
    console.log('\n🔄 Iniciando migración de campos de documentos finales...\n');

    // Agregar campo operatingPermitUploaded
    console.log('📋 Agregando campo operatingPermitUploaded...');
    await conn.query(`
      ALTER TABLE "WorkChecklists" 
      ADD COLUMN IF NOT EXISTS "operatingPermitUploaded" BOOLEAN DEFAULT false;
    `);
    
    await conn.query(`
      COMMENT ON COLUMN "WorkChecklists"."operatingPermitUploaded" 
      IS 'Se subió el permiso de operación oficial';
    `);
    console.log('✅ Campo operatingPermitUploaded agregado\n');

    // Agregar campo maintenanceServiceUploaded
    console.log('📋 Agregando campo maintenanceServiceUploaded...');
    await conn.query(`
      ALTER TABLE "WorkChecklists" 
      ADD COLUMN IF NOT EXISTS "maintenanceServiceUploaded" BOOLEAN DEFAULT false;
    `);
    
    await conn.query(`
      COMMENT ON COLUMN "WorkChecklists"."maintenanceServiceUploaded" 
      IS 'Se subió el documento de servicio de mantenimiento';
    `);
    console.log('✅ Campo maintenanceServiceUploaded agregado\n');

    // Verificar campos agregados
    console.log('🔍 Verificando campos agregados...');
    const [results] = await conn.query(`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'WorkChecklists'
        AND column_name IN ('operatingPermitUploaded', 'maintenanceServiceUploaded')
      ORDER BY column_name;
    `);

    console.log('\n📊 Campos verificados:');
    console.table(results);

    console.log('\n✅ Migración completada exitosamente\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addChecklistDocumentFields();
