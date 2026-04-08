const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('KnowledgeCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre de la categoría',
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción de la categoría',
    },
    
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Icono emoji o nombre de icono',
    },
    
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Color en formato hex',
    },
    
    order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Orden de visualización',
    },
    
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Estado activo/inactivo',
    },
    
  }, {
    tableName: 'KnowledgeCategories',
    timestamps: true,
    underscored: true,
  });
};
