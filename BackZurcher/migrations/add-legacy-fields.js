const { Sequelize } = require('sequelize');

/**
 * MIGRACIÓN: Agregar campos Legacy a tablas Budget, Permit y Work
 * Fecha: 2025-10-02
 * Propósito: Agregar soporte para trabajos legacy importados
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Iniciando migración: Agregando campos Legacy...');

    try {
      // === 1. AGREGAR CAMPOS A TABLA BUDGETS ===
      console.log('📊 Agregando campos a tabla Budgets...');
      
      // Verificar si la columna isLegacy ya existe
      const budgetColumns = await queryInterface.describeTable('Budgets');
      
      if (!budgetColumns.isLegacy) {
        await queryInterface.addColumn('Budgets', 'isLegacy', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Indica si este presupuesto fue importado desde sistema externo'
        });
        console.log('✅ Campo isLegacy agregado a Budgets');
      } else {
        console.log('⚠️ Campo isLegacy ya existe en Budgets');
      }

      if (!budgetColumns.legacySignedPdfUrl) {
        await queryInterface.addColumn('Budgets', 'legacySignedPdfUrl', {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'URL de Cloudinary del PDF del presupuesto firmado para trabajos legacy'
        });
        console.log('✅ Campo legacySignedPdfUrl agregado a Budgets');
      } else {
        console.log('⚠️ Campo legacySignedPdfUrl ya existe en Budgets');
      }

      if (!budgetColumns.legacySignedPdfPublicId) {
        await queryInterface.addColumn('Budgets', 'legacySignedPdfPublicId', {
          type: Sequelize.STRING(200),
          allowNull: true,
          comment: 'Public ID de Cloudinary para poder eliminar el archivo si es necesario'
        });
        console.log('✅ Campo legacySignedPdfPublicId agregado a Budgets');
      } else {
        console.log('⚠️ Campo legacySignedPdfPublicId ya existe en Budgets');
      }

      // === 2. AGREGAR CAMPOS A TABLA PERMITS ===
      console.log('📋 Agregando campos a tabla Permits...');
      
      const permitColumns = await queryInterface.describeTable('Permits');
      
      if (!permitColumns.isLegacy) {
        await queryInterface.addColumn('Permits', 'isLegacy', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Indica si este permit fue importado desde sistema externo'
        });
        console.log('✅ Campo isLegacy agregado a Permits');
      } else {
        console.log('⚠️ Campo isLegacy ya existe en Permits');
      }

      // === 3. AGREGAR CAMPOS A TABLA WORKS ===
      console.log('🔨 Agregando campos a tabla Works...');
      
      const workColumns = await queryInterface.describeTable('Works');
      
      if (!workColumns.isLegacy) {
        await queryInterface.addColumn('Works', 'isLegacy', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Indica si este trabajo fue importado desde sistema externo'
        });
        console.log('✅ Campo isLegacy agregado a Works');
      } else {
        console.log('⚠️ Campo isLegacy ya existe en Works');
      }

      // === 4. CREAR ÍNDICES PARA MEJORAR PERFORMANCE ===
      console.log('📈 Creando índices para campos Legacy...');
      
      try {
        await queryInterface.addIndex('Budgets', ['isLegacy'], {
          name: 'budgets_islegacy_idx',
          where: {
            isLegacy: true
          }
        });
        console.log('✅ Índice creado para Budgets.isLegacy');
      } catch (error) {
        console.log('⚠️ Índice para Budgets.isLegacy ya existe o falló:', error.message);
      }

      try {
        await queryInterface.addIndex('Permits', ['isLegacy'], {
          name: 'permits_islegacy_idx',
          where: {
            isLegacy: true
          }
        });
        console.log('✅ Índice creado para Permits.isLegacy');
      } catch (error) {
        console.log('⚠️ Índice para Permits.isLegacy ya existe o falló:', error.message);
      }

      try {
        await queryInterface.addIndex('Works', ['isLegacy'], {
          name: 'works_islegacy_idx',
          where: {
            isLegacy: true
          }
        });
        console.log('✅ Índice creado para Works.isLegacy');
      } catch (error) {
        console.log('⚠️ Índice para Works.isLegacy ya existe o falló:', error.message);
      }

      console.log('🎉 Migración completada exitosamente!');
      
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Revirtiendo migración: Eliminando campos Legacy...');

    try {
      // Eliminar índices
      await queryInterface.removeIndex('Budgets', 'budgets_islegacy_idx');
      await queryInterface.removeIndex('Permits', 'permits_islegacy_idx');
      await queryInterface.removeIndex('Works', 'works_islegacy_idx');

      // Eliminar columnas
      await queryInterface.removeColumn('Budgets', 'legacySignedPdfPublicId');
      await queryInterface.removeColumn('Budgets', 'legacySignedPdfUrl');
      await queryInterface.removeColumn('Budgets', 'isLegacy');
      await queryInterface.removeColumn('Permits', 'isLegacy');
      await queryInterface.removeColumn('Works', 'isLegacy');

      console.log('✅ Migración revertida exitosamente');
      
    } catch (error) {
      console.error('❌ Error revirtiendo migración:', error);
      throw error;
    }
  }
};