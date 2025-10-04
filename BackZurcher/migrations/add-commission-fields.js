const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Agregando campos de comisiones y vendedores a Budgets...');

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Helper function para verificar si una columna existe
      const columnExists = async (tableName, columnName) => {
        const result = await queryInterface.sequelize.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name='${tableName}' AND column_name='${columnName}'`,
          { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
        );
        return result.length > 0;
      };

      // Helper function para verificar si un ENUM existe
      const enumExists = async (enumName) => {
        const result = await queryInterface.sequelize.query(
          `SELECT 1 FROM pg_type WHERE typname = '${enumName}'`,
          { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
        );
        return result.length > 0;
      };

      // 1. Agregar ENUM para leadSource (solo si no existe)
      const leadSourceEnumExists = await enumExists('enum_Budgets_leadSource');
      if (!leadSourceEnumExists) {
        await queryInterface.sequelize.query(`
          CREATE TYPE "enum_Budgets_leadSource" AS ENUM (
            'web',
            'direct_client',
            'social_media',
            'referral',
            'sales_rep'
          );
        `, { transaction });
        console.log('✅ ENUM leadSource creado');
      } else {
        console.log('ℹ️  ENUM leadSource ya existe, saltando...');
      }

      // 2. Agregar columna leadSource (solo si no existe)
      if (!(await columnExists('Budgets', 'leadSource'))) {
        await queryInterface.addColumn('Budgets', 'leadSource', {
          type: Sequelize.ENUM('web', 'direct_client', 'social_media', 'referral', 'sales_rep'),
          allowNull: true,
          defaultValue: 'web'
        }, { transaction });
        console.log('✅ Columna leadSource agregada');
      } else {
        console.log('ℹ️  Columna leadSource ya existe, saltando...');
      }

      // 3. Agregar columna createdByStaffId (solo si no existe)
      if (!(await columnExists('Budgets', 'createdByStaffId'))) {
        await queryInterface.addColumn('Budgets', 'createdByStaffId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Staffs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
        console.log('✅ Columna createdByStaffId agregada');
      } else {
        console.log('ℹ️  Columna createdByStaffId ya existe, saltando...');
      }

      // 4. Agregar columna salesCommissionAmount (solo si no existe)
      if (!(await columnExists('Budgets', 'salesCommissionAmount'))) {
        await queryInterface.addColumn('Budgets', 'salesCommissionAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
        console.log('✅ Columna salesCommissionAmount agregada');
      } else {
        console.log('ℹ️  Columna salesCommissionAmount ya existe, saltando...');
      }

      // 5. Agregar columna clientTotalPrice (solo si no existe)
      if (!(await columnExists('Budgets', 'clientTotalPrice'))) {
        await queryInterface.addColumn('Budgets', 'clientTotalPrice', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        }, { transaction });
        console.log('✅ Columna clientTotalPrice agregada');
      } else {
        console.log('ℹ️  Columna clientTotalPrice ya existe, saltando...');
      }

      // 6. Agregar columna commissionPercentage (solo si no existe)
      if (!(await columnExists('Budgets', 'commissionPercentage'))) {
        await queryInterface.addColumn('Budgets', 'commissionPercentage', {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
        console.log('✅ Columna commissionPercentage agregada');
      } else {
        console.log('ℹ️  Columna commissionPercentage ya existe, saltando...');
      }

      // 7. Agregar columna commissionAmount (solo si no existe)
      if (!(await columnExists('Budgets', 'commissionAmount'))) {
        await queryInterface.addColumn('Budgets', 'commissionAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
        console.log('✅ Columna commissionAmount agregada');
      } else {
        console.log('ℹ️  Columna commissionAmount ya existe, saltando...');
      }

      // 8. Agregar columna commissionPaid (solo si no existe)
      if (!(await columnExists('Budgets', 'commissionPaid'))) {
        await queryInterface.addColumn('Budgets', 'commissionPaid', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        }, { transaction });
        console.log('✅ Columna commissionPaid agregada');
      } else {
        console.log('ℹ️  Columna commissionPaid ya existe, saltando...');
      }

      // 9. Agregar columna commissionPaidDate (solo si no existe)
      if (!(await columnExists('Budgets', 'commissionPaidDate'))) {
        await queryInterface.addColumn('Budgets', 'commissionPaidDate', {
          type: Sequelize.DATEONLY,
          allowNull: true
        }, { transaction });
        console.log('✅ Columna commissionPaidDate agregada');
      } else {
        console.log('ℹ️  Columna commissionPaidDate ya existe, saltando...');
      }

      await transaction.commit();
      console.log('✅ Migración de campos de comisiones completada exitosamente');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo migración de campos de comisiones...');

    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeColumn('Budgets', 'commissionPaidDate', { transaction });
      await queryInterface.removeColumn('Budgets', 'commissionPaid', { transaction });
      await queryInterface.removeColumn('Budgets', 'commissionAmount', { transaction });
      await queryInterface.removeColumn('Budgets', 'commissionPercentage', { transaction });
      await queryInterface.removeColumn('Budgets', 'clientTotalPrice', { transaction });
      await queryInterface.removeColumn('Budgets', 'salesCommissionAmount', { transaction });
      await queryInterface.removeColumn('Budgets', 'createdByStaffId', { transaction });
      await queryInterface.removeColumn('Budgets', 'leadSource', { transaction });

      // Eliminar el ENUM
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Budgets_leadSource";', { transaction });

      await transaction.commit();
      console.log('✅ Reversión completada');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en reversión:', error);
      throw error;
    }
  }
};
