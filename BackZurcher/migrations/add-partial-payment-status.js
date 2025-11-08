/**
 * Migración: Agregar 'partial' al ENUM paymentStatus de Expenses
 * 
 * Para soportar pagos parciales de Chase Credit Card
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Iniciando migración: add-partial-payment-status');

    // Agregar el nuevo valor 'partial' al ENUM existente
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Expenses_paymentStatus" ADD VALUE IF NOT EXISTS 'partial';
    `);
    console.log('✅ Valor "partial" agregado al ENUM paymentStatus');

    console.log('✅ Migración completada: add-partial-payment-status');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  No se puede revertir: PostgreSQL no permite eliminar valores de ENUMs');
    console.log('   Si necesitas revertir, deberás eliminar y recrear el ENUM manualmente');
  }
};
