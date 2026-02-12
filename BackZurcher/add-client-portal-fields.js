/**
 * 🔄 MIGRACIÓN: CAMPOS DEL PORTAL DE CLIENTES
 * 
 * Agrega los campos necesarios para el portal de seguimiento de clientes:
 * - budgets.clientPortalToken: Token único para acceso al portal
 * - worknotes.isVisibleToClient: Controla visibilidad de notas para clientes
 * 
 * EJECUTAR: node add-client-portal-fields.js
 */

const { Budget, WorkNote, conn } = require('./src/data');

async function addClientPortalFields() {
  console.log('🚀 Iniciando migración de campos del portal de clientes...\n');

  const transaction = await conn.transaction();

  try {
    console.log('📋 Verificando campos existentes...');

    // 1. Agregar campo clientPortalToken a la tabla Budgets
    try {
      await conn.query(`
        ALTER TABLE "Budgets" 
        ADD COLUMN IF NOT EXISTS "clientPortalToken" VARCHAR(255);
      `, { transaction });
      console.log('✅ Campo clientPortalToken agregado a Budgets');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Campo clientPortalToken ya existe en Budgets');
      } else {
        throw error;
      }
    }

    // 2. Crear índice normal para clientPortalToken (NO único - permite múltiples budgets por cliente)
    try {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_budgets_client_portal_token 
        ON "Budgets" ("clientPortalToken") 
        WHERE "clientPortalToken" IS NOT NULL;
      `, { transaction });
      console.log('✅ Índice normal creado para clientPortalToken (permite tokens compartidos)');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Índice para clientPortalToken ya existe');
      } else {
        throw error;
      }
    }

    // 3. Agregar campo isVisibleToClient a la tabla WorkNotes
    try {
      await conn.query(`
        ALTER TABLE "WorkNotes" 
        ADD COLUMN IF NOT EXISTS "isVisibleToClient" BOOLEAN DEFAULT FALSE;
      `, { transaction });
      console.log('✅ Campo isVisibleToClient agregado a WorkNotes');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Campo isVisibleToClient ya existe en WorkNotes');
      } else {
        throw error;
      }
    }

    // 4. Crear índice para isVisibleToClient
    try {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_worknotes_visible_to_client 
        ON "WorkNotes" ("isVisibleToClient");
      `, { transaction });
      console.log('✅ Índice creado para isVisibleToClient');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Índice para isVisibleToClient ya existe');
      } else {
        throw error;
      }
    }

    // 5. Agregar comentarios a las columnas
    try {
      await conn.query(`
        COMMENT ON COLUMN "Budgets"."clientPortalToken" IS 'Token único para acceso al portal de seguimiento del cliente';
      `, { transaction });

      await conn.query(`
        COMMENT ON COLUMN "WorkNotes"."isVisibleToClient" IS 'Indica si la nota es visible para el cliente en el portal';
      `, { transaction });
      console.log('✅ Comentarios agregados a las columnas');
    } catch (error) {
      console.log('⚠️  Error agregando comentarios (no crítico):', error.message);
    }

    // 6. Verificar que los campos se crearon correctamente
    const [budgetColumns] = await conn.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Budgets' 
      AND column_name IN ('clientPortalToken');
    `, { transaction });

    const [workNoteColumns] = await conn.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'WorkNotes' 
      AND column_name IN ('isVisibleToClient');
    `, { transaction });

    console.log('\n📊 VERIFICACIÓN DE CAMPOS:');
    console.log('   Budgets:', budgetColumns.length > 0 ? '✅ clientPortalToken' : '❌ clientPortalToken');
    console.log('   WorkNotes:', workNoteColumns.length > 0 ? '✅ isVisibleToClient' : '❌ isVisibleToClient');

    // Commit de la transacción
    await transaction.commit();

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📋 RESUMEN DE CAMBIOS:');
    console.log('   • budgets.clientPortalToken: Token de acceso al portal');
    console.log('   • worknotes.isVisibleToClient: Control de visibilidad');
    console.log('   • Índices creados para optimizar búsquedas');
    console.log('\n✅ El portal de clientes está listo para funcionar');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error en la migración:', error.message);
    console.error('🔄 Transacción revertida');
    throw error;
  }
}

// Ejecutar la migración
if (require.main === module) {
  (async () => {
    try {
      await addClientPortalFields();
      process.exit(0);
    } catch (error) {
      console.error('💥 Error ejecutando migración:', error);
      process.exit(1);
    }
  })();
}

module.exports = { addClientPortalFields };