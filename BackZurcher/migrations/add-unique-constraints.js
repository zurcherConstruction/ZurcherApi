const { Sequelize } = require('sequelize');

/**
 * Migración: Agregar constraints de unicidad
 * 
 * - Permits.permitNumber: UNIQUE
 * - Budgets.propertyAddress + Budgets.PermitIdPermit: UNIQUE (para evitar duplicados)
 */

async function up(queryInterface) {
  console.log('📝 Iniciando migración: add-unique-constraints');
  
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // 1. Agregar índice único en Permits.permitNumber
    console.log('1️⃣ Agregando constraint único en Permits.permitNumber...');
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Permits_permitNumber_unique" 
      ON "Permits"("permitNumber");
    `, { transaction });
    console.log('✅ Constraint único en permitNumber creado\n');

    // 2. Agregar índice único en Budgets.propertyAddress
    // Nota: Como propertyAddress puede repetirse en diferentes contextos,
    // solo lo hacemos único si es relevante para tu caso de uso
    console.log('2️⃣ Agregando constraint único en Budgets.propertyAddress...');
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Budgets_propertyAddress_unique" 
      ON "Budgets"("propertyAddress");
    `, { transaction });
    console.log('✅ Constraint único en propertyAddress creado\n');

    await transaction.commit();
    console.log('✅ Migración add-unique-constraints completada exitosamente!');
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en migración add-unique-constraints:', error);
    throw error;
  }
}

async function down(queryInterface) {
  console.log('⏪ Revirtiendo migración: add-unique-constraints');
  
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Eliminar índices únicos
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "Permits_permitNumber_unique";
    `, { transaction });
    
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "Budgets_propertyAddress_unique";
    `, { transaction });

    await transaction.commit();
    console.log('✅ Migración revertida exitosamente');
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error revirtiendo add-unique-constraints:', error);
    throw error;
  }
}

module.exports = { up, down };
