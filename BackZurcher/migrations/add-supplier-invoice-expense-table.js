/**
 * Migración: Crear tabla SupplierInvoiceExpenses
 * 
 * Propósito: Permitir vincular SupplierInvoices con Expenses existentes
 * Evita duplicación de gastos en el balance cuando se paga un invoice de proveedor
 * 
 * Tabla intermedia para relación muchos a muchos:
 * - Un SupplierInvoice puede pagar múltiples Expenses
 * - Un Expense puede ser pagado por múltiples SupplierInvoices (pago parcial)
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Determinar qué base de datos usar
const isDeploy = process.env.DB_DEPLOY;
const dbConfig = isDeploy ? {
  database: process.env.DB_NAME_DEPLOY,
  username: process.env.DB_USER_DEPLOY,
  password: process.env.DB_PASSWORD_DEPLOY,
  host: process.env.DB_HOST_DEPLOY,
  port: process.env.DB_PORT_DEPLOY,
  dialect: 'postgres',
  ssl: true
} : {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres'
};

console.log(`📊 Base de datos: ${isDeploy ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.ssl ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    logging: false
  }
);

async function migrate() {
  try {
    console.log('🔄 Iniciando migración: Crear tabla SupplierInvoiceExpenses...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida\n');

    // Verificar si la tabla ya existe
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'SupplierInvoiceExpenses'
    `);

    if (tables.length > 0) {
      console.log('⚠️  La tabla SupplierInvoiceExpenses ya existe. Saltando creación.');
      await sequelize.close();
      return;
    }

    // Crear tabla SupplierInvoiceExpenses
    console.log('📝 Creando tabla SupplierInvoiceExpenses...');
    await sequelize.query(`
      CREATE TABLE "SupplierInvoiceExpenses" (
        "idSupplierInvoiceExpense" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "supplierInvoiceId" UUID NOT NULL REFERENCES "SupplierInvoices"("idSupplierInvoice") ON DELETE CASCADE,
        "expenseId" UUID NOT NULL REFERENCES "Expenses"("idExpense") ON DELETE CASCADE,
        "amountApplied" DECIMAL(10,2) NOT NULL,
        "notes" TEXT,
        "linkedByStaffId" UUID REFERENCES "Staffs"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla SupplierInvoiceExpenses creada\n');

    // Crear índices para mejorar performance
    console.log('📝 Creando índices...');
    await sequelize.query(`
      CREATE INDEX "idx_supplier_invoice_expense_invoice" 
      ON "SupplierInvoiceExpenses"("supplierInvoiceId");
    `);
    await sequelize.query(`
      CREATE INDEX "idx_supplier_invoice_expense_expense" 
      ON "SupplierInvoiceExpenses"("expenseId");
    `);
    console.log('✅ Índices creados\n');

    console.log('✅ ¡Migración completada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log('   - Tabla SupplierInvoiceExpenses creada');
    console.log('   - Índices agregados para mejor performance');
    console.log('   - Sistema listo para vincular invoices con expenses existentes\n');
    console.log('🎉 Proceso completado');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('\nDetalles del error:');
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
