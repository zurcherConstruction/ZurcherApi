const { Sequelize } = require('sequelize');

/**
 * Migración: Agregar constraints de unicidad
 * 
 * - Permits.permitNumber: UNIQUE (genera valores únicos para vacíos primero)
 * - Budgets.propertyAddress: UNIQUE (solo si no hay duplicados)
 */

async function up(queryInterface) {
  console.log('📝 Iniciando migración: add-unique-constraints');
  
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // 0. LIMPIAR DATOS: Generar permitNumber únicos para los vacíos
    console.log('0️⃣ Limpiando datos: Generando permitNumber para valores vacíos...');
    const [emptyPermits] = await queryInterface.sequelize.query(`
      SELECT "idPermit" FROM "Permits" 
      WHERE "permitNumber" IS NULL OR "permitNumber" = '';
    `, { transaction });

    if (emptyPermits.length > 0) {
      console.log(`   Encontrados ${emptyPermits.length} permisos con permitNumber vacío`);
      
      for (const permit of emptyPermits) {
        // Generar un número único basado en timestamp y parte del UUID
        const uniqueNumber = `TEMP-${Date.now()}-${permit.idPermit.slice(0, 8)}`;
        await queryInterface.sequelize.query(`
          UPDATE "Permits" 
          SET "permitNumber" = :uniqueNumber
          WHERE "idPermit" = :permitId;
        `, { 
          replacements: { uniqueNumber, permitId: permit.idPermit },
          transaction 
        });
      }
      console.log(`   ✅ ${emptyPermits.length} permitNumbers vacíos actualizados con valores temporales\n`);
    } else {
      console.log('   ✅ No hay permitNumbers vacíos\n');
    }

    // 1. Agregar índice único en Permits.permitNumber
    console.log('1️⃣ Agregando constraint único en Permits.permitNumber...');
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Permits_permitNumber_unique" 
      ON "Permits"("permitNumber");
    `, { transaction });
    console.log('✅ Constraint único en permitNumber creado\n');

    // 2. Verificar si hay duplicados en Budgets.propertyAddress antes de crear constraint
    console.log('2️⃣ Verificando duplicados en Budgets.propertyAddress...');
    const [duplicateAddresses] = await queryInterface.sequelize.query(`
      SELECT "propertyAddress", COUNT(*) as count
      FROM "Budgets"
      GROUP BY "propertyAddress"
      HAVING COUNT(*) > 1;
    `, { transaction });

    if (duplicateAddresses.length > 0) {
      console.log(`   ⚠️  Encontrados ${duplicateAddresses.length} propertyAddress duplicados`);
      console.log('   ℹ️  NO se creará constraint único en propertyAddress (requiere limpieza manual)');
      duplicateAddresses.slice(0, 5).forEach(row => {
        console.log(`      - "${row.propertyAddress}": ${row.count} veces`);
      });
      console.log('\n');
    } else {
      console.log('   Creando constraint único en Budgets.propertyAddress...');
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Budgets_propertyAddress_unique" 
        ON "Budgets"("propertyAddress");
      `, { transaction });
      console.log('   ✅ Constraint único en propertyAddress creado\n');
    }

    await transaction.commit();
    console.log('✅ Migración add-unique-constraints completada exitosamente!');
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en migración add-unique-constraints:', error.message);
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
