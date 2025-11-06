/**
 * Migración: Agregar columna 'discountReason' a la tabla FinalInvoices
 * 
 * Fecha: Noviembre 4, 2025
 * Propósito: Permitir almacenar la descripción o motivo del descuento aplicado
 * 
 * Ejecución:
 *   node migrations/add-discount-reason-to-final-invoice.js
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
    
    if (tableDescription.discountReason) {
      console.log('⚠️  La columna "discountReason" ya existe en la tabla FinalInvoices');
      console.log('   No se realizarán cambios');
      await sequelize.close();
      return;
    }

    console.log('🚀 Agregando columna "discountReason" a la tabla FinalInvoices...');

    // Agregar columna discountReason
    await queryInterface.addColumn('FinalInvoices', 'discountReason', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción o motivo del descuento aplicado'
    });

    console.log('✅ Columna "discountReason" agregada exitosamente');

    // Verificar registros existentes con descuento
    const [results] = await sequelize.query(
      'SELECT COUNT(*) as count FROM "FinalInvoices" WHERE discount > 0'
    );
    const countWithDiscount = parseInt(results[0].count);
    
    console.log(`📊 Total de registros en FinalInvoices: ${tableDescription.id ? 'verificando...' : 'N/A'}`);
    console.log(`📊 Registros con descuento > 0: ${countWithDiscount}`);
    
    if (countWithDiscount > 0) {
      console.log('ℹ️  Los registros con descuento existente tienen discountReason = NULL por defecto');
      console.log('   Se puede actualizar manualmente la razón del descuento desde la UI');
    }

    // Mostrar estructura actualizada
    console.log('\n📋 Estructura actualizada de FinalInvoices:');
    const updatedDescription = await queryInterface.describeTable('FinalInvoices');
    console.log('Columnas relacionadas con descuento:');
    console.log('  - discount:', updatedDescription.discount?.type);
    console.log('  - discountReason:', updatedDescription.discountReason?.type, '✨ NUEVA');
    
    console.log('\n💡 Uso:');
    console.log('   Al aplicar un descuento, se puede incluir una descripción del motivo');
    console.log('   Ejemplo: "Promoción especial cliente frecuente"');

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
