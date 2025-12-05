/**
 * Script para agregar la columna final_system_image_url a MaintenanceVisits
 * Ejecutar: node add-final-system-image-column.js
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY,
  NODE_ENV
} = process.env;

// Usar DB_DEPLOY si existe (Railway/Producción), sino usar configuración local
const sequelize = DB_DEPLOY 
  ? new Sequelize(DB_DEPLOY, {
      logging: console.log,
      native: false,
      timezone: 'America/New_York',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
      }
    })
  : new Sequelize(
      `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      {
        logging: console.log,
        native: false,
        timezone: 'America/New_York'
      }
    );

async function addFinalSystemImageColumn() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // Verificar si la columna ya existe
    const tableDescription = await queryInterface.describeTable('MaintenanceVisits');
    
    if (tableDescription.final_system_image_url) {
      console.log('⚠️  La columna final_system_image_url ya existe');
      return;
    }

    console.log('🔄 Agregando columna final_system_image_url...');

    // Agregar la columna
    await queryInterface.addColumn('MaintenanceVisits', 'final_system_image_url', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de la imagen final del sistema completo (obligatoria al completar)'
    });

    console.log('✅ Columna final_system_image_url agregada exitosamente');

    // Verificar que se agregó correctamente
    const updatedDescription = await queryInterface.describeTable('MaintenanceVisits');
    console.log('📋 Columna final_system_image_url:', updatedDescription.final_system_image_url);

  } catch (error) {
    console.error('❌ Error al agregar la columna:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar
addFinalSystemImageColumn()
  .then(() => {
    console.log('✨ Migración completada');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error en la migración:', err);
    process.exit(1);
  });
