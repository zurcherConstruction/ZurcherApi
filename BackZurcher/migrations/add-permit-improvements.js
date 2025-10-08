/**
 * Migración: Mejoras al modelo Permit
 * - Hacer permitNumber obligatorio y único
 * - Agregar campo isPBTS para sistemas ATU
 * - Agregar campo notificationEmails para múltiples destinatarios
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Iniciando migración: Mejoras al modelo Permit...');
      
      // 1. Generar números de permit únicos para los que no tienen
      console.log('📝 Generando números de permit para registros sin número...');
      await queryInterface.sequelize.query(`
        UPDATE "Permits"
        SET "permitNumber" = CONCAT('TEMP-', "idPermit")
        WHERE "permitNumber" IS NULL OR "permitNumber" = '';
      `, { transaction });
      
      // 2. Hacer permitNumber NOT NULL
      console.log('✅ Haciendo permitNumber obligatorio...');
      await queryInterface.changeColumn('Permits', 'permitNumber', {
        type: Sequelize.TEXT,
        allowNull: false
      }, { transaction });
      
      // 3. Crear índice único para permitNumber (si no existe)
      console.log('🔑 Creando índice único para permitNumber...');
      try {
        await queryInterface.addIndex('Permits', ['permitNumber'], {
          unique: true,
          name: 'unique_permit_number',
          transaction
        });
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('⚠️  Índice único ya existe, continuando...');
        } else {
          throw err;
        }
      }
      
      // 4. Agregar campo isPBTS
      console.log('🆕 Agregando campo isPBTS...');
      await queryInterface.addColumn('Permits', 'isPBTS', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, { transaction });
      
      // 5. Agregar campo notificationEmails
      console.log('📧 Agregando campo notificationEmails...');
      await queryInterface.addColumn('Permits', 'notificationEmails', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      }, { transaction });
      
      await transaction.commit();
      console.log('✅ Migración completada exitosamente');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en la migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Revirtiendo migración: Mejoras al modelo Permit...');
      
      // Revertir en orden inverso
      await queryInterface.removeColumn('Permits', 'notificationEmails', { transaction });
      await queryInterface.removeColumn('Permits', 'isPBTS', { transaction });
      
      await queryInterface.removeIndex('Permits', 'unique_permit_number', { transaction });
      
      await queryInterface.changeColumn('Permits', 'permitNumber', {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction });
      
      await transaction.commit();
      console.log('✅ Reversión completada');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al revertir:', error);
      throw error;
    }
  }
};
