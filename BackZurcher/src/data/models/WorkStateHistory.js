const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('WorkStateHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workId: {
      type: DataTypes.UUID, // Work.idWork es UUID, no INTEGER
      allowNull: false,
      references: {
        model: 'Works',
        key: 'idWork'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    fromStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Estado anterior (null si es el primer estado)'
    },
    toStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nuevo estado'
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Razón del cambio (opcional)'
    },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['workId']
      },
      {
        fields: ['changedAt']
      },
      {
        fields: ['toStatus']
      }
    ]
  });
};
