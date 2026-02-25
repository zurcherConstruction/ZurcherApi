/**
 * 🔍 ANÁLISIS DE CONTACT_COMPANY FALTANTES
 * 
 * Este script:
 * 1. Encuentra budgets con email pero sin contactCompany
 * 2. Agrupa por email y muestra estadísticas
 * 3. Sugiere qué contactCompany asignar (basado en otros budgets del mismo email)
 * 4. Genera reporte para revisión manual
 */

require('dotenv').config();
const { Budget, sequelize } = require('./src/data');
const { Op } = require('sequelize');

async function analyzeMissingContactCompany() {
  try {
    console.log('🔍 Analizando budgets sin contactCompany...\n');

    // 1. Obtener TODOS los budgets con sus emails y contactCompany
    const allBudgets = await Budget.findAll({
      attributes: ['idBudget', 'applicantEmail', 'contactCompany', 'applicantName', 'propertyAddress'],
      where: {
        applicantEmail: { [Op.ne]: null }
      },
      order: [['applicantEmail', 'ASC']]
    });

    console.log(`📊 Total de budgets con email: ${allBudgets.length}\n`);

    // 2. Separar en dos grupos
    const withCompany = allBudgets.filter(b => b.contactCompany && b.contactCompany.trim() !== '');
    const withoutCompany = allBudgets.filter(b => !b.contactCompany || b.contactCompany.trim() === '');

    console.log(`✅ Con contactCompany: ${withCompany.length}`);
    console.log(`❌ Sin contactCompany: ${withoutCompany.length}\n`);

    // 3. Agrupar por email los que NO tienen contactCompany
    const emailGroups = {};
    
    withoutCompany.forEach(budget => {
      const email = budget.applicantEmail.toLowerCase().trim();
      if (!emailGroups[email]) {
        emailGroups[email] = {
          email: budget.applicantEmail,
          name: budget.applicantName,
          count: 0,
          budgets: [],
          budgetIds: [], // 🔧 Array separado para IDs
          suggestedCompany: null
        };
      }
      emailGroups[email].count++;
      emailGroups[email].budgetIds.push(budget.idBudget); // 🔧 Agregar ID al array
      emailGroups[email].budgets.push({
        id: budget.idBudget,
        address: budget.propertyAddress
      });
    });

    // 4. Buscar si ese mismo email tiene budgets CON contactCompany (para sugerir)
    for (const email in emailGroups) {
      const budgetsWithCompany = withCompany.filter(
        b => b.applicantEmail.toLowerCase().trim() === email
      );
      
      if (budgetsWithCompany.length > 0) {
        // Tomar el contactCompany más común para este email
        const companies = budgetsWithCompany.map(b => b.contactCompany);
        const mostCommon = companies.sort((a, b) =>
          companies.filter(c => c === a).length - companies.filter(c => c === b).length
        ).pop();
        
        emailGroups[email].suggestedCompany = mostCommon;
        emailGroups[email].companyCounts = budgetsWithCompany.length;
      }
    }

    // 5. Generar reporte
    console.log('=' .repeat(100));
    console.log('📋 REPORTE DE BUDGETS SIN CONTACT_COMPANY');
    console.log('='.repeat(100));
    console.log();

    let totalNeedingCompany = 0;
    let canAutoSuggest = 0;
    let needManualReview = 0;

    const sorted = Object.values(emailGroups).sort((a, b) => b.count - a.count);

    sorted.forEach((group, index) => {
      totalNeedingCompany += group.count;
      
      console.log(`${index + 1}. Email: ${group.email}`);
      console.log(`   Nombre: ${group.name}`);
      console.log(`   Budgets sin empresa: ${group.count}`);
      
      if (group.suggestedCompany) {
        canAutoSuggest += group.count;
        console.log(`   ✅ SUGERENCIA: "${group.suggestedCompany}" (usado en ${group.companyCounts} otros budgets)`);
      } else {
        needManualReview += group.count;
        console.log(`   ⚠️  Sin sugerencia - REVISAR MANUALMENTE`);
      }
      
      console.log(`   Direcciones:`);
      group.budgets.slice(0, 3).forEach(b => {
        console.log(`     - Budget #${b.id}: ${b.address}`);
      });
      if (group.budgets.length > 3) {
        console.log(`     ... y ${group.budgets.length - 3} más`);
      }
      console.log();
    });

    // 6. Resumen final
    console.log('='.repeat(100));
    console.log('📊 RESUMEN');
    console.log('='.repeat(100));
    console.log(`Total de budgets sin contactCompany: ${totalNeedingCompany}`);
    console.log(`Pueden auto-completarse con sugerencia: ${canAutoSuggest}`);
    console.log(`Necesitan revisión manual: ${needManualReview}`);
    console.log(`Clientes únicos afectados: ${sorted.length}`);
    console.log();

    // 7. Generar datos para el script de actualización
    console.log('💾 Generando datos para script de actualización...\n');
    
    const updateData = sorted.map(group => ({
      email: group.email,
      name: group.name,
      budgetCount: group.count,
      budgetIds: group.budgetIds, // 🔧 Usar el array de IDs correcto
      suggestedCompany: group.suggestedCompany || '',
      needsManualReview: !group.suggestedCompany
    }));

    // Guardar en archivo JSON para referencia
    const fs = require('fs');
    fs.writeFileSync(
      './missing-contactcompany-report.json',
      JSON.stringify(updateData, null, 2)
    );

    console.log('✅ Reporte guardado en: missing-contactcompany-report.json');
    console.log('');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('1. Revisar el reporte JSON');
    console.log('2. Editar manualmente los que necesitan revisión');
    console.log('3. Ejecutar: node update-contactcompany.js (próximo script a crear)');
    console.log('');

  } catch (error) {
    console.error('❌ Error en análisis:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
analyzeMissingContactCompany();
