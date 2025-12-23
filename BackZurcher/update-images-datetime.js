const { Image, sequelize } = require('./src/data');

/**
 * Script para actualizar imágenes existentes que no tienen dateTime
 * Les asigna su createdAt como dateTime
 */

async function updateImagesWithoutDateTime() {
  try {
    console.log('🔄 === ACTUALIZANDO IMÁGENES SIN DATETIME ===\n');
    
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Buscar imágenes que no tienen dateTime poblado
    console.log('🔍 Buscando imágenes sin dateTime...');
    const imagesWithoutDateTime = await Image.findAll({
      where: {
        dateTime: null
      },
      attributes: ['id', 'stage', 'dateTime', 'createdAt', 'idWork']
    });

    console.log(`📊 Imágenes encontradas sin dateTime: ${imagesWithoutDateTime.length}\n`);

    if (imagesWithoutDateTime.length === 0) {
      console.log('🎉 ¡Todas las imágenes ya tienen dateTime poblado!');
      return;
    }

    // Mostrar algunas de las imágenes que se van a actualizar
    console.log('📋 Ejemplos de imágenes que se actualizarán:');
    imagesWithoutDateTime.slice(0, 5).forEach((img, index) => {
      console.log(`   ${index + 1}. ID: ${img.id}`);
      console.log(`      Stage: ${img.stage}`);
      console.log(`      Work: ${img.idWork}`);
      console.log(`      CreatedAt: ${img.createdAt}`);
      console.log(`      DateTime actual: ${img.dateTime}`);
      console.log('');
    });

    // Actualizar todas las imágenes sin dateTime
    console.log('🔄 Actualizando imágenes...');
    const updateResult = await Image.update(
      {
        dateTime: sequelize.col('createdAt') // Asignar createdAt como dateTime
      },
      {
        where: {
          dateTime: null
        }
      }
    );

    console.log(`✅ Imágenes actualizadas: ${updateResult[0]} registros\n`);

    // Verificar la actualización
    console.log('🔍 Verificando actualización...');
    const remainingWithoutDateTime = await Image.count({
      where: {
        dateTime: null
      }
    });

    const totalWithDateTime = await Image.count({
      where: {
        dateTime: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });

    console.log(`📊 Imágenes sin dateTime restantes: ${remainingWithoutDateTime}`);
    console.log(`📊 Total imágenes con dateTime: ${totalWithDateTime}`);

    if (remainingWithoutDateTime === 0) {
      console.log('\n🎉 === ACTUALIZACIÓN COMPLETADA EXITOSAMENTE ===');
      console.log('✅ Todas las imágenes ahora tienen dateTime poblado');
      console.log('✅ Las fechas se mostrarán correctamente en WorkDetail');
      console.log('\n🔄 Refresca tu aplicación para ver los cambios');
    } else {
      console.log('\n⚠️  ADVERTENCIA: Aún hay imágenes sin dateTime');
      console.log('Esto podría indicar un problema en la actualización');
    }

  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    try {
      await sequelize.close();
      console.log('🔒 Conexión cerrada');
    } catch (error) {
      console.error('Error cerrando conexión:', error.message);
    }
  }
}

// Ejecutar la actualización
updateImagesWithoutDateTime();