const { Sequelize } = require('sequelize');

/**
 * Migración: Hacer PermitIdPermit nullable en Budgets
 * 
 * Razón: Necesitamos poder poner NULL temporalmente al eliminar un Budget
 * para poder eliminar su Permit asociado sin violar restricciones FK.
 */

async function up(queryInterface) {
  console.log('📝 Iniciando migración: make-permit-nullable');
  
  try {
    // Cambiar columna PermitIdPermit a nullable
    await queryInterface.changeColumn('Budgets', 'PermitIdPermit', {
      type: Sequelize.UUID,
      allowNull: true, // 🆕 Ahora permite NULL
      references: {
        model: 'Permits',
        key: 'idPermit'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    console.log('✅ Columna PermitIdPermit ahora permite NULL');
    return true;
  } catch (error) {
    console.error('❌ Error en migración make-permit-nullable:', error);
    throw error;
  }
}

async function down(queryInterface) {
  console.log('⏪ Revirtiendo migración: make-permit-nullable');
  
  try {
    // Revertir a NOT NULL
    await queryInterface.changeColumn('Budgets', 'PermitIdPermit', {
      type: Sequelize.UUID,
      allowNull: false, // Volver a NOT NULL
      references: {
        model: 'Permits',
        key: 'idPermit'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    console.log('✅ Columna PermitIdPermit vuelve a NOT NULL');
    return true;
  } catch (error) {
    console.error('❌ Error revirtiendo make-permit-nullable:', error);
    throw error;
  }
}

module.exports = { up, down };
