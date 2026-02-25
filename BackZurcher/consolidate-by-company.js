/**
 * 🏢 CONSOLIDACIÓN DE TOKENS POR EMPRESA
 * 
 * Este script consolida tokens cuando múltiples emails pertenecen a la misma empresa
 * Aplicando la nueva lógica: todos los budgets de una empresa deben compartir el mismo token
 */

require('dotenv').config();
const { Budget, sequelize } = require('./src/data');
const { Op } = require('sequelize');

async function consolidateByCompany() {
  try {
    console.log('🏢 Consolidando tokens por empresa...\n');

    // 1. Obtener todos los budgets con empresa y token
    const budgets = await Budget.findAll({
      attributes: ['idBudget', 'applicantEmail', 'contactCompany', 'clientPortalToken', 'updatedAt'],
      where: {
        contactCompany: { [Op.ne]: null },
        contactCompany: { [Op.ne]: '' },
        clientPortalToken: { [Op.ne]: null }
      },
      order: [['contactCompany', 'ASC'], ['updatedAt', 'DESC']]
    });

    console.log(`📊 Total de budgets con empresa y token: ${budgets.length}\n`);

    // 2. Agrupar por empresa
    const companyGroups = {};
    
    budgets.forEach(budget => {
      const company = budget.contactCompany.trim();
      
      if (!companyGroups[company]) {
        companyGroups[company] = {
          company,
          emails: new Set(),
          tokens: new Set(),
          budgets: [],
          selectedToken: null
        };
      }
      
      companyGroups[company].emails.add(budget.applicantEmail.toLowerCase());
      companyGroups[company].tokens.add(budget.clientPortalToken);
      companyGroups[company].budgets.push(budget);
    });

    // 3. Identificar empresas con múltiples tokens
    const needsConsolidation = Object.values(companyGroups).filter(g => g.tokens.size > 1);
    const alreadyConsolidated = Object.values(companyGroups).filter(g => g.tokens.size === 1);

    console.log(`✅ Empresas ya consolidadas: ${alreadyConsolidated.length}`);
    console.log(`⚠️  Empresas con múltiples tokens: ${needsConsolidation.length}\n`);

    if (needsConsolidation.length === 0) {
      console.log('🎉 Todas las empresas están correctamente consolidadas');
      return;
    }

    // 4. Mostrar detalles
    console.log('='.repeat(100));
    console.log('📋 EMPRESAS QUE NECESITAN CONSOLIDACIÓN');
    console.log('='.repeat(100));
    console.log();

    needsConsolidation.forEach((group, index) => {
      // Seleccionar el token más usado (o el más reciente)
      const tokenCounts = {};
      group.budgets.forEach(b => {
        tokenCounts[b.clientPortalToken] = (tokenCounts[b.clientPortalToken] || 0) + 1;
      });

      const mostUsedToken = Object.entries(tokenCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      group.selectedToken = mostUsedToken;

      console.log(`${index + 1}. Empresa: ${group.company}`);
      console.log(`   Emails asociados: ${group.emails.size} (${Array.from(group.emails).join(', ')})`);
      console.log(`   Tokens encontrados: ${group.tokens.size}`);
      console.log(`   Total budgets: ${group.budgets.length}`);
      console.log(`   Token seleccionado: ${mostUsedToken.substring(0, 16)}... (usado en ${tokenCounts[mostUsedToken]} budgets)`);
      
      const tokensToDiscard = Array.from(group.tokens).filter(t => t !== mostUsedToken);
      console.log(`   Tokens a consolidar: ${tokensToDiscard.length}`);
      tokensToDiscard.forEach(token => {
        const emails = group.budgets.filter(b => b.clientPortalToken === token).map(b => b.applicantEmail);
        console.log(`      - ${token.substring(0, 16)}... (${tokenCounts[token]} budgets de: ${[...new Set(emails)].join(', ')})`);
      });
      console.log();
    });

    // 5. Confirmar
    console.log('='.repeat(100));
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('¿Proceder con la consolidación por empresa? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Consolidación cancelada');
      return;
    }

    // 6. Ejecutar consolidación
    console.log('\n🔄 Consolidando tokens por empresa...\n');

    let totalUpdated = 0;

    for (const group of needsConsolidation) {
      try {
        // Actualizar TODOS los budgets de esta empresa con el token seleccionado
        const [updatedCount] = await Budget.update(
          { clientPortalToken: group.selectedToken },
          {
            where: {
              contactCompany: group.company
            }
          }
        );

        totalUpdated += updatedCount;
        console.log(`✅ ${group.company}: ${updatedCount} budgets consolidados con token ${group.selectedToken.substring(0, 16)}...`);

        // Verificar cuántos budgets tiene ahora cada email de esta empresa
        const emailDetails = await Budget.findAll({
          attributes: ['applicantEmail', [sequelize.fn('COUNT', sequelize.col('idBudget')), 'count']],
          where: { contactCompany: group.company },
          group: ['applicantEmail']
        });

        emailDetails.forEach(detail => {
          console.log(`   📧 ${detail.applicantEmail}: ${detail.get('count')} budgets`);
        });

      } catch (error) {
        console.error(`❌ Error consolidando empresa ${group.company}:`, error.message);
      }
    }

    // 7. Resumen
    console.log('\n' + '='.repeat(100));
    console.log('✅ CONSOLIDACIÓN COMPLETADA');
    console.log('='.repeat(100));
    console.log(`Empresas consolidadas: ${needsConsolidation.length}`);
    console.log(`Total de budgets actualizados: ${totalUpdated}`);
    console.log();

    // 8. Verificar estado final
    console.log('🔍 Verificando estado final...\n');

    const finalBudgets = await Budget.findAll({
      attributes: ['contactCompany', 'clientPortalToken'],
      where: {
        contactCompany: { [Op.ne]: null },
        contactCompany: { [Op.ne]: '' },
        clientPortalToken: { [Op.ne]: null }
      }
    });

    const finalGroups = {};
    finalBudgets.forEach(b => {
      const company = b.contactCompany.trim();
      if (!finalGroups[company]) {
        finalGroups[company] = new Set();
      }
      finalGroups[company].add(b.clientPortalToken);
    });

    const stillNeedWork = Object.entries(finalGroups).filter(([_, tokens]) => tokens.size > 1);

    if (stillNeedWork.length === 0) {
      console.log('🎉 Todas las empresas tienen un único token');
    } else {
      console.log(`⚠️  ${stillNeedWork.length} empresas aún tienen múltiples tokens`);
      stillNeedWork.forEach(([company, tokens]) => {
        console.log(`   - ${company}: ${tokens.size} tokens`);
      });
    }

  } catch (error) {
    console.error('❌ Error en consolidación:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
consolidateByCompany();
