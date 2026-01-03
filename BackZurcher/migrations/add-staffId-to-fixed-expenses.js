/**
 * Migración: Agregar columna staffId y hacer paymentMethod NULLABLE
 * 
 * ✅ Cambios:
 * - Agregar columna: staffId (UUID, nullable)
 * - Cambiar paymentMethod: allowNull false -> allowNull true
 * - Agregar foreign key a Staffs
 * 
 * ✅ Seguridad: Idempotente en local y deploy
 * - Verifica si columna ya existe antes de agregarla
 * - Maneja errores gracefully
 * - Log detallado para debugging
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('\n🔄 [Migration] Iniciando: Agregar staffId a FixedExpenses...');

      // ============================================
      // 1️⃣ PASO 1: Verificar si tabla existe
      // ============================================
      console.log('📋 Verificando tabla FixedExpenses...');
      
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses';
      `, { transaction });

      if (tables.length === 0) {
        console.log('⚠️  Tabla FixedExpenses no existe. Se creará automáticamente.');
        await transaction.commit();
        return;
      }

      console.log('✅ Tabla FixedExpenses encontrada\n');

      // ============================================
      // 2️⃣ PASO 2: Agregar columna staffId
      // ============================================
      console.log('📝 Paso 2: Agregando columna staffId...');
      
      const [staffIdColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses'
        AND column_name = 'staffId';
      `, { transaction });

      if (staffIdColumns.length > 0) {
        console.log('   ℹ️  Columna staffId ya existe. Saltando...');
      } else {
        console.log('   📝 Creando columna staffId...');
        
        await queryInterface.addColumn(
          'FixedExpenses',
          'staffId',
          {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'Staffs',
              key: 'id'
            },
            onDelete: 'SET NULL',
            comment: 'Staff al cual está vinculado este gasto fijo (ej: Salario de un empleado)'
          },
          { transaction }
        );

        console.log('   ✅ Columna staffId agregada correctamente\n');
      }

      // ============================================
      // 3️⃣ PASO 3: Hacer paymentMethod NULLABLE
      // ============================================
      console.log('📝 Paso 3: Actualizando paymentMethod a NULLABLE...');
      
      // Usar SQL directo para evitar problemas de escaping en Sequelize
      const [paymentMethodInfo] = await queryInterface.sequelize.query(`
        SELECT is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses'
        AND column_name = 'paymentMethod';
      `, { transaction });

      if (paymentMethodInfo.length > 0 && paymentMethodInfo[0].is_nullable === 'NO') {
        console.log('   📝 Cambiando paymentMethod a NULLABLE...');
        
        // SQL directo - mucho más simple y confiable
        await queryInterface.sequelize.query(
          'ALTER TABLE "FixedExpenses" ALTER COLUMN "paymentMethod" DROP NOT NULL;',
          { transaction }
        );

        console.log('   ✅ paymentMethod ahora es NULLABLE\n');
      } else {
        console.log('   ℹ️  paymentMethod ya es NULLABLE. Saltando...\n');
      }

      // ============================================
      // ✅ ÉXITO
      // ============================================
      await transaction.commit();
      console.log('🎉 ✅ Migración completada exitosamente\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ ERROR EN MIGRACIÓN:');
      console.error(`   Tipo: ${error.name}`);
      console.error(`   Mensaje: ${error.message}`);
      if (error.sql) {
        console.error(`   SQL: ${error.sql}`);
      }
      console.error('\n');
      throw error;
    }
  },


  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('\n🔄 [Migration] Iniciando reversión: Remover staffId de FixedExpenses...');

      // ============================================
      // 1️⃣ PASO 1: Revertir paymentMethod a NOT NULL
      // ============================================
      console.log('📝 Paso 1: Revertiendo paymentMethod a NOT NULL...');

      const [paymentMethodInfo] = await queryInterface.sequelize.query(`
        SELECT is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses'
        AND column_name = 'paymentMethod';
      `, { transaction });

      if (paymentMethodInfo.length > 0 && paymentMethodInfo[0].is_nullable === 'YES') {
        console.log('   📝 Cambiando paymentMethod a NOT NULL...');
        
        // SQL directo - evita problemas de escaping
        await queryInterface.sequelize.query(
          'ALTER TABLE "FixedExpenses" ALTER COLUMN "paymentMethod" SET NOT NULL;',
          { transaction }
        );

        console.log('   ✅ paymentMethod revertido a NOT NULL\n');
      } else {
        console.log('   ℹ️  paymentMethod ya es NOT NULL. Saltando...\n');
      }

      // ============================================
      // 2️⃣ PASO 2: Remover columna staffId
      // ============================================
      console.log('📝 Paso 2: Removiendo columna staffId...');

      const [staffIdColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses'
        AND column_name = 'staffId';
      `, { transaction });

      if (staffIdColumns.length > 0) {
        console.log('   📝 Removiendo columna staffId...');
        
        await queryInterface.removeColumn(
          'FixedExpenses',
          'staffId',
          { transaction }
        );

        console.log('   ✅ Columna staffId removida correctamente\n');
      } else {
        console.log('   ℹ️  Columna staffId no existe. Saltando...\n');
      }

      // ============================================
      // ✅ ÉXITO
      // ============================================
      await transaction.commit();
      console.log('🎉 ✅ Reversión completada exitosamente\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ ERROR EN REVERSIÓN:');
      console.error(`   Tipo: ${error.name}`);
      console.error(`   Mensaje: ${error.message}`);
      if (error.sql) {
        console.error(`   SQL: ${error.sql}`);
      }
      console.error('\n');
      throw error;
    }
  }
};
