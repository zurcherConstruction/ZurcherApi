/**
 * Migración: Agregar columna 'discount' a la tabla FinalInvoices
 * 
 * Fecha: Noviembre 4, 2025
 * Propósito: Permitir aplicar descuentos a las facturas finales
 * 
 * Ejecución:
 *   node migrations/add-discount-to-final-invoice.js
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
      logging: console.log
    })
  : new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'postgres',
        logging: console.log
      }
    );

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    console.log(`📊 Base de datos: ${isProduction ? 'PRODUCCIÓN (Railway)' : 'LOCAL'}`);

    const queryInterface = sequelize.getQueryInterface();

    // Verificar si la columna ya existe
    const tableDescription = await queryInterface.describeTable('FinalInvoices');
    
    if (tableDescription.discount) {
      console.log('⚠️  La columna "discount" ya existe en la tabla FinalInvoices');
      console.log('   No se realizarán cambios');
      await sequelize.close();
      return;
    }

    console.log('🚀 Agregando columna "discount" a la tabla FinalInvoices...');

    // Agregar columna discount
    await queryInterface.addColumn('FinalInvoices', 'discount', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Descuento aplicado al total de la factura final'
    });

    console.log('✅ Columna "discount" agregada exitosamente');

    // Verificar registros existentes
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM "FinalInvoices"');
    const count = parseInt(results[0].count);
    
    console.log(`📊 Total de registros en FinalInvoices: ${count}`);
    
    if (count > 0) {
      console.log('ℹ️  Todos los registros existentes tendrán discount = 0.00 por defecto');
    }

    // Mostrar estructura actualizada
    console.log('\n📋 Estructura actualizada de FinalInvoices:');
    const updatedDescription = await queryInterface.describeTable('FinalInvoices');
    console.log('Columnas relacionadas con totales:');
    console.log('  - originalBudgetTotal:', updatedDescription.originalBudgetTotal?.type);
    console.log('  - subtotalExtras:', updatedDescription.subtotalExtras?.type);
    console.log('  - discount:', updatedDescription.discount?.type, '✨ NUEVA');
    console.log('  - initialPaymentMade:', updatedDescription.initialPaymentMade?.type);
    console.log('  - finalAmountDue:', updatedDescription.finalAmountDue?.type);
    
    console.log('\n💡 Fórmula de cálculo actualizada:');
    console.log('   finalAmountDue = originalBudgetTotal + subtotalExtras - discount - initialPaymentMade');

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar migración
runMigration()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
