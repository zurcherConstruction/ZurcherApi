const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Agregando tipo de gasto "Comisión Vendedor" al ENUM...');

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Agregar el nuevo valor al ENUM typeExpense
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Expenses_typeExpense" ADD VALUE IF NOT EXISTS 'Comisión Vendedor';
      `, { transaction });

      console.log('✅ Tipo de gasto "Comisión Vendedor" agregado exitosamente');

      await transaction.commit();
      console.log('✅ Migración completada');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  No se puede revertir un valor agregado a un ENUM en PostgreSQL');
    console.log('ℹ️  Si necesitas revertir, deberás recrear el ENUM manualmente');
  }
};
