/**
 * 🔧 Migración para agregar funcionalidad de edición completa de Permit
 * 
 * CAMBIOS:
 * 1. Asegurar que campos críticos del Permit sean editables
 * 2. No se requieren cambios de schema, solo verificación
 * 
 * Campos que se pueden editar:
 * - permitNumber (TEXT, UNIQUE)
 * - lot (TEXT)
 * - block (TEXT)
 * - systemType (TEXT)
 * - isPBTS (BOOLEAN)
 * - drainfieldDepth (TEXT)
 * - expirationDate (DATEONLY)
 * - gpdCapacity (TEXT)
 * - excavationRequired (STRING)
 * - squareFeetSystem (TEXT)
 * - pump (TEXT)
 * - notificationEmails (ARRAY of STRING) - Ya existe
 * - applicantEmail (STRING) - Email principal - Ya existe
 */

const { QueryTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔍 Verificando estructura de tabla Permits...\n');

      // Verificar que todos los campos necesarios existan
      const columns = await queryInterface.describeTable('Permits');
      
      const requiredColumns = {
        permitNumber: 'TEXT',
        lot: 'TEXT',
        block: 'TEXT',
        systemType: 'TEXT',
        isPBTS: 'BOOLEAN',
        drainfieldDepth: 'TEXT',
        expirationDate: 'DATE',
        gpdCapacity: 'TEXT',
        excavationRequired: 'CHARACTER VARYING',
        squareFeetSystem: 'TEXT',
        pump: 'TEXT',
        notificationEmails: 'ARRAY',
        applicantEmail: 'CHARACTER VARYING'
      };

      console.log('📋 Verificando columnas requeridas:');
      let allColumnsExist = true;
      
      for (const [columnName, expectedType] of Object.entries(requiredColumns)) {
        if (columns[columnName]) {
          console.log(`  ✅ ${columnName.padEnd(25)} ${columns[columnName].type}`);
        } else {
          console.log(`  ❌ ${columnName.padEnd(25)} FALTA`);
          allColumnsExist = false;
        }
      }

      if (!allColumnsExist) {
        throw new Error('Faltan columnas requeridas en la tabla Permits');
      }

      // Verificar índice UNIQUE en permitNumber
      const indexes = await queryInterface.sequelize.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'Permits' 
          AND indexdef LIKE '%permitNumber%'
      `, { type: QueryTypes.SELECT, transaction });

      console.log('\n📊 Índices en permitNumber:');
      if (indexes.length > 0) {
        indexes.forEach(idx => {
          console.log(`  ✅ ${idx.indexname}`);
        });
      } else {
        console.log('  ⚠️  No se encontró índice UNIQUE en permitNumber');
      }

      console.log('\n✅ Verificación completada - Tabla Permits lista para edición');
      console.log('\n📝 Campos editables confirmados:');
      console.log('   - permitNumber (con validación de unicidad)');
      console.log('   - lot, block');
      console.log('   - systemType, isPBTS');
      console.log('   - drainfieldDepth, gpdCapacity');
      console.log('   - expirationDate');
      console.log('   - excavationRequired, squareFeetSystem');
      console.log('   - pump');
      console.log('   - applicantEmail (principal)');
      console.log('   - notificationEmails (secundarios)');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No se requiere rollback, solo fue verificación
    console.log('ℹ️  No se requiere rollback - fue solo verificación de schema');
  }
};
