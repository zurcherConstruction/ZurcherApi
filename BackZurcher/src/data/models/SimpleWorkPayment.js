const { DataTypes } = require('sequelize');

/**
 * SimpleWorkPayment - Modelo para pagos de trabajos varios
 */
module.exports = (sequelize) => {
  const SimpleWorkPayment = sequelize.define('SimpleWorkPayment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    simpleWorkId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    
    paymentMethod: {
      type: DataTypes.ENUM(
        // Bancos
        'Proyecto Septic BOFA',
        'Chase Bank',
        // Tarjetas
        'AMEX',
        'Chase Credit Card',
        // Otros métodos
        'Transferencia Bancaria',
        'Efectivo'
      ),
      allowNull: false
    },
    
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'SimpleWorkPayment',
    timestamps: true,
    updatedAt: false
  });

  return SimpleWorkPayment;
};