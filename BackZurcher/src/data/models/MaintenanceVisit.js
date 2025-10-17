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
    
    // === Campos del formulario de inspección ===
    // Niveles
    level_inlet: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    level_outlet: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    
    // Inspección General
    strong_odors: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    strong_odors_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    water_level_ok: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    water_level_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    visible_leaks: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    visible_leaks_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    area_around_dry: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    area_around_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cap_green_inspected: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    cap_green_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    needs_pumping: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    
    // Sistema ATU / ATU PBTS
    blower_working: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    blower_working_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    blower_filter_clean: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    blower_filter_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diffusers_bubbling: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    diffusers_bubbling_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    discharge_pump_ok: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    discharge_pump_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clarified_water_outlet: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    clarified_water_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // Lift Station
    alarm_panel_working: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    alarm_panel_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pump_working: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    pump_working_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    float_switch_good: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    float_switch_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // PBTS - muestras de pozos
    well_samples: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    
    // Observaciones generales y firma
    general_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    signature_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    
    // Quién completó el formulario
    completed_by_staff_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id',
      },
    },
  }, {
    timestamps: true, // createdAt y updatedAt
  });
};