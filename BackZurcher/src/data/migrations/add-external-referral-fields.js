'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Agregar 'external_referral' al ENUM de leadSource
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Budgets_leadSource" ADD VALUE IF NOT EXISTS 'external_referral';
    `);

    // 2. Agregar campos para referidos externos
    await queryInterface.addColumn('Budgets', 'externalReferralName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nombre del referido externo (persona que no es staff pero refiere clientes)'
    });

    await queryInterface.addColumn('Budgets', 'externalReferralEmail', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Email del referido externo para contacto y seguimiento de comisión'
    });

    await queryInterface.addColumn('Budgets', 'externalReferralPhone', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Teléfono del referido externo'
    });

    await queryInterface.addColumn('Budgets', 'externalReferralCompany', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Empresa o negocio del referido externo (opcional)'
    });

    console.log('✅ Campos de referidos externos agregados exitosamente');
  },

  down: async (queryInterface, Sequelize) => {
    // Remover columnas
    await queryInterface.removeColumn('Budgets', 'externalReferralName');
    await queryInterface.removeColumn('Budgets', 'externalReferralEmail');
    await queryInterface.removeColumn('Budgets', 'externalReferralPhone');
    await queryInterface.removeColumn('Budgets', 'externalReferralCompany');

    // Nota: No podemos remover valores de ENUM en PostgreSQL fácilmente
    // Si necesitas revertir el ENUM, tendrías que recrear el tipo completo
    console.log('✅ Campos de referidos externos removidos');
  }
};
