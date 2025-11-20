const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BankAccount = sequelize.define('BankAccount', {
    idBankAccount: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    accountName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'El nombre de la cuenta no puede estar vacío' }
      }
    },
    accountType: {
      type: DataTypes.ENUM('checking', 'savings', 'cash', 'credit_card'),
      allowNull: false,
      defaultValue: 'checking'
    },
    currentBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: { msg: 'El balance debe ser un número decimal' }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'BankAccounts',
    indexes: [
      { fields: ['accountName'], name: 'idx_bank_accounts_name' },
      { fields: ['isActive'], name: 'idx_bank_accounts_active' }
    ]
  });

  // Métodos de instancia
  BankAccount.prototype.updateBalance = async function(amount, transaction) {
    this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
    await this.save({ transaction });
    return this.currentBalance;
  };

  BankAccount.prototype.getFormattedBalance = function() {
    return `$${parseFloat(this.currentBalance).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
  };

  return BankAccount;
};
