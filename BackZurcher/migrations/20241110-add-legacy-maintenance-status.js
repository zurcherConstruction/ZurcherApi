/**
 * Migration: Add 'legacy_maintenance' status to Budget ENUM
 * 
 * Purpose: Allow legacy maintenance budgets that don't affect financial statistics
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('📝 Adding legacy_maintenance status to Budget...');

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Budgets_status" ADD VALUE IF NOT EXISTS 'legacy_maintenance';
    `);

    console.log('✅ Status legacy_maintenance added to Budget ENUM');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('⚠️  Cannot remove ENUM value in PostgreSQL - manual cleanup required');
  }
};
