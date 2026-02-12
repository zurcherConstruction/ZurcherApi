/**
 * 🔄 SCRIPT DE MIGRACIÓN: GENERAR TOKENS PARA WORKS EXISTENTES
 * 
 * Este script genera automáticamente tokens del portal de cliente
 * para todos los works existentes que tengan email de cliente.
 * 
 * EJECUTAR: node generate-tokens-existing-works.js
 */

const { Work, Budget, conn } = require('./src/data');
const { generateOrGetClientPortalToken } = require('./src/services/ClientPortalService');

async function generateTokensForExistingWorks() {
  console.log('🚀 Iniciando generación de tokens para works existentes...\n');

  const transaction = await conn.transaction();

  try {
    // 1. Obtener todos los works con sus budgets
    console.log('📋 Obteniendo works existentes...');
    
    const works = await Work.findAll({
      include: [{
        model: Budget,
        as: 'budget',
        attributes: ['idBudget', 'applicantEmail', 'applicantName', 'contactCompany', 'clientPortalToken']
      }],
      transaction
    });

    console.log(`   Encontrados ${works.length} works totales`);

    // 2. Filtrar works que tienen email del cliente
    const worksWithEmail = works.filter(work => 
      work.budget && work.budget.applicantEmail
    );
    
    console.log(`   Works con email de cliente: ${worksWithEmail.length}`);

    // 3. Filtrar works que NO tienen token aún
    const worksWithoutToken = worksWithEmail.filter(work => 
      !work.budget.clientPortalToken
    );

    console.log(`   Works sin token del portal: ${worksWithoutToken.length}\n`);

    if (worksWithoutToken.length === 0) {
      console.log('✅ Todos los works con email ya tienen token del portal');
      await transaction.commit();
      return;
    }

    // 4. Procesar cada work sin token
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const processedEmails = new Set(); // Para evitar duplicados

    for (const work of worksWithoutToken) {
      processedCount++;
      const { budget } = work;
      
      console.log(`\n--- Procesando Work #${work.idWork} (${processedCount}/${worksWithoutToken.length}) ---`);
      console.log(`   Cliente: ${budget.applicantName || 'Sin nombre'} <${budget.applicantEmail}>`);
      console.log(`   Empresa: ${budget.contactCompany || 'Sin empresa'}`);
      console.log(`   Dirección: ${work.propertyAddress}`);

      try {
        // Generar token directamente usando el servicio correcto
        const token = await generateOrGetClientPortalToken(
          budget.applicantEmail, 
          budget.contactCompany
        );

        if (token) {
          successCount++;
          
          // Marcar email como procesado (normalizado)
          const normalizedEmail = budget.applicantEmail.toLowerCase().trim();
          const emailKey = `${normalizedEmail}|${budget.contactCompany || ''}`;
          
          if (!processedEmails.has(emailKey)) {
            processedEmails.add(emailKey);
            
            // Construir URL del portal
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const portalUrl = `${baseUrl}/client-portal/${token}`;
            
            console.log(`   ✅ Token generado: ${token.substring(0, 12)}...`);
            console.log(`   🔗 URL del portal: ${portalUrl}`);
          } else {
            console.log(`   ℹ️  Cliente ya procesado (email normalizado: ${normalizedEmail})`);
          }
        } else {
          console.log(`   ⚠️  No se generó token (ya existe o no necesario)`);
        }

      } catch (error) {
        // No contar como error si es porque ya existe el token o es error de duplicado
        if (error.message.includes('ya existe') || 
            error.message.includes('duplicada') ||
            error.name === 'SequelizeUniqueConstraintError') {
          console.log(`   ℹ️  Token ya existe para este cliente`);
        } else {
          errorCount++;
          console.error(`   ❌ Error procesando work #${work.idWork}:`, error.message);
        }
      }
    }

    // 5. Resumen final
    console.log('\n🎉 ¡Migración completada!');
    console.log('\n📊 RESUMEN:');
    console.log(`   • Works procesados: ${processedCount}`);
    console.log(`   • Tokens generados exitosamente: ${successCount}`);
    console.log(`   • Errores: ${errorCount}`);
    console.log(`   • Clientes únicos procesados: ${processedEmails.size}`);
    
    if (successCount > 0) {
      console.log('\n✅ Los clientes ya pueden acceder a sus portales de seguimiento');
      console.log('   Los enlaces se pueden obtener desde WorkDetail de cada proyecto');
    }

    // Commit de la transacción
    await transaction.commit();

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error en la migración:', error.message);
    console.error('🔄 Transacción revertida');
    throw error;
  }
}

// Ejecutar la migración
if (require.main === module) {
  (async () => {
    try {
      await generateTokensForExistingWorks();
      console.log('\n🎯 Migración finalizada exitosamente');
      process.exit(0);
    } catch (error) {
      console.error('💥 Error ejecutando migración:', error);
      process.exit(1);
    }
  })();
}

module.exports = { generateTokensForExistingWorks };