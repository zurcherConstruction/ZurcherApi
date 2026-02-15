const { DataTypes } = require('sequelize');

/**
 * SimpleWorkExpense - Modelo para gastos de trabajos varios
 */
module.exports = (sequelize) => {
  const SimpleWorkExpense = sequelize.define('SimpleWorkExpense', {
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
    
    category: {
      type: DataTypes.ENUM('materials', 'labor', 'equipment', 'permits', 'transport', 'other'),
      allowNull: false
    },
    
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    
    expenseDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      }
    }
  }, {
    tableName: 'SimpleWorkExpense',  
    timestamps: true,
    updatedAt: false
  });

  // 🔗 Asociaciones
  SimpleWorkExpense.associate = (models) => {
    // Relación con Staff para createdBy
    SimpleWorkExpense.belongsTo(models.Staff, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return SimpleWorkExpense;
};