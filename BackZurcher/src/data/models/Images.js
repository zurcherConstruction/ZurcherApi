const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Image', {
    idWork: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stage: {
      type: DataTypes.ENUM(
        'foto previa del lugar',
        'materiales',
        'foto excavación',
        'camiones de arena',
        'sistema instalado',
        'extracción de piedras',
        'camiones de tierra',
        'inspeccion final'
      ),
      allowNull: false,
    },
    dateTime: {
      type: DataTypes.STRING, // Tipo de dato para la fecha y hora
      allowNull: true, // Permite valores nulos si no siempre se proporciona
    },
    imageData: {
      type: DataTypes.TEXT('long'), // o DataTypes.BLOB si prefieres
      allowNull: false, // o true, dependiendo de si siempre quieres una imagen
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true, // Permite valores nulos si no siempre se proporciona
    },
    truckCount: {
      type: DataTypes.INTEGER,
      allowNull: true, // Solo se usará en etapas específicas
      defaultValue: null, // O 1 si prefieres un valor por defecto
    }
    
  });
};