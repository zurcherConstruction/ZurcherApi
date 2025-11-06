/**
 * Script unificado: Ejecutar migraciones de descuento para Final Invoice
 * 
 * Fecha: Noviembre 4, 2025
 * Propósito: Ejecutar las 2 migraciones necesarias para la funcionalidad de descuento
 * 
 * Ejecución:
 *   node migrations/run-discount-migrations.js
 */

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Determinar la base de datos (producción o local)
const isProduction = process.env.DB_DEPLOY && process.env.DB_DEPLOY.trim() !== '';
const dbConfig = isProduction
  ? {
      connectionString: process.env.DB_DEPLOY,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    }
  : {
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
    };

const sequelize = isProduction
  ? new Sequelize(dbConfig.connectionString, {
      dialect: 'postgres',
      dialectOptions: dbConfig.dialectOptions,
      logging: false // Silenciar logs para output más limpio
    })
  : new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'postgres',
        logging: false
      }
    );

async function runAllMigrations() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    console.log(`📊 Base de datos: ${isProduction ? 'PRODUCCIÓN (Railway)' : 'LOCAL'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('FinalInvoices');
    
    let migrationsExecuted = 0;
    let migrationsSkipped = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // MIGRACIÓN 1: Agregar columna 'discount'
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📌 MIGRACIÓN 1: Agregar columna "discount"');
    console.log('─────────────────────────────────────────────────────────────────────');
    
    if (tableDescription.discount) {
      console.log('⚠️  La columna "discount" ya existe - OMITIDA');
      migrationsSkipped++;
    } else {
      console.log('🚀 Agregando columna "discount"...');
      await queryInterface.addColumn('FinalInvoices', 'discount', {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Descuento aplicado al total de la factura final'
      });
      console.log('✅ Columna "discount" agregada exitosamente');
      migrationsExecuted++;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MIGRACIÓN 2: Agregar columna 'discountReason'
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📌 MIGRACIÓN 2: Agregar columna "discountReason"');
    console.log('─────────────────────────────────────────────────────────────────────');
    
    // Refrescar descripción de la tabla
    const updatedTableDescription = await queryInterface.describeTable('FinalInvoices');
    
    if (updatedTableDescription.discountReason) {
      console.log('⚠️  La columna "discountReason" ya existe - OMITIDA');
      migrationsSkipped++;
    } else {
      console.log('🚀 Agregando columna "discountReason"...');
      await queryInterface.addColumn('FinalInvoices', 'discountReason', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción o motivo del descuento aplicado'
      });
      console.log('✅ Columna "discountReason" agregada exitosamente');
      migrationsExecuted++;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICACIÓN Y RESUMEN
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE MIGRACIONES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verificar estructura final
    const finalTableDescription = await queryInterface.describeTable('FinalInvoices');
    
    console.log('✅ Migraciones ejecutadas:', migrationsExecuted);
    console.log('⚠️  Migraciones omitidas:', migrationsSkipped);
    console.log('\n📋 Estructura actualizada de FinalInvoices:');
    console.log('   - discount:', finalTableDescription.discount ? '✅ Existe' : '❌ No existe');
    console.log('   - discountReason:', finalTableDescription.discountReason ? '✅ Existe' : '❌ No existe');
    
    // Verificar registros
    const [results] = await sequelize.query('SELECT COUNT(*) as total FROM "FinalInvoices"');
    const totalRecords = parseInt(results[0].total);
    
    const [discountResults] = await sequelize.query(
      'SELECT COUNT(*) as count FROM "FinalInvoices" WHERE discount > 0'
    );
    const recordsWithDiscount = parseInt(discountResults[0].count);
    
    console.log('\n📊 Datos en FinalInvoices:');
    console.log(`   Total de registros: ${totalRecords}`);
    console.log(`   Con descuento > 0: ${recordsWithDiscount}`);
    
    if (migrationsExecuted > 0) {
      console.log('\n💡 Fórmula de cálculo actualizada:');
      console.log('   finalAmountDue = originalBudgetTotal + subtotalExtras - discount - initialPaymentMade');
      console.log('\n💡 Uso:');
      console.log('   - Aplicar descuento desde la UI de Final Invoice');
      console.log('   - El descuento se mostrará en PDF y emails');
      console.log('   - Se puede incluir una razón/descripción del descuento');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR DURANTE LAS MIGRACIONES');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar todas las migraciones
runAllMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error.message);
    process.exit(1);
  });
