/**
 * SCRIPT COMPLETO: Carga de Works Legacy de Mantenimiento
 * 
 * Crea estructura completa con datos PLACEHOLDER para editar después:
 * 1. Budget (status: legacy_maintenance, datos falsos)
 * 2. Permit (reutiliza existente o crea nuevo)
 * 3. BudgetLineItem ($0)
 * 4. Work (maintenance, vinculado a Budget)
 * 5. MaintenanceVisit (programada)
 * 
 * PROTECCIÓN: Verifica si ya existen Budgets o Works duplicados antes de crear
 * 
 * DESPUÉS puedes editar con componente especial:
 * - Nombre cliente, email, teléfono
 * - Reemplazar Permit
 * - Site plan PDF
 * - Optional docs
 * 
 * USO: 
 *   node load-complete-legacy-maintenance.js              # Ejecutar normalmente
 *   node load-complete-legacy-maintenance.js --dry-run    # Solo verificar, sin crear
 */

require('dotenv').config();
const { Work, MaintenanceVisit, Budget, Staff, Permit, BudgetLineItem } = require('./src/data');
const { v4: uuidv4 } = require('uuid');

// Modo dry-run (solo verificar)
const DRY_RUN = process.argv.includes('--dry-run');

// 📅 Listado completo de 42 mantenimientos
const maintenanceData = [   


  { address: '52 Paula, Lehigh Acres, FL, 33976', visitDate: '2026-09-30', visitNumber: 1 },
  { address: '718 Shasta Cir., LaBelle, FL, 33935', visitDate: '2026-11-30', visitNumber: 1 },
  { address: '5012 Tradewinds Cir., LaBelle, FL, 33935', visitDate: '2026-11-30', visitNumber: 1 },
  { address: '8042 Buttercup Cir, LaBelle, FL, 33935', visitDate: '2026-11-30', visitNumber: 1 },
  { address: '8044 Buttercup Cir, LaBelle , FL, 33936', visitDate: '2026-11-30', visitNumber: 1 },
  // MAYO 2025
  // { address: '935 Panda Dr, Lehigh Acres', visitDate: '2025-05-05', visitNumber: 1 },
  // { address: '614 Locust ave. Lehigh Acres', visitDate: '2025-05-20', visitNumber: 1 },
  // { address: '1028 Milwaukee blvd, Lehigh Acres', visitDate: '2025-05-05', visitNumber: 1 },
  // { address: '323 Mangonia Ave, Lehigh Acres', visitDate: '2025-05-20', visitNumber: 1 },
  // { address: '219 Bell Blvd., Lehigh Acres', visitDate: '2025-05-06', visitNumber: 1 },
  // { address: '2614 39th st sw, Lehigh Acres', visitDate: '2025-05-11', visitNumber: 1 },
  
  // JUNIO 2025
  // { address: '145 Bell Blvd, Lehigh Acres', visitDate: '2025-06-12', visitNumber: 1 },
  // { address: '902 Grant Blvd, Lehigh Acres', visitDate: '2025-06-04', visitNumber: 1 },
  // { address: '912 Anthony st, Lehigh Acres', visitDate: '2025-06-17', visitNumber: 1 },
  // { address: '166 Freemont Ave S, Lehigh acres', visitDate: '2025-06-04', visitNumber: 1 },
  // { address: '164 Thornton ave. Lehigh acres', visitDate: '2025-06-04', visitNumber: 1 },
  // { address: '336 Hermosa Ave. Lehigh acres', visitDate: '2025-06-04', visitNumber: 1 },
  // { address: '815 Sentinela Blvd, Lehigh Acres', visitDate: '2025-06-04', visitNumber: 1 },
  // { address: '195 Beckley Dr. Lehigh Acres', visitDate: '2025-06-12', visitNumber: 1 },
  
  // JULIO 2025
  // { address: '642 Stanley ave, Lehigh Acres', visitDate: '2025-07-21', visitNumber: 1 },
  // { address: '2509 38th St. Lehigh Acres', visitDate: '2025-07-30', visitNumber: 1 },
  
  // AGOSTO 2025
  // { address: '945 Butler St e, Lehigh Acres', visitDate: '2025-08-21', visitNumber: 1 },
  // { address: '944 Grant Blvd, Lehigh acres', visitDate: '2025-08-20', visitNumber: 1 },
  // { address: '1108 Cove st e, Lehigh Acres', visitDate: '2025-08-26', visitNumber: 1 },
  // { address: '1023 Bank Ave s, Lehigh acres', visitDate: '2025-08-17', visitNumber: 1 },
  // { address: '712 Clemwood ave s, Lehigh Acres', visitDate: '2025-08-25', visitNumber: 1 },
  // { address: '325 Hermosa ave, Lehigh Acres', visitDate: '2025-08-21', visitNumber: 1 },
  
  // SEPTIEMBRE 2025
  // { address: '546 Montclair Ave S, Lehigh Acres', visitDate: '2025-09-04', visitNumber: 1 },
  // { address: '1131 Columbus blvd, Lehigh Acres', visitDate: '2025-09-05', visitNumber: 1 },
  // { address: '2615 23rd, Lehigh Acres', visitDate: '2025-09-12', visitNumber: 1 },
  // { address: '322 Browardave, Lehigh Acres', visitDate: '2025-09-13', visitNumber: 1 },
  // { address: '1037 Macy st e, Lehigh Acres', visitDate: '2025-09-27', visitNumber: 1 },
  // { address: '748 Homestead rd S, Lehigh Acres', visitDate: '2025-09-18', visitNumber: 1 },
  // { address: '1135 Columbus Blvd, Lehigh acres', visitDate: '2025-09-05', visitNumber: 1 },
  
  // OCTUBRE 2025
  // { address: '1215 Bayou St. Lehigh Acres', visitDate: '2025-10-23', visitNumber: 1 },
  // { address: '1127 Holly ave S, Lehigh Acres', visitDate: '2025-10-23', visitNumber: 1 },
  
  // NOVIEMBRE 2025
  // { address: '842/844 Alabama Rd S. Lehigh Acres', visitDate: '2025-11-28', visitNumber: 1 },
  // { address: '552 Cottonwood av S, Lehigh Acres', visitDate: '2025-11-22', visitNumber: 1 },
  // { address: '825 Porter, Lehigh Acres', visitDate: '2025-11-09', visitNumber: 1 },
  // { address: '204 Aurora av 2, Lehigh Acres', visitDate: '2025-11-09', visitNumber: 1 },
  // { address: '1825 Lindenwood Dr, Lehigh Acres', visitDate: '2025-11-09', visitNumber: 1 },
  // { address: '942 Sunrise Blvd, Lehigh Acres', visitDate: '2025-11-09', visitNumber: 1 },
  // { address: '4105 E 15th St. Lehigh Acres', visitDate: '2025-11-23', visitNumber: 1 },
  // { address: '337 Jourferie Rd, Lehigh Acres', visitDate: '2025-11-30', visitNumber: 1 },
  
  // DICIEMBRE 2025
  // { address: '1502 Oak ave, Lake Placid', visitDate: '2025-12-02', visitNumber: 1 },
  // { address: '1505 chatsworth st, Lake Placid', visitDate: '2025-12-02', visitNumber: 1 },
  // { address: '1507 Chatsworth st, Lake Placid', visitDate: '2025-12-02', visitNumber: 1 },
];

