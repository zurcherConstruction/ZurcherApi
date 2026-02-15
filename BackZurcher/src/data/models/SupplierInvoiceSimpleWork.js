const { DataTypes } = require('sequelize');

/**
 * Tabla de relación entre SupplierInvoices y SimpleWorks
 * Permite vincular facturas de proveedores a trabajos SimpleWork
 */
module.exports = (sequelize) => {
  const SupplierInvoiceSimpleWork = sequelize.define('SupplierInvoiceSimpleWork', {
    idSupplierInvoiceSimpleWork: {
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
      onDelete: 'CASCADE',
      comment: 'ID del invoice de proveedor'
    },
    simpleWorkId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SimpleWork',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'ID del SimpleWork vinculado'
    },
    // Monto asignado a este SimpleWork (cuando se distribuye equitativamente)
    assignedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Porción del invoice asignada a este SimpleWork'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre esta vinculación'
    }
  }, {
    timestamps: true,
    tableName: 'SupplierInvoiceSimpleWorks',
    indexes: [
      {
        fields: ['supplierInvoiceId']
      },
      {
        fields: ['simpleWorkId']
      }
    ]
  });

  return SupplierInvoiceSimpleWork;
};
