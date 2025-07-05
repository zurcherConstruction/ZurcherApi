const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('ContactRequest', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
             type: DataTypes.STRING,
              allowNull: false 
            },
        phone: { 
            type: DataTypes.STRING, 
            allowNull: true 
        },
        email: {
             type: DataTypes.STRING, 
             allowNull: false 
            },
        message: {
            type: DataTypes.TEXT, 
            allowNull: true 
        },
        status: { 
            type: DataTypes.STRING,
             defaultValue: 'pending' 
            },
    });
};