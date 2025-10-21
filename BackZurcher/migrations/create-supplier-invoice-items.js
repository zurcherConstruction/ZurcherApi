/**
 * Migración: Crear tabla SupplierInvoiceItems
 * 
 * Esta migración crea la tabla para los items individuales de cada invoice,
 * permitiendo desglosar un invoice en múltiples gastos y works.
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SupplierInvoiceItems', {
      idItem: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      supplierInvoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'SupplierInvoices',
          key: 'idSupplierInvoice'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      workId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Works',
          key: 'idWork'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM(
          'Materiales',
          'Diseño',
          'Workers',
          'Imprevistos',
          'Comprobante Gasto',
          'Gastos Generales',
          'Materiales Iniciales',
          'Inspección Inicial',
          'Inspección Final',
          'Comisión Vendedor',
          'Gasto Fijo',
          'Otro'
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      relatedExpenseId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Expenses',
          key: 'idExpense'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Tabla SupplierInvoiceItems creada exitosamente');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SupplierInvoiceItems');
    console.log('✅ Tabla SupplierInvoiceItems eliminada');
  }
};