async function loadCompleteLegacyMaintenance() {
  try {
    console.log('\n🏗️  CARGA COMPLETA: Legacy Maintenance Works\n');
    if (DRY_RUN) {
      console.log('⚠️  MODO DRY-RUN: Solo verificación, NO se crearán registros\n');
    }
    console.log('═'.repeat(70));
    console.log(`\n📊 Total de trabajos: ${maintenanceData.length}\n`);

    // Obtener staff
    const defaultStaff = await Staff.findOne({ where: { role: 'owner' } });
    if (!defaultStaff) {
      throw new Error('No se encontró staff owner');
    }

    console.log(`👤 Staff: ${defaultStaff.name} (${defaultStaff.id})\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const data of maintenanceData) {
      try {
        // VERIFICACIÓN 1: Budget legacy existente
        const existingBudget = await Budget.findOne({
          where: { 
            propertyAddress: data.address,
            status: 'legacy_maintenance'
          }
        });

        if (existingBudget) {
          console.log(`⏭️  SKIP (Budget existe): ${data.address}`);
          skipped++;
          continue;
        }

        // VERIFICACIÓN 2: Work existente con esta dirección
        const existingWork = await Work.findOne({
          where: { 
            propertyAddress: data.address,
            status: 'maintenance'
          }
        });

        if (existingWork) {
          console.log(`⏭️  SKIP (Work existe): ${data.address}`);
          skipped++;
          continue;
        }

        // PASO 1: Buscar o crear Permit
        let permit = await Permit.findOne({
          where: { propertyAddress: data.address }
        });

        if (!permit) {
          if (DRY_RUN) {
            console.log(`🔍 SERÍA CREADO Permit para: ${data.address}`);
          } else {
            permit = await Permit.create({
              idPermit: uuidv4(),
              propertyAddress: data.address,
              permitNumber: `LEGACY-MAINT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              permitType: 'septic_maintenance',
              status: 'approved',
              applicationDate: new Date(data.visitDate),
              approvalDate: new Date(data.visitDate),
              expirationDate: new Date(new Date(data.visitDate).setFullYear(new Date(data.visitDate).getFullYear() + 5)),
              notes: 'EDITAR: Legacy permit - replace with real permit data',
              createdAt: new Date(data.visitDate),
              updatedAt: new Date(data.visitDate)
            });
          }
        }

        if (DRY_RUN) {
          console.log(`✅ DRY-RUN: ${data.address} - TODO OK (no se creó nada)`);
          created++;
          continue;
        }

        // PASO 2: Crear Budget legacy
        const budget = await Budget.create({
          propertyAddress: data.address,
          applicantName: '⚠️ EDITAR NOMBRE CLIENTE',
          clientEmail: 'editar@email.com',
          clientPhone: '000-000-0000',
          date: new Date(data.visitDate).toISOString().split('T')[0],
          expirationDate: new Date(new Date(data.visitDate).setMonth(new Date(data.visitDate).getMonth() + 6)).toISOString().split('T')[0],
          status: 'legacy_maintenance',
          PermitIdPermit: permit.idPermit,
          initialPayment: 0,
          subtotalPrice: 0,
          totalPrice: 0,
          discountAmount: 0,
          notes: `⚠️ LEGACY MAINTENANCE - EDITAR: Client name, email, phone. Replace permit. Upload site plan. Add optional docs.`,
          createdAt: new Date(data.visitDate),
          updatedAt: new Date(data.visitDate),
        });

        // PASO 3: Crear BudgetLineItem
        await BudgetLineItem.create({
          budgetId: budget.idBudget,
          description: 'Maintenance Service',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
          priceAtTimeOfBudget: 0,
          createdAt: new Date(data.visitDate),
          updatedAt: new Date(data.visitDate),
        });

        // PASO 4: Crear Work (relación con Permit a través de propertyAddress)
        const work = await Work.create({
          idWork: uuidv4(),
          propertyAddress: data.address, // ✅ Relación con Permit via propertyAddress
          staffId: defaultStaff.id,
          status: 'maintenance',
          startDate: new Date(data.visitDate),
          idBudget: budget.idBudget, // ✅ Relación con Budget
          notes: `Legacy maintenance work - Visit scheduled: ${data.visitDate}`,
          isLegacy: true,
          createdAt: new Date(data.visitDate),
          updatedAt: new Date(data.visitDate),
        });

        // PASO 5: Crear MaintenanceVisit
        await MaintenanceVisit.create({
          id: uuidv4(),
          workId: work.idWork,
          visitNumber: data.visitNumber,
          visitType: 'routine',
          scheduledDate: new Date(data.visitDate),
          status: 'scheduled',
          staffId: defaultStaff.id,
          notes: 'Primera visita de mantenimiento',
          createdAt: new Date(data.visitDate),
          updatedAt: new Date(data.visitDate)
        });

        console.log(`✅ ${data.address}`);
        created++;

      } catch (error) {
        console.error(`❌ ${data.address}: ${error.message}`);
        console.error(`   Detalle: ${error.stack?.split('\n')[0] || 'Sin stack trace'}`);
        errors++;
        // Continuar con el siguiente en lugar de abortar todo
        continue;
      }
    }

    console.log('\n');
    console.log('═'.repeat(70));
    console.log('\n📊 RESUMEN:\n');
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   ⏭️  Omitidos: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}\n`);

    if (created > 0) {
      console.log('🎯 COMPLETADO:');
      console.log('   ✅ Budgets, Permits, Works, Visits creados');
      console.log('   ⚠️  TODOS con datos PLACEHOLDER');
      console.log('   📝 Usa componente especial para editar cada uno\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

loadCompleteLegacyMaintenance();
