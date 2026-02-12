/**
 * 🔧 FIX: CAMBIAR ÍNDICE UNIQUE A NORMAL
 * 
 * El problema: Un cliente con múltiples budgets no puede compartir
 * el mismo token porque el índice es UNIQUE.
 * 
 * La solución: Permitir que múltiples budgets del mismo cliente
 * compartan el mismo token (un cliente = un enlace = todos sus proyectos)
 * 
 * EJECUTAR: node fix-client-portal-token-index.js
 */

const { conn } = require('./src/data');

async function fixClientPortalTokenIndex() {
  console.log('🔧 Corrigiendo índice de clientPortalToken...\n');

  const transaction = await conn.transaction();

  try {
    console.log('1️⃣ Eliminando índice UNIQUE actual...');
    try {
      await conn.query(`
        DROP INDEX IF EXISTS idx_budgets_client_portal_token;
      `, { transaction });
      console.log('   ✅ Índice UNIQUE eliminado');
    } catch (error) {
      console.log('   ⚠️  Error eliminando índice:', error.message);
    }

    console.log('\n2️⃣ Creando índice NORMAL (no único) para búsquedas rápidas...');
    try {
      await conn.query(`
        CREATE INDEX IF NOT EXISTS idx_budgets_client_portal_token_lookup 
        ON "Budgets" ("clientPortalToken") 
        WHERE "clientPortalToken" IS NOT NULL;
      `, { transaction });
      console.log('   ✅ Índice normal creado (permite tokens duplicados)');
    } catch (error) {
      console.log('   ⚠️  Error creando índice:', error.message);
    }

    console.log('\n3️⃣ Verificando índices actuales...');
    const [indexes] = await conn.query(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Budgets' 
      AND indexname LIKE '%client_portal_token%';
    `, { transaction });

    console.log('   📋 Índices encontrados:');
    indexes.forEach(idx => {
      console.log(`      - ${idx.indexname}`);
      console.log(`        ${idx.indexdef}`);
    });

    // Commit de la transacción
    await transaction.commit();

    console.log('\n✅ ¡Corrección completada exitosamente!');
    console.log('\n📋 CAMBIOS:');
    console.log('   • Índice UNIQUE eliminado');
    console.log('   • Índice NORMAL creado (permite múltiples budgets con el mismo token)');
    console.log('   • Ahora un cliente puede tener múltiples proyectos con el mismo token');
    console.log('\n🚀 Ahora puedes ejecutar nuevamente: node generate-tokens-existing-works.js');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error en la corrección:', error.message);
    console.error('🔄 Transacción revertida');
    throw error;
  }
}

// Ejecutar la corrección
if (require.main === module) {
  (async () => {
    try {
      await fixClientPortalTokenIndex();
      console.log('\n🎯 Corrección finalizada exitosamente');
      process.exit(0);
    } catch (error) {
      console.error('💥 Error ejecutando corrección:', error);
      process.exit(1);
    }
  })();
}

module.exports = { fixClientPortalTokenIndex };
