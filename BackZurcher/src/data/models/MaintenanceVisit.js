const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MaintenanceVisit', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    workId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Works', // Nombre de la tabla Works
        key: 'idWork',
      },
    },
    visitNumber: { // 1, 2, 3, 4
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scheduledDate: { // Fecha teórica para la visita
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    actualVisitDate: { // Fecha en que realmente se realizó
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
     staffId: {
      type: DataTypes.UUID, // Asegúrate que coincida con el tipo de 'id' en tu modelo Staff
      allowNull: true, // Puede ser nulo si la visita aún no está asignada
      references: {
        model: 'Staffs', // El nombre de la tabla de tu modelo Staff (usualmente el plural del nombre del modelo)
        key: 'id',       // La clave primaria en tu modelo Staff
      },
    },
    status: {
      type: DataTypes.ENUM('pending_scheduling', 'scheduled', 'completed', 'skipped', 'assigned'),
      allowNull: false,
      defaultValue: 'pending_scheduling',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Podrías añadir más campos específicos si los necesitas
  }, {
    timestamps: true, // createdAt y updatedAt
  });
};