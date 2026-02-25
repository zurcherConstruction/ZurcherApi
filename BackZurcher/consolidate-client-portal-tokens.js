/**
 * 🔄 CONSOLIDACIÓN DE TOKENS DEL PORTAL CLIENTE
 * 
 * Este script consolida tokens duplicados siguiendo la nueva lógica:
 * 1. Agrupar budgets por email (prioridad máxima)
 * 2. Si tienen empresa, también agrupar por contactCompany
 * 3. Consolidar en un único token por grupo
 * 
 * EJECUTAR DESPUÉS DE:
 * - node analyze-missing-contactcompany.js
 * - node update-contactcompany.js
 */

require('dotenv').config();
const { Budget, sequelize } = require('./src/data');
const { Op } = require('sequelize');

async function consolidateClientPortalTokens() {
  try {
    console.log('🔄 Iniciando consolidación de tokens del portal cliente...\n');

    // 1. Obtener todos los budgets con token
    const budgetsWithToken = await Budget.findAll({
      attributes: ['idBudget', 'applicantEmail', 'contactCompany', 'clientPortalToken', 'updatedAt'],
      where: {
        applicantEmail: { [Op.ne]: null },
        clientPortalToken: { [Op.ne]: null }
      },
      order: [['applicantEmail', 'ASC'], ['updatedAt', 'DESC']]
    });

    console.log(`📊 Total de budgets con token: ${budgetsWithToken.length}\n`);

    // 2. Agrupar por email
    const emailGroups = {};
    
    budgetsWithToken.forEach(budget => {
      const email = budget.applicantEmail.toLowerCase().trim();
      
      if (!emailGroups[email]) {
        emailGroups[email] = {
          email: budget.applicantEmail,
          companies: new Set(),
          tokens: new Set(),
          budgets: [],
          selectedToken: null,
          selectedTokenDate: null
        };
      }
      
      emailGroups[email].budgets.push(budget);
      emailGroups[email].tokens.add(budget.clientPortalToken);
      if (budget.contactCompany && budget.contactCompany.trim()) {
        emailGroups[email].companies.add(budget.contactCompany);
      }
    });

    // 3. Analizar duplicados
    const duplicates = Object.values(emailGroups).filter(g => g.tokens.size > 1);
    const unique = Object.values(emailGroups).filter(g => g.tokens.size === 1);

    console.log(`✅ Emails con token único: ${unique.length}`);
    console.log(`⚠️  Emails con tokens duplicados: ${duplicates.length}\n`);

    if (duplicates.length === 0) {
      console.log('🎉 No hay tokens duplicados para consolidar');
      
      // Verificar agrupación por empresa
      await analyzeCompanyGrouping(budgetsWithToken);
      return;
    }

    // 4. Mostrar detalles de duplicados
    console.log('=' .repeat(100));
    console.log('📋 TOKENS DUPLICADOS DETECTADOS');
    console.log('='.repeat(100));
    console.log();

    let totalBudgetsToUpdate = 0;

    duplicates.forEach((group, index) => {
      // Seleccionar el token más reciente (más usado)
      const tokenCounts = {};
      group.budgets.forEach(b => {
        tokenCounts[b.clientPortalToken] = (tokenCounts[b.clientPortalToken] || 0) + 1;
      });

      // Token con más budgets, o el más reciente
      const mostUsedToken = Object.entries(tokenCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      const mostRecentBudget = group.budgets.find(b => b.clientPortalToken === mostUsedToken);
      
      group.selectedToken = mostUsedToken;
      group.selectedTokenDate = mostRecentBudget.updatedAt;

      const budgetsToUpdate = group.budgets.filter(b => b.clientPortalToken !== mostUsedToken);
      totalBudgetsToUpdate += budgetsToUpdate.length;

      console.log(`${index + 1}. Email: ${group.email}`);
      console.log(`   Tokens encontrados: ${group.tokens.size}`);
      console.log(`   Total de budgets: ${group.budgets.length}`);
      console.log(`   Empresas asociadas: ${group.companies.size > 0 ? Array.from(group.companies).join(', ') : 'Ninguna'}`);
      console.log(`   Token seleccionado: ${mostUsedToken.substring(0, 16)}... (usado en ${tokenCounts[mostUsedToken]} budgets)`);
      console.log(`   Budgets a actualizar: ${budgetsToUpdate.length}`);
      
      // Mostrar tokens que se descartarán
      const tokensToDiscard = Array.from(group.tokens).filter(t => t !== mostUsedToken);
      console.log(`   Tokens a descartar: ${tokensToDiscard.length}`);
      tokensToDiscard.forEach(token => {
        console.log(`      - ${token.substring(0, 16)}... (${tokenCounts[token]} budgets)`);
      });
      console.log();
    });

    // 5. Resumen pre-consolidación
    console.log('='.repeat(100));
    console.log('📊 RESUMEN PRE-CONSOLIDACIÓN');
    console.log('='.repeat(100));
    console.log(`Emails con duplicados: ${duplicates.length}`);
    console.log(`Total de budgets a actualizar: ${totalBudgetsToUpdate}`);
    console.log(`Tokens únicos antes: ${[...new Set(budgetsWithToken.map(b => b.clientPortalToken))].length}`);
    console.log(`Tokens únicos después: ${[...new Set(budgetsWithToken.map(b => b.clientPortalToken))].length - duplicates.reduce((sum, g) => sum + (g.tokens.size - 1), 0)}`);
    console.log();

    // 6. Confirmar consolidación
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('¿Proceder con la consolidación? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Consolidación cancelada por el usuario');
      return;
    }

    // 7. Ejecutar consolidación
    console.log('\n🔄 Consolidando tokens...\n');

    let totalUpdated = 0;

    for (const group of duplicates) {
      try {
        // Actualizar todos los budgets del email con el token seleccionado
        const [updatedCount] = await Budget.update(
          { clientPortalToken: group.selectedToken },
          {
            where: {
              applicantEmail: {
                [Op.iLike]: group.email
              }
            }
          }
        );

        totalUpdated += updatedCount;
        console.log(`✅ ${group.email}: ${updatedCount} budgets consolidados`);

        // Si hay empresas asociadas, también consolidar esos budgets
        if (group.companies.size > 0) {
          for (const company of group.companies) {
            const [companyUpdated] = await Budget.update(
              { clientPortalToken: group.selectedToken },
              {
                where: {
                  contactCompany: company,
                  clientPortalToken: { [Op.ne]: group.selectedToken }
                }
              }
            );
            
            if (companyUpdated > 0) {
              console.log(`   🏢 ${company}: ${companyUpdated} budgets adicionales consolidados`);
              totalUpdated += companyUpdated;
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error consolidando ${group.email}:`, error.message);
      }
    }

    // 8. Verificar resultado
    console.log('\n' + '='.repeat(100));
    console.log('✅ CONSOLIDACIÓN COMPLETADA');
    console.log('='.repeat(100));
    console.log(`Total de budgets actualizados: ${totalUpdated}`);
    console.log();

    // 9. Analizar agrupación por empresa después de consolidación
    await analyzeCompanyGrouping(await Budget.findAll({
      attributes: ['idBudget', 'applicantEmail', 'contactCompany', 'clientPortalToken'],
      where: {
        applicantEmail: { [Op.ne]: null },
        clientPortalToken: { [Op.ne]: null }
      }
    }));

  } catch (error) {
    console.error('❌ Error en consolidación:', error);
  } finally {
    await sequelize.close();
  }
}

/**
 * Analizar agrupación por empresa (múltiples emails, misma empresa)
 */
async function analyzeCompanyGrouping(budgets) {
  console.log('\n' + '='.repeat(100));
  console.log('🏢 ANÁLISIS DE AGRUPACIÓN POR EMPRESA');
  console.log('='.repeat(100));
  console.log();

  // Agrupar por empresa
  const companyGroups = {};
  
  budgets.filter(b => b.contactCompany && b.contactCompany.trim()).forEach(budget => {
    const company = budget.contactCompany.trim();
    
    if (!companyGroups[company]) {
      companyGroups[company] = {
        company,
        emails: new Set(),
        tokens: new Set(),
        budgetCount: 0
      };
    }
    
    companyGroups[company].emails.add(budget.applicantEmail.toLowerCase());
    companyGroups[company].tokens.add(budget.clientPortalToken);
    companyGroups[company].budgetCount++;
  });

  // Empresas con múltiples emails pero tokens diferentes
  const needsSync = Object.values(companyGroups).filter(g => g.emails.size > 1 && g.tokens.size > 1);

  if (needsSync.length === 0) {
    console.log('✅ Todas las empresas están correctamente agrupadas');
    return;
  }

  console.log(`⚠️  Empresas con múltiples emails y tokens diferentes: ${needsSync.length}\n`);

  needsSync.forEach((group, index) => {
    console.log(`${index + 1}. Empresa: ${group.company}`);
    console.log(`   Emails únicos: ${group.emails.size}`);
    console.log(`   Tokens diferentes: ${group.tokens.size}`);
    console.log(`   Total budgets: ${group.budgetCount}`);
    console.log(`   Emails: ${Array.from(group.emails).join(', ')}`);
    console.log();
  });

  console.log('💡 RECOMENDACIÓN: Estas empresas tienen múltiples contactos pero tokens diferentes.');
  console.log('   Ejecuta nuevamente la consolidación después de revisar los datos.');
}

// Ejecutar
consolidateClientPortalTokens();
