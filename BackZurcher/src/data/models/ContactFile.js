const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ContactFile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    contactRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'ContactRequests', key: 'id' },
      onDelete: 'CASCADE',
    },
    fileUrl: {
         type: DataTypes.STRING, 
         allowNull: false 
        },
    fileName: {
         type: DataTypes.STRING, 
         allowNull: false 
        },
    fileType: {
         type: DataTypes.STRING,
          allowNull: false 
        }, // mime type
    publicId: {
         type: DataTypes.STRING, 
         allowNull: true 
        }, 
  });
};