const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define(
    'Staff',
    {
     
      name: {
        type: DataTypes.STRING,
      },
    
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      
      role: {
        type: DataTypes.ENUM( 'recept', 'admin', 'owner', 'worker'),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
      },
      lastLogout: {
        type: DataTypes.DATE,
      },
     
      passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tokenCreatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      paranoid: true,
    }
  );
};