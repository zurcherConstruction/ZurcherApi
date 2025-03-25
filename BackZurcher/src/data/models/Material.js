const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Material', {
    idMaterial: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    name: {
      type: DataTypes.ENUM('Tanque ATU 500 Infiltrator', 'Kit alarma compresor', 'Clean Out', 'Arena', 'Cruz de 4',
         'Codos de 90', 'T de 4', 'Chambers arc24',  'otros'),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
  });
};
