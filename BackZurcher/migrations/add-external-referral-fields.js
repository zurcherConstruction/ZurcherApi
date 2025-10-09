'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Agregando campos para referidos externos...\n');
    
    try {
      // 1. Agregar 'external_referral' al ENUM de leadSource
      console.log('📝 Paso 1: Verificando ENUM leadSource...');
      
      // Find the correct ENUM name (case may vary)
      const [enumTypes] = await queryInterface.sequelize.query(`
        SELECT t.typname 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname ILIKE '%budgets_leadsource%'
        GROUP BY t.typname;
      `);
      
      if (enumTypes.length > 0) {
        const enumName = enumTypes[0].typname;
        console.log(`   ENUM encontrado: ${enumName}`);
        
        // Check if 'external_referral' already exists
        const [existingValues] = await queryInterface.sequelize.query(`
          SELECT enumlabel 
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = '${enumName}' AND enumlabel = 'external_referral';
        `);
        
        if (existingValues.length === 0) {
          await queryInterface.sequelize.query(`
            ALTER TYPE "${enumName}" ADD VALUE 'external_referral';
          `);
          console.log('✅ Valor "external_referral" agregado al ENUM\n');
        } else {
          console.log('⚠️  Valor "external_referral" ya existe en el ENUM\n');
        }
      } else {
        console.log('⚠️  No se encontró el ENUM de leadSource\n');
      }

      // Helper function to check if column exists
      const columnExists = async (columnName) => {
        const [result] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Budgets' AND column_name = '${columnName}';
        `);
        return result.length > 0;
      };

      // 2. Agregar campos para referidos externos
      console.log('📝 Paso 2: Verificando columna externalReferralName...');
      if (!(await columnExists('externalReferralName'))) {
        await queryInterface.addColumn('Budgets', 'externalReferralName', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Nombre del referido externo (persona que no es staff pero refiere clientes)'
        });
        console.log('✅ externalReferralName agregado\n');
      } else {
        console.log('⚠️  externalReferralName ya existe\n');
      }

      console.log('📝 Paso 3: Verificando columna externalReferralEmail...');
      if (!(await columnExists('externalReferralEmail'))) {
        await queryInterface.addColumn('Budgets', 'externalReferralEmail', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Email del referido externo para contacto y seguimiento de comisión'
        });
        console.log('✅ externalReferralEmail agregado\n');
      } else {
        console.log('⚠️  externalReferralEmail ya existe\n');
      }

      console.log('📝 Paso 4: Verificando columna externalReferralPhone...');
      if (!(await columnExists('externalReferralPhone'))) {
        await queryInterface.addColumn('Budgets', 'externalReferralPhone', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Teléfono del referido externo'
        });
        console.log('✅ externalReferralPhone agregado\n');
      } else {
        console.log('⚠️  externalReferralPhone ya existe\n');
      }

      console.log('📝 Paso 5: Verificando columna externalReferralCompany...');
      if (!(await columnExists('externalReferralCompany'))) {
        await queryInterface.addColumn('Budgets', 'externalReferralCompany', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Empresa o negocio del referido externo (opcional)'
        });
        console.log('✅ externalReferralCompany agregado\n');
      } else {
        console.log('⚠️  externalReferralCompany ya existe\n');
      }

      console.log('🎉 Migración completada - Campos de referidos externos verificados/agregados exitosamente');
    } catch (error) {
      console.error('❌ Error en migración:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración de referidos externos...\n');
    
    // Remover columnas
    console.log('📝 Removiendo externalReferralName...');
    await queryInterface.removeColumn('Budgets', 'externalReferralName');
    console.log('✅ Removido\n');
    
    console.log('📝 Removiendo externalReferralEmail...');
    await queryInterface.removeColumn('Budgets', 'externalReferralEmail');
    console.log('✅ Removido\n');
    
    console.log('📝 Removiendo externalReferralPhone...');
    await queryInterface.removeColumn('Budgets', 'externalReferralPhone');
    console.log('✅ Removido\n');
    
    console.log('📝 Removiendo externalReferralCompany...');
    await queryInterface.removeColumn('Budgets', 'externalReferralCompany');
    console.log('✅ Removido\n');

    // Nota: No podemos remover valores de ENUM en PostgreSQL fácilmente
    console.log('⚠️  Nota: El valor "external_referral" permanece en el ENUM (PostgreSQL no permite remover valores fácilmente)');
    console.log('🎉 Reversión completada');
  }
};
