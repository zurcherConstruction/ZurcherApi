/**
 * Migración: Crear tabla SupplierInvoices
 * 
 * Esta migración crea la tabla para almacenar invoices de proveedores
 * que pueden abarcar múltiples works y gastos.
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SupplierInvoices', {
      idSupplierInvoice: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vendor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      issueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paymentMethod: {
        type: DataTypes.ENUM(
          'Cap Trabajos Septic',
          'Capital Proyectos Septic',
          'Chase Bank',
          'AMEX',
          'Chase Credit Card',
          'Cheque',
          'Transferencia Bancaria',
          'Efectivo',
          'Zelle',
          'Tarjeta Débito',
          'PayPal',
          'Otro'
        ),
        allowNull: true,
      },
      paymentDetails: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdByStaffId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Staffs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      vendorEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vendorPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vendorAddress: {
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

    console.log('✅ Tabla SupplierInvoices creada exitosamente');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SupplierInvoices');
    console.log('✅ Tabla SupplierInvoices eliminada');
  }
};
