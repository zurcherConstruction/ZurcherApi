const { sequelize } = require('../src/data/index');

async function addDocuSignSupport() {
  const queryInterface = sequelize.getQueryInterface();
  
  console.log('🔄 Iniciando migración para soporte de DocuSign...\n');

  try {
    // 1. Agregar campo signatureDocumentId
    console.log('📝 Agregando campo signatureDocumentId...');
    try {
      await queryInterface.addColumn('Budgets', 'signatureDocumentId', {
        type: sequelize.Sequelize.STRING,
        allowNull: true,
        unique: true
      });
      console.log('✅ Campo signatureDocumentId agregado');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Campo signatureDocumentId ya existe, continuando...');
      } else {
        throw error;
      }
    }

    // 2. Actualizar ENUM de signatureMethod para incluir 'docusign'
    console.log('\n📝 Actualizando ENUM signatureMethod...');
    try {
      // En PostgreSQL, necesitamos agregar el valor al ENUM existente
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'docusign' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_Budgets_signatureMethod'
            )
          ) THEN
            ALTER TYPE "enum_Budgets_signatureMethod" ADD VALUE 'docusign';
          END IF;
        END
        $$;
      `);
      console.log('✅ ENUM signatureMethod actualizado con valor "docusign"');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Valor "docusign" ya existe en ENUM, continuando...');
      } else {
        throw error;
      }
    }

    // 3. Migrar datos existentes: copiar signNowDocumentId a signatureDocumentId
    console.log('\n📝 Migrando datos existentes...');
    const result = await sequelize.query(`
      UPDATE "Budgets"
      SET "signatureDocumentId" = "signNowDocumentId"
      WHERE "signNowDocumentId" IS NOT NULL 
        AND "signatureDocumentId" IS NULL
        AND "signatureMethod" = 'signnow'
    `);
    
    const updatedCount = result[1] || 0;
    console.log(`✅ ${updatedCount} registros migrados de signNowDocumentId a signatureDocumentId`);

    // 4. Remover constraint unique de signNowDocumentId para evitar conflictos
    console.log('\n📝 Removiendo constraint unique de signNowDocumentId...');
    try {
      // Buscar el nombre del constraint
      const [constraints] = await sequelize.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'Budgets' 
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%signNowDocumentId%'
      `);

      if (constraints.length > 0) {
        const constraintName = constraints[0].constraint_name;
        await sequelize.query(`ALTER TABLE "Budgets" DROP CONSTRAINT "${constraintName}"`);
        console.log(`✅ Constraint ${constraintName} removido`);
      } else {
        console.log('⚠️  No se encontró constraint unique en signNowDocumentId');
      }
    } catch (error) {
      console.log('⚠️  Error removiendo constraint (puede no existir):', error.message);
    }

    console.log('\n✅ ¡Migración completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('   - Campo signatureDocumentId agregado');
    console.log('   - ENUM signatureMethod actualizado con "docusign"');
    console.log(`   - ${updatedCount} budgets migrados`);
    console.log('   - Sistema listo para usar SignNow y DocuSign simultáneamente');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración
if (require.main === module) {
  addDocuSignSupport()
    .then(() => {
      console.log('\n🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = addDocuSignSupport;
