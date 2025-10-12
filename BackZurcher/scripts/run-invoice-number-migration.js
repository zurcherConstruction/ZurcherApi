/**
 * 🚀 SCRIPT DE EJECUCIÓN: Migración de Numeración Unificada
 * 
 * Este script ejecuta la migración que agrega invoiceNumber a FinalInvoices
 * y sincroniza la numeración con Budgets.
 * 
 * Uso:
 *   node scripts/run-invoice-number-migration.js
 */

require('dotenv').config();
const { conn } = require('../src/data');
const migration = require('../migrations/add-invoice-number-to-final-invoices');

async function runMigration() {
  try {
    console.log('🚀 === INICIANDO MIGRACIÓN DE NUMERACIÓN UNIFICADA ===\n');
    
    // Ejecutar migración UP
    await migration.up(conn.getQueryInterface(), conn.Sequelize);
    
    console.log('\n✅ === MIGRACIÓN COMPLETADA EXITOSAMENTE ===\n');
    
    // Verificar resultado
    console.log('📊 Verificando numeración...\n');
    
    const [results] = await conn.query(`
      SELECT 
        'Budget' as type, 
        b."invoiceNumber", 
        b."idBudget"::text as id,
        b."date"::text as date,
        b."applicantName" as name
      FROM "Budgets" b
      WHERE b."invoiceNumber" IS NOT NULL
      UNION ALL
      SELECT 
        'Final' as type, 
        fi."invoiceNumber", 
        fi.id::text as id,
        fi."invoiceDate"::text as date,
        b2."applicantName" as name
      FROM "FinalInvoices" fi
      LEFT JOIN "Budgets" b2 ON fi."budgetId" = b2."idBudget"
      WHERE fi."invoiceNumber" IS NOT NULL
      ORDER BY 2 ASC
      LIMIT 20
    `);
    
    console.log('📋 Primeros 20 invoices en orden:');
    console.table(results);
    
    // Estadísticas
    const [budgetStats] = await conn.query(`
      SELECT COUNT(*) as count, MIN("invoiceNumber") as min, MAX("invoiceNumber") as max
      FROM "Budgets"
      WHERE "invoiceNumber" IS NOT NULL
    `);
    
    const [finalInvoiceStats] = await conn.query(`
      SELECT COUNT(*) as count, MIN("invoiceNumber") as min, MAX("invoiceNumber") as max
      FROM "FinalInvoices"
      WHERE "invoiceNumber" IS NOT NULL
    `);
    
    console.log('\n📊 Estadísticas de Numeración:');
    console.log('Budget Invoices:', budgetStats[0]);
    console.log('Final Invoices:', finalInvoiceStats[0]);
    console.log(`\nTotal de Invoices: ${parseInt(budgetStats[0].count) + parseInt(finalInvoiceStats[0].count)}`);
    console.log(`Siguiente Invoice Number disponible: ${Math.max(budgetStats[0].max || 0, finalInvoiceStats[0].max || 0) + 1}`);
    
    console.log('\n✅ Migración verificada correctamente\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
runMigration();
