const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierInvoiceWork = sequelize.define('SupplierInvoiceWork', {
    idSupplierInvoiceWork: {
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
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    workId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Works',
        key: 'idWork'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
  }, {
    tableName: 'SupplierInvoiceWorks',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['supplierInvoiceId', 'workId']
      }
    ]
  });

  return SupplierInvoiceWork;
};
