/**
 * Migración: Agregar campos de numeración de Invoice al modelo Budget
 * 
 * Nuevos campos:
 * - invoiceNumber: Número único de Invoice (solo para presupuestos definitivos)
 * - convertedToInvoiceAt: Fecha de conversión de Draft a Invoice
 * 
 * Ejecutar con: node migrations/add-invoice-number-to-budgets.js
 */

const { conn } = require('../src/data');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('🚀 Iniciando migración: Agregar campos de Invoice Number...');

    // Verificar si las columnas ya existen
    const columns = await conn.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Budgets' 
      AND column_name IN ('invoiceNumber', 'convertedToInvoiceAt')
    `, { type: QueryTypes.SELECT });

    console.log(`ℹ️  Columnas encontradas: ${columns.length}`);

    if (columns.length === 0) {
      // Agregar columna invoiceNumber
      await conn.query(`
        ALTER TABLE "Budgets" 
        ADD COLUMN "invoiceNumber" INTEGER UNIQUE
      `);
      console.log('✅ Columna invoiceNumber agregada');

      // Agregar columna convertedToInvoiceAt
      await conn.query(`
        ALTER TABLE "Budgets" 
        ADD COLUMN "convertedToInvoiceAt" TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ Columna convertedToInvoiceAt agregada');

      // Comentarios en las columnas
      await conn.query(`
        COMMENT ON COLUMN "Budgets"."invoiceNumber" IS 'Número de Invoice definitivo. NULL para borradores (drafts).'
      `);
      await conn.query(`
        COMMENT ON COLUMN "Budgets"."convertedToInvoiceAt" IS 'Fecha en que el borrador se convirtió en Invoice definitivo.'
      `);
      console.log('✅ Comentarios agregados');
    } else {
      console.log('✅ Las columnas ya existen en la base de datos (auto-sincronización de Sequelize)');
    }

    // 🆕 ASIGNAR invoiceNumbers a los presupuestos existentes que NO sean drafts
    const existingBudgets = await conn.query(`
      SELECT "idBudget", status 
      FROM "Budgets" 
      WHERE status NOT IN ('draft', 'pending_review')
      AND "invoiceNumber" IS NULL
      ORDER BY "idBudget" ASC
    `, { type: QueryTypes.SELECT });

    if (existingBudgets.length > 0) {
      console.log(`📋 Asignando invoice numbers a ${existingBudgets.length} presupuestos existentes...`);
      
      let currentInvoiceNumber = 1;
      for (const budget of existingBudgets) {
        await conn.query(`
          UPDATE "Budgets" 
          SET "invoiceNumber" = :invoiceNumber,
              "convertedToInvoiceAt" = "createdAt"
          WHERE "idBudget" = :idBudget
        `, {
          replacements: { 
            invoiceNumber: currentInvoiceNumber, 
            idBudget: budget.idBudget 
          }
        });
        console.log(`  ✅ Budget ${budget.idBudget} → Invoice #${currentInvoiceNumber}`);
        currentInvoiceNumber++;
      }
      
      console.log(`✅ ${existingBudgets.length} presupuestos actualizados con invoice numbers`);
    } else {
      console.log('ℹ️  No hay presupuestos existentes para actualizar');
    }

    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await conn.close();
  }
}

// Ejecutar migración
migrate()
  .then(() => {
    console.log('✅ Script de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script de migración falló:', error);
    process.exit(1);
  });
