/**
 * SCRIPT: Carga de Works Legacy de Mantenimiento - Febrero 2026
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
 * USO: 
 *   node load-new-maintenance-feb2026.js              # Ejecutar normalmente
 *   node load-new-maintenance-feb2026.js --dry-run    # Solo verificar, sin crear
 */

require('dotenv').config();
const { Work, MaintenanceVisit, Budget, Staff, Permit, BudgetLineItem } = require('./src/data');
const { v4: uuidv4 } = require('uuid');

// Modo dry-run (solo verificar)
const DRY_RUN = process.argv.includes('--dry-run');

// 📅 25 nuevos mantenimientos - Febrero 2026
const maintenanceData = [
  { address: '9029 Bamboo Cir La Belle, FL 33935', visitDate: '2026-05-07', visitNumber: 1 },
  { address: '5012 SE Tradewinds Cir La Belle, FL 33935', visitDate: '2026-05-21', visitNumber: 1 },
  { address: '5035 Spinnaker Rd La Belle, FL 33935', visitDate: '2026-07-17', visitNumber: 1 },
  { address: '6045 Kumquat Cir La Belle, FL 33935', visitDate: '2026-07-17', visitNumber: 1 },
  { address: '7039 Berwick Cir La Belle, FL 33935', visitDate: '2026-07-17', visitNumber: 1 },
  { address: '8003 Olive Cir La Belle, FL 33935', visitDate: '2026-07-17', visitNumber: 1 },
  { address: '9031 Bamboo Cir La Belle, FL 33935', visitDate: '2026-05-06', visitNumber: 1 },
  { address: '9033 Bamboo Cir La Belle, FL 33935', visitDate: '2025-12-11', visitNumber: 1 },
  { address: '5010 SE Tradewinds La Belle, FL 33935', visitDate: '2026-05-21', visitNumber: 1 },
  { address: '9027 Bamboo Cir La Belle, FL 33935', visitDate: '2026-05-07', visitNumber: 1 },
  { address: '9035 W Broad Cir La Belle, FL 33935', visitDate: '2026-05-21', visitNumber: 1 },
  { address: '1020 Carroll St E Lehigh Acres, FL 33974', visitDate: '2026-05-10', visitNumber: 1 },
  { address: '765 Chambers St E Lehigh', visitDate: '2026-07-07', visitNumber: 1 },
  { address: '331 Rawlings Ave Lehigh Acres, FL 33974', visitDate: '2026-04-30', visitNumber: 1 }, // Corregido: 2026-04-31 → 2026-04-30
  { address: '751 Milano Ave S Lehigh Acres, FL 33974', visitDate: '2026-02-22', visitNumber: 1 },
  { address: '7039 berwick cir la belle, FL 33935', visitDate: '2026-07-23', visitNumber: 1 },
  { address: '512 Caywood Ave S, Lehigh Acres  FL 33974', visitDate: '2026-05-11', visitNumber: 1 },
  { address: '127 Ocean Park Dr, Lehigh Acres, FL 33972', visitDate: '2026-06-15', visitNumber: 1 },
  { address: '830 dawhert ave s, Lehigh acres, FL 33974', visitDate: '2026-01-11', visitNumber: 1 },
  { address: '1217 Cloverlawn Ave Orlando, FL 32806', visitDate: '2025-11-28', visitNumber: 1 },
  { address: '1241 Denham St E, Lehigh Acres, FL 33974', visitDate: '2026-09-16', visitNumber: 1 },
  { address: '1043 Brenton Ave, Lehigh acres, FL 33974', visitDate: '2026-01-23', visitNumber: 1 },
  { address: '3510 21st St SW, Lehigh Acres, FL 33976', visitDate: '2026-03-17', visitNumber: 1 },
  { address: '729 Lamar St E, Lehigh Acres, FL 33974', visitDate: '2026-02-29', visitNumber: 1 },
  { address: '842 Sentinela Blvd, Lehigh Acres, FL 33974', visitDate: '2025-11-30', visitNumber: 1 },
];

// Función para normalizar direcciones (eliminar espacios extra, mayúsculas consistentes)
function normalizeAddress(address) {
  return address
    .trim()
    .replace(/\s+/g, ' ') // Eliminar espacios múltiples
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase()); // Capitalizar cada palabra
}

async function loadNewMaintenanceFeb2026() {
  try {
    console.log('\n🏗️  CARGA: Nuevos Legacy Maintenance Works - Febrero 2026\n');
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
        const normalizedAddress = normalizeAddress(data.address);
        
        // VERIFICACIÓN 1: Budget legacy existente (buscar por dirección normalizada o original)
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

loadNewMaintenanceFeb2026();
