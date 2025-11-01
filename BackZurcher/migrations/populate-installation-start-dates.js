/**
 * Script de migración de datos: Poblar installationStartDate para trabajos existentes
 * 
 * Este script asigna fechas de inicio de instalación a trabajos que ya están
 * en estados de inProgress o posteriores pero no tienen installationStartDate.
 * 
 * Estrategia:
 * 1. Si tiene Work.startDate → Usar esa fecha
 * 2. Si no, usar Work.createdAt como aproximación
 * 3. Si el trabajo está en maintenance, usar maintenanceStartDate
 */

const { conn } = require('../src/data');

async function populateInstallationDates() {
  console.log('📅 INICIANDO POBLACIÓN DE FECHAS DE INSTALACIÓN');
  console.log('=' .repeat(60));

  try {
    // 1️⃣ Obtener todos los trabajos sin installationStartDate
    console.log('\n1️⃣ Buscando trabajos sin installationStartDate...');
    
    const [works] = await conn.query(`
      SELECT 
        "idWork",
        "status",
        "startDate",
        "createdAt",
        "maintenanceStartDate",
        "propertyAddress"
      FROM "Works"
      WHERE "installationStartDate" IS NULL
      AND "status" IN (
        'inProgress',
        'installed',
        'firstInspectionPending',
        'approvedInspection',
        'rejectedInspection',
        'coverPending',
        'covered',
        'invoiceFinal',
        'paymentReceived',
        'finalInspectionPending',
        'finalApproved',
        'finalRejected',
        'maintenance'
      )
      ORDER BY "createdAt" ASC;
    `);

    if (works.length === 0) {
      console.log('✅ No hay trabajos que necesiten población de fechas');
      return;
    }

    console.log(`📊 Se encontraron ${works.length} trabajos que necesitan fecha de instalación`);

    // 2️⃣ Actualizar cada trabajo con la lógica apropiada
    let updatedCount = 0;
    let skippedCount = 0;

    for (const work of works) {
      let installationDate = null;
      let source = '';

      // Estrategia de selección de fecha
      if (work.startDate) {
        installationDate = work.startDate;
        source = 'startDate';
      } else if (work.status === 'maintenance' && work.maintenanceStartDate) {
        // Para mantenimiento, usar la fecha de mantenimiento menos un período estimado
        const maintenanceDate = new Date(work.maintenanceStartDate);
        maintenanceDate.setMonth(maintenanceDate.getMonth() - 1); // Estimar 1 mes antes
        installationDate = maintenanceDate.toISOString().split('T')[0];
        source = 'maintenanceStartDate - 1 month';
      } else if (work.createdAt) {
        // Usar createdAt como última opción
        const createdDate = new Date(work.createdAt);
        installationDate = createdDate.toISOString().split('T')[0];
        source = 'createdAt';
      }

      if (installationDate) {
        await conn.query(`
          UPDATE "Works"
          SET "installationStartDate" = $1
          WHERE "idWork" = $2;
        `, {
          bind: [installationDate, work.idWork],
          type: conn.QueryTypes.UPDATE
        });

        updatedCount++;
        console.log(`  ✅ ${work.idWork.substring(0, 8)}... | ${work.status.padEnd(25)} | ${installationDate} (${source})`);
      } else {
        skippedCount++;
        console.log(`  ⚠️  ${work.idWork.substring(0, 8)}... | No se pudo determinar fecha`);
      }
    }

    // 3️⃣ Mostrar resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE POBLACIÓN:');
    console.log(`  ✅ Trabajos actualizados: ${updatedCount}`);
    console.log(`  ⚠️  Trabajos omitidos: ${skippedCount}`);
    console.log(`  📝 Total procesados: ${works.length}`);

    // 4️⃣ Verificar resultados
    console.log('\n4️⃣ Verificando resultados...');
    const [verifyResults] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("installationStartDate") as with_date
      FROM "Works"
      WHERE "status" IN (
        'inProgress',
        'installed',
        'firstInspectionPending',
        'approvedInspection',
        'rejectedInspection',
        'coverPending',
        'covered',
        'invoiceFinal',
        'paymentReceived',
        'finalInspectionPending',
        'finalApproved',
        'finalRejected',
        'maintenance'
      );
    `);

    const stats = verifyResults[0];
    console.log('\n📊 Estado actual de trabajos activos:');
    console.log(`  Total de trabajos activos: ${stats.total}`);
    console.log(`  Con installationStartDate: ${stats.with_date}`);
    console.log(`  Sin installationStartDate: ${stats.total - stats.with_date}`);

    // 5️⃣ Mostrar algunos trabajos para verificar
    console.log('\n5️⃣ Muestra de trabajos actualizados:');
    const [sample] = await conn.query(`
      SELECT 
        "idWork",
        "status",
        "installationStartDate",
        "propertyAddress"
      FROM "Works"
      WHERE "installationStartDate" IS NOT NULL
      ORDER BY "installationStartDate" DESC
      LIMIT 5;
    `);

    console.table(sample.map(w => ({
      idWork: w.idWork.substring(0, 8) + '...',
      status: w.status,
      installationDate: w.installationStartDate,
      address: w.propertyAddress?.substring(0, 30) + '...'
    })));

    console.log('\n' + '='.repeat(60));
    console.log('✅ POBLACIÓN DE FECHAS COMPLETADA');
    console.log('💡 Ahora puedes ver el componente Notice to Owner en WorkDetail');
    console.log('📅 Los trabajos mostrarán el countdown desde su fecha de instalación');

  } catch (error) {
    console.error('\n❌ ERROR EN LA POBLACIÓN:', error.message);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  populateInstallationDates()
    .then(() => {
      console.log('\n🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { populateInstallationDates };
