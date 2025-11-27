/**
 * 🔧 Agregar columnas de Cloudinary al modelo Permit
 * 
 * Este script agrega las columnas para URLs de Cloudinary
 * sin eliminar las columnas BLOB existentes (necesarias para migración)
 */

require('dotenv').config();
const { sequelize } = require('./src/data');

const addCloudinaryColumns = async () => {
  console.log('🔧 Agregando columnas de Cloudinary a Permit...\n');

  try {
    const queryInterface = sequelize.getQueryInterface();

    // Verificar si las columnas ya existen
    const tableDescription = await queryInterface.describeTable('Permits');
    
    const columnsToAdd = [
      {
        name: 'permitPdfUrl',
        type: 'VARCHAR(255)',
        check: !tableDescription.permitPdfUrl
      },
      {
        name: 'permitPdfPublicId',
        type: 'VARCHAR(255)',
        check: !tableDescription.permitPdfPublicId
      },
      {
        name: 'optionalDocsUrl',
        type: 'VARCHAR(255)',
        check: !tableDescription.optionalDocsUrl
      },
      {
        name: 'optionalDocsPublicId',
        type: 'VARCHAR(255)',
        check: !tableDescription.optionalDocsPublicId
      }
    ];

    for (const column of columnsToAdd) {
      if (column.check) {
        console.log(`➕ Agregando columna: ${column.name}`);
        await queryInterface.addColumn('Permits', column.name, {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        });
        console.log(`✅ ${column.name} agregada`);
      } else {
        console.log(`⏭️  ${column.name} ya existe`);
      }
    }

    console.log('\n✅ Columnas de Cloudinary agregadas exitosamente');
    console.log('\n📋 SIGUIENTE PASO:');
    console.log('   Ejecutar: node migrate-permits-to-cloudinary.js');

  } catch (error) {
    console.error('❌ Error agregando columnas:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  addCloudinaryColumns()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { addCloudinaryColumns };
