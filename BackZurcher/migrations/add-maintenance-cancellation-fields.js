/**
 * Migración: Agregar campos de cancelación a MaintenanceVisits
 * 
 * ✅ Cambios:
 * - Agregar nuevos valores ENUM: cancelled_by_client, postponed_no_access, cancelled_other
 * - Agregar columna: cancellation_reason (TEXT, nullable)
 * - Agregar columna: cancellation_date (TIMESTAMP, nullable) 
 * - Agregar columna: rescheduled_date (DATE, nullable)
 * - Crear índices para optimización
 * 
 * ✅ Seguridad: Idempotente en local y deploy
 * - Verifica si columnas ya existen antes de agregarlas
 * - Verifica si valores ENUM ya existen antes de agregarlos
 * - Maneja errores gracefully
 * - Log detallado para debugging
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('\n🔄 [Migration] Iniciando: Agregar campos de cancelación a MaintenanceVisits...');

      // ============================================
      // 1️⃣ PASO 1: Verificar si tabla existe
      // ============================================
      console.log('📋 Verificando tabla MaintenanceVisits...');
      
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'MaintenanceVisits';
      `, { transaction });

      if (tables.length === 0) {
        console.log('⚠️  Tabla MaintenanceVisits no existe. Saltando migración.');
        await transaction.commit();
        return;
      }

      console.log('✅ Tabla MaintenanceVisits encontrada\n');

      // ============================================
      // 2️⃣ PASO 2: Verificar y agregar valores ENUM
      // ============================================
      console.log('📝 Paso 2: Verificando estados ENUM...');
      
      const [enumValues] = await queryInterface.sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'enum_MaintenanceVisits_status';
      `, { transaction });

      const existingStates = enumValues.map(row => row.enumlabel);
      const requiredStates = ['cancelled_by_client', 'postponed_no_access', 'cancelled_other'];
      const missingStates = requiredStates.filter(state => !existingStates.includes(state));
      
      console.log('Estados existentes:', existingStates);
      console.log('Estados faltantes:', missingStates);

      if (missingStates.length > 0) {
        console.log('➕ Agregando estados ENUM faltantes...');
        for (const state of missingStates) {
          try {
            await queryInterface.sequelize.query(
              `ALTER TYPE "enum_MaintenanceVisits_status" ADD VALUE '${state}';`,
              { transaction }
            );
            console.log(`   ✅ Estado agregado: ${state}`);
          } catch (error) {
            if (error.message.includes('already exists')) {
              console.log(`   ⚠️ Estado ya existe: ${state}`);
            } else {
              throw error;
            }
          }
        }
      } else {
        console.log('✅ Todos los estados ENUM ya existen\n');
      }

      // ============================================
      // 3️⃣ PASO 3: Agregar columna cancellation_reason
      // ============================================
      console.log('📝 Paso 3: Agregando columna cancellation_reason...');
      
      const [reasonColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'MaintenanceVisits'
        AND column_name = 'cancellation_reason';
      `, { transaction });

      if (reasonColumns.length === 0) {
        await queryInterface.addColumn('MaintenanceVisits', 'cancellation_reason', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Motivo detallado de cancelación o postergación'
        }, { transaction });
        
        console.log('   ✅ Columna cancellation_reason agregada');
      } else {
        console.log('   ⚠️ Columna cancellation_reason ya existe');
      }

      // ============================================
      // 4️⃣ PASO 4: Agregar columna cancellation_date
      // ============================================
      console.log('📝 Paso 4: Agregando columna cancellation_date...');
      
      const [dateColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'MaintenanceVisits'
        AND column_name = 'cancellation_date';
      `, { transaction });

      if (dateColumns.length === 0) {
        await queryInterface.addColumn('MaintenanceVisits', 'cancellation_date', {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Fecha en que se canceló o postergó'
        }, { transaction });
        
        console.log('   ✅ Columna cancellation_date agregada');
      } else {
        console.log('   ⚠️ Columna cancellation_date ya existe');
      }

      // ============================================
      // 5️⃣ PASO 5: Agregar columna rescheduled_date
      // ============================================
      console.log('📝 Paso 5: Agregando columna rescheduled_date...');
      
      const [rescheduleColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'MaintenanceVisits'
        AND column_name = 'rescheduled_date';
      `, { transaction });

      if (rescheduleColumns.length === 0) {
        await queryInterface.addColumn('MaintenanceVisits', 'rescheduled_date', {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Nueva fecha propuesta cuando se posterga'
        }, { transaction });
        
        console.log('   ✅ Columna rescheduled_date agregada');
      } else {
        console.log('   ⚠️ Columna rescheduled_date ya existe');
      }

      // ============================================
      // 6️⃣ PASO 6: Crear índices para optimización
      // ============================================
      console.log('📝 Paso 6: Creando índices...');
      
      try {
        // Índice para status (ya puede existir)
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS "idx_maintenance_visits_status" 
          ON "MaintenanceVisits"("status");
        `, { transaction });
        console.log('   ✅ Índice de status verificado');

        // Índice para cancellation_date
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS "idx_maintenance_visits_cancellation_date" 
          ON "MaintenanceVisits"("cancellation_date");
        `, { transaction });
        console.log('   ✅ Índice de cancellation_date creado');

      } catch (error) {
        console.log('   ⚠️ Error creando índices (pueden ya existir):', error.message);
      }

      await transaction.commit();

      // ============================================
      // 7️⃣ PASO 7: Verificación final
      // ============================================
      console.log('\n📊 Verificación final...');
      const [finalCheck] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'MaintenanceVisits' 
        AND column_name IN ('cancellation_reason', 'cancellation_date', 'rescheduled_date')
        ORDER BY column_name;
      `);
      
      if (finalCheck.length > 0) {
        console.log('Columnas creadas exitosamente:');
        finalCheck.forEach(row => {
          console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      }

      console.log('\n✅ [Migration] COMPLETADA: Campos de cancelación agregados correctamente\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ [Migration] ERROR:', error.message);
      console.error('Stack completo:', error.stack);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('\n🔄 [Migration] Revertiendo: Campos de cancelación...');

      // Eliminar columnas
      const columnsToRemove = ['cancellation_reason', 'cancellation_date', 'rescheduled_date'];
      
      for (const columnName of columnsToRemove) {
        try {
          await queryInterface.removeColumn('MaintenanceVisits', columnName, { transaction });
          console.log(`   ✅ Columna ${columnName} eliminada`);
        } catch (error) {
          console.log(`   ⚠️ Error eliminando ${columnName}:`, error.message);
        }
      }

      // Eliminar índices
      try {
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS "idx_maintenance_visits_cancellation_date";
        `, { transaction });
        console.log('   ✅ Índice de cancellation_date eliminado');
      } catch (error) {
        console.log('   ⚠️ Error eliminando índices:', error.message);
      }

      await transaction.commit();
      console.log('\n✅ [Migration] REVERTIDA correctamente\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ [Migration] ERROR al revertir:', error.message);
      throw error;
    }
  }
};