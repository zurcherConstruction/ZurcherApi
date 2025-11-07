/**
 * SCRIPT DE MIGRACIÓN PARA PRODUCCIÓN
 * Ejecuta todas las migraciones necesarias en orden correcto
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// URL de Railway desde .env
const RAILWAY_URL = process.env.DB_DEPLOY;

if (!RAILWAY_URL) {
  console.error('❌ Error: DB_DEPLOY no está configurado en .env');
  process.exit(1);
}

console.log('🔗 Conectando a Railway (Producción)...\n');

const sequelize = new Sequelize(RAILWAY_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function runAllMigrations() {
  try {
    // Probar conexión
    await sequelize.authenticate();
    console.log('✅ Conectado a base de datos de producción\n');

    console.log('═'.repeat(80));
    console.log('🚀 INICIANDO MIGRACIONES EN PRODUCCIÓN');
    console.log('═'.repeat(80));
    console.log('');

    // ============================================================================
    // MIGRACIÓN 1: Crear tabla SupplierInvoiceExpenses
    // ============================================================================
    console.log('📦 [1/3] Creando tabla SupplierInvoiceExpenses...');
    
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'SupplierInvoiceExpenses'
      );
    `);

    if (tableExists[0].exists) {
      console.log('   ⏭️  Tabla ya existe - omitiendo\n');
    } else {
      await sequelize.query(`
        CREATE TABLE "SupplierInvoiceExpenses" (
          "idSupplierInvoiceExpense" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "supplierInvoiceId" UUID NOT NULL,
          "expenseId" UUID NOT NULL,
          "amountApplied" DECIMAL(10,2) NOT NULL,
          "notes" TEXT,
          "appliedDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          
          CONSTRAINT "fk_supplier_invoice"
            FOREIGN KEY ("supplierInvoiceId") 
            REFERENCES "SupplierInvoices"("idSupplierInvoice")
            ON DELETE CASCADE,
            
          CONSTRAINT "fk_expense"
            FOREIGN KEY ("expenseId")
            REFERENCES "Expenses"("idExpense")
            ON DELETE CASCADE,
            
          CONSTRAINT "unique_invoice_expense"
            UNIQUE ("supplierInvoiceId", "expenseId")
        );
      `);
      
      await sequelize.query(`
        CREATE INDEX "idx_supplier_invoice_expenses_invoice" 
        ON "SupplierInvoiceExpenses"("supplierInvoiceId");
      `);
      
      await sequelize.query(`
        CREATE INDEX "idx_supplier_invoice_expenses_expense" 
        ON "SupplierInvoiceExpenses"("expenseId");
      `);
      
      console.log('   ✅ Tabla creada exitosamente\n');
    }

    // ============================================================================
    // MIGRACIÓN 2: Agregar columnas a SupplierInvoices
    // ============================================================================
    console.log('📋 [2/3] Agregando columnas a SupplierInvoices...');
    
    const columnsToAdd = [
      { name: 'status', type: 'VARCHAR(50)', default: "'pending'" },
      { name: 'description', type: 'TEXT', default: null },
      { name: 'receiptUrl', type: 'VARCHAR(500)', default: null },
      { name: 'receiptPublicId', type: 'VARCHAR(255)', default: null }
    ];

    for (const col of columnsToAdd) {
      const [colExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'SupplierInvoices' AND column_name = '${col.name}'
        );
      `);

      if (!colExists[0].exists) {
        const defaultClause = col.default ? `DEFAULT ${col.default}` : '';
        await sequelize.query(`
          ALTER TABLE "SupplierInvoices" 
          ADD COLUMN "${col.name}" ${col.type} ${defaultClause};
        `);
        console.log(`   ✅ Columna ${col.name} agregada`);
      } else {
        console.log(`   ⏭️  Columna ${col.name} ya existe`);
      }
    }
    console.log('');

    // ============================================================================
    // MIGRACIÓN 3: Limpiar datos antiguos (items y works)
    // ============================================================================
    console.log('🧹 [3/3] Limpiando datos antiguos...');
    
    // Verificar si las tablas antiguas existen
    const [itemsTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'SupplierInvoiceItems'
      );
    `);

    const [worksTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'SupplierInvoiceWorks'
      );
    `);

    if (!itemsTableExists[0].exists && !worksTableExists[0].exists) {
      console.log('   ✅ No existen tablas antiguas - producción está limpia');
      console.log('');
    } else {
      let itemCount = { total: 0 };
      let workCount = { total: 0 };

      if (itemsTableExists[0].exists) {
        [itemCount] = await sequelize.query(`
          SELECT COUNT(*) as total FROM "SupplierInvoiceItems";
        `);
      }

      if (worksTableExists[0].exists) {
        [workCount] = await sequelize.query(`
          SELECT COUNT(*) as total FROM "SupplierInvoiceWorks";
        `);
      }

      console.log(`   Items a eliminar: ${itemCount[0]?.total || 0}`);
      console.log(`   Works a eliminar: ${workCount[0]?.total || 0}`);
      console.log('');

      if ((itemCount[0]?.total || 0) > 0 || (workCount[0]?.total || 0) > 0) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question('   ⚠️  ¿Deseas eliminar estos datos? (sí/no): ', resolve);
        });
        readline.close();

        if (answer.toLowerCase() === 'sí' || answer.toLowerCase() === 'si') {
          if (itemsTableExists[0].exists && (itemCount[0]?.total || 0) > 0) {
            await sequelize.query(`DELETE FROM "SupplierInvoiceItems";`);
            console.log(`   ✅ ${itemCount[0].total} items eliminados`);
          }

          if (worksTableExists[0].exists && (workCount[0]?.total || 0) > 0) {
            await sequelize.query(`DELETE FROM "SupplierInvoiceWorks";`);
            console.log(`   ✅ ${workCount[0].total} works eliminados`);
          }
        } else {
          console.log('   ⏭️  Limpieza omitida');
        }
      } else {
        console.log('   ✅ No hay datos antiguos para limpiar');
      }
      console.log('');
    }

    console.log(`   Items a eliminar: ${itemCount[0].total}`);
    console.log(`   Works a eliminar: ${workCount[0].total}`);
    console.log('');

    if (itemCount[0].total > 0 || workCount[0].total > 0) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('   ⚠️  ¿Deseas eliminar estos datos? (sí/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'sí' || answer.toLowerCase() === 'si') {
        if (itemCount[0].total > 0) {
          await sequelize.query(`DELETE FROM "SupplierInvoiceItems";`);
          console.log(`   ✅ ${itemCount[0].total} items eliminados`);
        }

        if (workCount[0].total > 0) {
          await sequelize.query(`DELETE FROM "SupplierInvoiceWorks";`);
          console.log(`   ✅ ${workCount[0].total} works eliminados`);
        }
      } else {
        console.log('   ⏭️  Limpieza omitida');
      }
    } else {
      console.log('   ✅ No hay datos antiguos para limpiar');
    }
    console.log('');

    // ============================================================================
    // RESUMEN FINAL
    // ============================================================================
    console.log('═'.repeat(80));
    console.log('✅ MIGRACIONES COMPLETADAS');
    console.log('═'.repeat(80));
    console.log('');

    const [invoiceCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoices";
    `);

    const [linkCount] = await sequelize.query(`
      SELECT COUNT(*) as total FROM "SupplierInvoiceExpenses";
    `);

    console.log('📊 Estado final:');
    console.log(`   Supplier Invoices: ${invoiceCount[0].total}`);
    console.log(`   Vínculos Invoice-Expense: ${linkCount[0].total}`);
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Deploy del código a Railway (git push)');
    console.log('   2. Verificar que el sistema funcione correctamente');
    console.log('   3. Probar las 3 opciones de pago');
    console.log('');

    await sequelize.close();
    console.log('🔌 Conexión cerrada');

  } catch (error) {
    console.error('❌ Error durante las migraciones:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar
runAllMigrations();
