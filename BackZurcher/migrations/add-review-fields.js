/**
 * Migración: Agregar campos para sistema de revisión previa
 * Fecha: 2025-10-03
 * Descripción: 
 * - Agrega campos para permitir revisión del presupuesto antes de firma
 * - Token único para que clientes aprueben/rechacen sin login
 */

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Iniciando migración: add-review-fields');

    try {
      // Verificar si reviewToken ya existe
      const [reviewTokenExists] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Budgets' AND column_name = 'reviewToken';
      `);
      
      if (reviewTokenExists.length === 0) {
        await queryInterface.addColumn('Budgets', 'reviewToken', {
          type: Sequelize.STRING(64),
          allowNull: true,
          unique: true
        });
        console.log('   ✅ reviewToken agregado');
      } else {
        console.log('   ⏭️  reviewToken ya existe, omitiendo...');
      }

      // Verificar si sentForReviewAt ya existe
      const [sentForReviewAtExists] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Budgets' AND column_name = 'sentForReviewAt';
      `);
      
      if (sentForReviewAtExists.length === 0) {
        await queryInterface.addColumn('Budgets', 'sentForReviewAt', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('   ✅ sentForReviewAt agregado');
      } else {
        console.log('   ⏭️  sentForReviewAt ya existe, omitiendo...');
      }

      // Verificar si reviewedAt ya existe
      const [reviewedAtExists] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Budgets' AND column_name = 'reviewedAt';
      `);
      
      if (reviewedAtExists.length === 0) {
        await queryInterface.addColumn('Budgets', 'reviewedAt', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('   ✅ reviewedAt agregado');
      } else {
        console.log('   ⏭️  reviewedAt ya existe, omitiendo...');
      }

      console.log('✅ Migración completada exitosamente');

    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⏪ Revirtiendo migración: add-review-fields');

    try {
      await queryInterface.removeColumn('Budgets', 'reviewToken');
      await queryInterface.removeColumn('Budgets', 'sentForReviewAt');
      await queryInterface.removeColumn('Budgets', 'reviewedAt');
      
      console.log('✅ Migración revertida');
    } catch (error) {
      console.error('❌ Error al revertir migración:', error);
      throw error;
    }
  }
};
