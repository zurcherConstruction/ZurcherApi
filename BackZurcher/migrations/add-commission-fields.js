const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Agregando campos de comisiones y vendedores a Budgets...');

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Agregar ENUM para leadSource
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Budgets_leadSource" AS ENUM (
            'web',
            'direct_client',
            'social_media',
            'referral',
            'sales_rep'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });

      console.log('✅ ENUM leadSource creado o ya existe');

      // 2. Agregar columna leadSource
      await queryInterface.addColumn('Budgets', 'leadSource', {
        type: Sequelize.ENUM('web', 'direct_client', 'social_media', 'referral', 'sales_rep'),
        allowNull: true,
        defaultValue: 'web'
      }, { transaction });

      console.log('✅ Columna leadSource agregada');

      // 3. Agregar columna createdByStaffId (FK a Staffs)
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

      // 4. Agregar columna salesCommissionAmount
      await queryInterface.addColumn('Budgets', 'salesCommissionAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      }, { transaction });

      console.log('✅ Columna salesCommissionAmount agregada');

      // 5. Agregar columna clientTotalPrice
      await queryInterface.addColumn('Budgets', 'clientTotalPrice', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      }, { transaction });

      console.log('✅ Columna clientTotalPrice agregada');

      // 6. Agregar columna commissionPercentage
      await queryInterface.addColumn('Budgets', 'commissionPercentage', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
      }, { transaction });

      console.log('✅ Columna commissionPercentage agregada');

      // 7. Agregar columna commissionAmount
      await queryInterface.addColumn('Budgets', 'commissionAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      }, { transaction });

      console.log('✅ Columna commissionAmount agregada');

      // 8. Agregar columna commissionPaid
      await queryInterface.addColumn('Budgets', 'commissionPaid', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, { transaction });

      console.log('✅ Columna commissionPaid agregada');

      // 9. Agregar columna commissionPaidDate
      await queryInterface.addColumn('Budgets', 'commissionPaidDate', {
        type: Sequelize.DATEONLY,
        allowNull: true
      }, { transaction });

      console.log('✅ Columna commissionPaidDate agregada');

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
