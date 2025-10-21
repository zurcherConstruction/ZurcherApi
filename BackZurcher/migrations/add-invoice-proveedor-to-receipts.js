/**
 * Migración: Agregar tipo "Invoice Proveedor" al ENUM de Receipts
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Agregar el nuevo tipo al ENUM existente
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Receipts_type" ADD VALUE IF NOT EXISTS 'Invoice Proveedor';
      `);

      console.log('✅ Tipo "Invoice Proveedor" agregado al ENUM de Receipts');
    } catch (error) {
      console.log('ℹ️  El tipo "Invoice Proveedor" ya existe o hubo un error:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  No se puede eliminar un valor de un ENUM en PostgreSQL');
    console.log('   Si necesitas revertir, deberás recrear el ENUM completo');
  }
};
