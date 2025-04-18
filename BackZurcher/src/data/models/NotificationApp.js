const { DataTypes } = require('sequelize');


module.exports = (sequelize) => {
    return sequelize.define("NotificationApp", {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
 
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
});

}