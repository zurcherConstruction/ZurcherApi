const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('MaintenanceVisits', 'level_inlet', {
      type: DataTypes.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'level_outlet', {
      type: DataTypes.FLOAT,
      allowNull: true,
    });
    
    // Inspección General - campos booleanos
    await queryInterface.addColumn('MaintenanceVisits', 'strong_odors', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'strong_odors_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'water_level_ok', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'water_level_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'visible_leaks', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'visible_leaks_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'area_around_dry', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'area_around_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'cap_green_inspected', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'cap_green_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'needs_pumping', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    
    // Sistema ATU / ATU PBTS
    await queryInterface.addColumn('MaintenanceVisits', 'blower_working', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'blower_working_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'blower_filter_clean', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'blower_filter_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'diffusers_bubbling', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'diffusers_bubbling_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'discharge_pump_ok', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'discharge_pump_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'clarified_water_outlet', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'clarified_water_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    
    // Lift Station
    await queryInterface.addColumn('MaintenanceVisits', 'alarm_panel_working', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'alarm_panel_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'pump_working', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'pump_working_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'float_switch_good', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('MaintenanceVisits', 'float_switch_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    
    // PBTS - muestras de pozos (almacenado como JSONB)
    await queryInterface.addColumn('MaintenanceVisits', 'well_samples', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    });
    
    // Observaciones generales
    await queryInterface.addColumn('MaintenanceVisits', 'general_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    
    // Firma (URL de la imagen de firma)
    await queryInterface.addColumn('MaintenanceVisits', 'signature_url', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    
    // Campo para indicar quién completó el formulario (puede ser diferente del asignado)
    await queryInterface.addColumn('MaintenanceVisits', 'completed_by_staff_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id',
      },
    });

    console.log('✅ Campos del formulario de mantenimiento agregados a MaintenanceVisits');
  },

  down: async (queryInterface) => {
    // Revertir la migración eliminando todas las columnas agregadas
    const columns = [
      'level_inlet', 'level_outlet', 'strong_odors', 'strong_odors_notes',
      'water_level_ok', 'water_level_notes', 'visible_leaks', 'visible_leaks_notes',
      'area_around_dry', 'area_around_notes', 'cap_green_inspected', 'cap_green_notes',
      'needs_pumping', 'blower_working', 'blower_working_notes', 'blower_filter_clean',
      'blower_filter_notes', 'diffusers_bubbling', 'diffusers_bubbling_notes',
      'discharge_pump_ok', 'discharge_pump_notes', 'clarified_water_outlet',
      'clarified_water_notes', 'alarm_panel_working', 'alarm_panel_notes',
      'pump_working', 'pump_working_notes', 'float_switch_good', 'float_switch_notes',
      'well_samples', 'general_notes', 'signature_url', 'completed_by_staff_id'
    ];

    for (const column of columns) {
      await queryInterface.removeColumn('MaintenanceVisits', column);
    }

    console.log('✅ Campos del formulario de mantenimiento eliminados de MaintenanceVisits');
  }
};
